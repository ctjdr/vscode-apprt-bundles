import * as vscode from "vscode";
import { BundleIndex } from "api/bundles/BundleIndex";

export class ServiceNameCompletionProvider implements vscode.CompletionItemProvider {

    constructor(private bundleIndex: BundleIndex) {
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        
        return (async () => {
            const manifestDoc = this.bundleIndex.findBundleByUri(document.uri.toString());
            const fragments = manifestDoc?.getStringFragmentsOnLine(position.line);
            if (!fragments || fragments?.size === 0) {
                return Promise.resolve([]);
            }
            
            const cursorCol = position.character;
            
            const fragmentUnderCursor = [...fragments].find( fragment => fragment.section.contains(position.line, position.character));
            
            if (!fragmentUnderCursor) {
                return Promise.resolve([]);
            }

            const serviceIndex = this.bundleIndex.getServiceNameIndex();
            const serviceNames = serviceIndex.getServiceNames();
            // const serviceNames = this.bundleIndex.getServiceNames();
            const items: vscode.CompletionItem[] = [];
            const fragmentLine = fragmentUnderCursor.section.start.line;
            //Narrow range to exclude double quotes of JSON property.
            const fragmentRange = new vscode.Range(fragmentLine, fragmentUnderCursor.section.start.col + 1, fragmentLine, fragmentUnderCursor.section.end.col - 1);
            for (const serviceName of serviceNames) {
                const item = new vscode.CompletionItem(`${serviceName}`, vscode.CompletionItemKind.Interface);
                item.range = fragmentRange;
                items.push(item);
            }
            return Promise.resolve(new vscode.CompletionList(items, false));
        })();
    }

}
