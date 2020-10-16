import * as vscode from "vscode";
import { ValueType } from "../bundles/ManifestDocument";
import { BundleIndex } from "../bundles/BundleIndex";
import { rangeOfSection } from "./Range";


export class ServiceNameCodeLenseProvider implements vscode.CodeLensProvider {

    constructor(private context: vscode.ExtensionContext, private bundleIndex: BundleIndex) {
        context.subscriptions.push(
            vscode.commands.registerCommand("moveCursorAndExecuteFind", moveCursorAndExecuteFind));

    }

    onDidChangeCodeLenses?: vscode.Event<void> | undefined;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        return (async () => {

            const lenses: vscode.CodeLens[] = [];

            await this.bundleIndex.updateDirty();
            const manifestDoc = this.bundleIndex.findBundleById(document.uri.toString());
            if (!manifestDoc) {
                return Promise.resolve([]);
            }
            const linesWithFragments = manifestDoc.getStringFragmentLines();

            linesWithFragments.forEach((line) => {
                manifestDoc.getStringFragmentsOnLine(line)?.forEach((fragment) => {
                    const section = fragment.section;
                    const fragmentType = fragment.type;
                    const mode = fragmentType === ValueType.provides ? "providing" : "provides";
                    const title = fragmentType === ValueType.referenceProviding ? 
                        `Find provides (${this.bundleIndex.findProvidesFor(fragment.value).size})` : `Find providing (${this.bundleIndex.findProvidingFor(fragment.value).size})`;
                    const lense = new vscode.CodeLens(rangeOfSection(section), {
                        command: "moveCursorAndExecuteFind",
                        title,
                        arguments: [document, new vscode.Position(section.start.line, section.start.col), this.context, mode]
                    });
                    lenses.push(lense);
                });
            });
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


