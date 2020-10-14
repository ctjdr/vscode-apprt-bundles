import * as vscode from "vscode";
import { BundleIndex } from "../bundles/BundleIndex";

export class ServiceNameCompletionProvider implements vscode.CompletionItemProvider {

    constructor(private bundleIndex: BundleIndex) {
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        
        return (async () => {
            await this.bundleIndex.updateDirty();
            const manifestDoc = this.bundleIndex.findBundleById(document.uri.toString());
            const fragments = manifestDoc?.getStringFragmentsOnLine(position.line);
            if (!fragments || fragments?.size === 0) {
                return Promise.resolve([]);
            }
            
            const cursorCol = position.character;
            
            const cursorOverFragment = [...fragments].some( fragment => fragment.section.contains(position.line, position.character));
            
            if (!cursorOverFragment) {
                return Promise.resolve([]);
            }

            const serviceNames = this.bundleIndex.getServiceNames();
            const items: vscode.CompletionItem[] = [];
            for (const serviceName of serviceNames) {
                const item = new vscode.CompletionItem(`"${serviceName}"`, vscode.CompletionItemKind.Interface);
                items.push(item);
            }
            return Promise.resolve(new vscode.CompletionList(items, false));
        })();
    }

}
