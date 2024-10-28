import * as vscode from "vscode";
import { rangeOfSection } from "../Range";
import ServiceNameIndex from "api/bundles/ServiceIndex";
import { BundleService } from "api/bundles/BundleService";
import { URI } from "vscode-uri";

export class ServiceNameReferenceProvider implements vscode.ReferenceProvider {

    constructor(private bundleService: BundleService, private serviceNameIndex: ServiceNameIndex, private context: vscode.ExtensionContext) {
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

        // await this.bundleIndex.updateDirty();

        const quotedLookupRef = document.getText(document.getWordRangeAtPosition(position, /[a-zA-Z0-9._\-\"\']+/));
        const lookupRef = quotedLookupRef.substring(1, quotedLookupRef.length - 1);

        // const serviceIndex = this.bundleIndex.getServiceNameIndex();
        const serviceIndex = this.serviceNameIndex;
        const bundlesIds = serviceIndex.findBundleIdsByServiceName(lookupRef);

        const locations:vscode.Location[] = [];
        const mode = this.context.workspaceState.get("findReference", { mode: "all" }).mode;

        bundlesIds.forEach(id => {
            //Lookup manifest doc
            const manifestDoc = this.bundleService.getManifest(URI.parse(id));
            if (!manifestDoc) {
                return;
            }
            const allProvides = manifestDoc.getComponentsFor(lookupRef);
            const allProviding = manifestDoc.getReferencesFor(lookupRef);

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
