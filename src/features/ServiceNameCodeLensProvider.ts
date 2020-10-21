import * as vscode from "vscode";
import { ValueType } from "../bundles/ManifestDocument";
import { BundleIndex } from "../bundles/BundleIndex";
import { rangeOfSection } from "./Range";


export class ServiceNameCodeLensProvider implements vscode.CodeLensProvider {

    private changeEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.changeEmitter.event;

    private codeLensToggleState = false;

    constructor(private context: vscode.ExtensionContext, private bundleIndex: BundleIndex) {
        context.subscriptions.push(

            vscode.commands.registerCommand("moveCursorAndExecuteFind", moveCursorAndExecuteFind),

            vscode.workspace.onDidChangeConfiguration( configEvt => {
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
        console.debug(`Setting toggle state to ${this.codeLensToggleState}`);
    }
        
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {


        if (!this.codeLensToggleState) {
            return Promise.resolve([]);
        }
        return (async () => {

            const lenses: vscode.CodeLens[] = [];

            await this.bundleIndex.updateDirty();
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
                    const title = fragmentType === ValueType.referenceProviding ? 
                        `Peek providers (${this.bundleIndex.findProvidesFor(fragment.value).length})` : `Peek consumers (${this.bundleIndex.findProvidingFor(fragment.value).length})`;
                    const lens = new vscode.CodeLens(rangeOfSection(section), {
                        command: "moveCursorAndExecuteFind",
                        title,
                        arguments: [document, new vscode.Position(section.start.line, section.start.col), this.context, mode]
                    });
                    lenses.push(lens);
                });
            });
            const t1 = new Date().getTime();
            console.debug(`CodeLens generation took ${t1 - t0} ms`);
            return lenses;
        })();

    }

}
async function moveCursorAndExecuteFind(doc: vscode.TextDocument, pos: vscode.Position, context: vscode.ExtensionContext, mode: "provides" | "provding") {
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


