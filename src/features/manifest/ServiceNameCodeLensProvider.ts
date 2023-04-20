import * as vscode from "vscode";
import { BundleIndex } from "api/bundles/BundleIndex";
import { ValueType } from "api/bundles/ManifestDocument";
import { rangeOfSection } from "../Range";


export class ServiceNameCodeLensProvider implements vscode.CodeLensProvider {

    private changeEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.changeEmitter.event;

    private codeLensToggleState = false;

    constructor(private context: vscode.ExtensionContext, private bundleIndex: BundleIndex) {

        // Reacting to index changes allows to trigger code lens generation for documents not being edited at the moment,
        // but still open in an editor (eg. in a side-by-side view).
        // Problem is that activating this would cause code lenses to be requested twice for the document being edited:
        // 1. VS Code detects the editor change and requests lenses
        // 2. BundleIndex detect the change and signals an index update
        // Need to find a solution for that...

        // bundleIndex.onIndexUpdated(() => {
        //     this.changeEmitter.fire();
        //     // this.cachedClean = false;
        // });

        context.subscriptions.push(

            vscode.commands.registerCommand("moveCursorAndExecuteFind", moveCursorAndExecuteFind),

            vscode.workspace.onDidChangeConfiguration(configEvt => {
                if (configEvt.affectsConfiguration("apprtbundles.manifest.serviceNameCodeLens.enabled")) {
                    this.changeEmitter.fire();
                    this.updateConfig();
                }
            }),
            vscode.commands.registerCommand("apprtbundles.manifest.toggleServiceNameCodeLens", () => {
                this.codeLensToggleState = !this.codeLensToggleState;
                this.changeEmitter.fire();
            })
        );

        this.updateConfig();
    }

    private updateConfig() {
        const codelensConfig = vscode.workspace.getConfiguration("apprtbundles.manifest.serviceNameCodeLens");
        this.codeLensToggleState = codelensConfig.get<boolean>("enabled") ?? false;
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {

        if (!this.codeLensToggleState) {
            return Promise.resolve([]);
        }

        //return lenses only, if document is asserted to be up to date after no more than 2 secs
        return this.bundleIndex.assertClean(document.uri, 2000).then(
            () => {
                return this.calcLenses(document);
            }
        );
    }

    private async calcLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const lenses: vscode.CodeLens[] = [];

        const manifestDoc = this.bundleIndex.findBundleByUri(document.uri.toString());
        if (!manifestDoc) {
            return Promise.resolve([]);
        }
        const linesWithFragments = manifestDoc.getStringFragmentLines();
        const t0 = new Date().getTime();
        linesWithFragments.forEach((line) => {
            manifestDoc.getStringFragmentsOnLine(line)?.forEach((fragment) => {
                const section = fragment.section;
                const fragmentType = fragment.type;
                const mode = fragmentType === ValueType.provides ? "providing" : "provides";
                const title = this.lensMessage(fragmentType, fragment.value);
                const lens = new vscode.CodeLens(rangeOfSection(section), {
                    command: "moveCursorAndExecuteFind",
                    title,
                    arguments: [document, new vscode.Position(section.start.line, section.start.col + 1), this.context, mode]
                });
                lenses.push(lens);
            });
        });
        const t1 = new Date().getTime();
        console.debug(`CodeLens generation took ${t1 - t0} ms`);
        return lenses;
    }
    private lensMessage(type: ValueType, value: string) {
        const serviceIndex = this.bundleIndex.getServiceNameIndex();
        if (value.trim().length > 0) {
            return type === ValueType.referenceProviding ?
                // `Peek providers (${this.bundleIndex.findProvidesFor(value).length})` : `Peek consumers (${this.bundleIndex.findProvidingFor(value).length})`;
                `Peek providers (${serviceIndex.findProvidesFor(value).length})` : `Peek consumers (${serviceIndex.findProvidingFor(value).length})`;
        } else {
            return type === ValueType.referenceProviding ?
                "Peek providers (0)" : "Peek consumers (0)";

        }
    }
}


async function moveCursorAndExecuteFind(doc: vscode.TextDocument, pos: vscode.Position, context: vscode.ExtensionContext, mode: "provides" | "providing") {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    const preSelection = activeEditor.selection;
    activeEditor.selection = new vscode.Selection(pos, pos);
    context.workspaceState.update("findReference", { mode });
    await vscode.commands.executeCommand("editor.action.referenceSearch.trigger");
    // await vscode.commands.executeCommand("references-view.findReferences");
    activeEditor.selection = preSelection;
}


