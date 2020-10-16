import * as vscode from "vscode";
import { BundleIndex } from "../bundles/BundleIndex";
import { rangeOfSection } from "./Range";

export class ServiceNameReferenceProvider implements vscode.ReferenceProvider {

    constructor(private bundleIndex: BundleIndex, private context: vscode.ExtensionContext) {
    }

    public provideReferences(
        document: vscode.TextDocument, position: vscode.Position,
        options: { includeDeclaration: boolean; }, token: vscode.CancellationToken): Thenable<vscode.Location[]> {

            //TODO: Handle "includeDeclaration" flag

        const locations = this.getLocations(document, position);
        return Promise.resolve(locations).catch(e => {
            console.error(e);
            return [];
        });
    }


    private async getLocations(document: vscode.TextDocument, position: vscode.Position) {

        await this.bundleIndex.updateDirty();

        const quotedLookupRef = document.getText(document.getWordRangeAtPosition(position));
        const lookupRef = quotedLookupRef.substring(1, quotedLookupRef.length - 1);

        const bundlesIds = this.bundleIndex.findBundleIdsByServiceName(lookupRef);

        const locations:vscode.Location[] = [];
        const mode = this.context.workspaceState.get("findReference", { mode: "all" }).mode;

        bundlesIds.forEach(id => {
            //Lookup manifest doc
            const bundleDoc = this.bundleIndex.findBundleById(id);
            if (!bundleDoc) {
                return;
            }
            const allProvides = bundleDoc.getComponentsFor(lookupRef);
            const allProviding = bundleDoc.getReferencesFor(lookupRef);

            const uri = vscode.Uri.parse(id);


            if (mode === "all" || mode === "provides") {
                allProvides.forEach(component => {
                    const providesElem = component.provides(lookupRef);
                    if (!providesElem) {
                        return;
                    }
                    locations.push(new vscode.Location(uri, rangeOfSection(providesElem.section)));
                });
            }

            if (mode === "all" || mode === "providing") {
                
                allProviding.forEach(reference => {
                    const providingElem = reference.getProviding();
                    if (!providingElem) {
                        return;
                    }
                    locations.push(new vscode.Location(uri, rangeOfSection(providingElem.section)));
                });
            }

        });
        this.context.workspaceState.update("findReference", { mode: "all" });
        return locations;

    }
}
