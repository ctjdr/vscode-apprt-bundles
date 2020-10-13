import * as vscode from "vscode";
import { Section } from "../bundles/ManifestDocument";
import { BundleIndex } from "../bundles/BundleIndex";

export class ServiceNameReferenceProvider implements vscode.ReferenceProvider {

    private static nullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

    constructor(private bundleIndex: BundleIndex) {
    }

    rangeOfSection(section: Section | undefined): vscode.Range {
        if (!section) {
            return ServiceNameReferenceProvider.nullRange;
        }
        return new vscode.Range(
            new vscode.Position(section.start.line, section.start.col),
            new vscode.Position(section.end.line, section.end.col)
        );
    }

    public provideReferences(
        document: vscode.TextDocument, position: vscode.Position,
        options: { includeDeclaration: boolean; }, token: vscode.CancellationToken): Thenable<vscode.Location[]> {

            //TODO: Handle "includeDeclaration" flag

        const locations = this.getLocations(document, position);
        return Promise.resolve(locations).catch(e => {
            console.error();
            return [];
        });
    }


    private async getLocations(document: vscode.TextDocument, position: vscode.Position) {

        await this.bundleIndex.updateDirty();

        const quotedLookupRef = document.getText(document.getWordRangeAtPosition(position));
        const lookupRef = quotedLookupRef.substring(1, quotedLookupRef.length - 1);

        const bundlesIds = this.bundleIndex.findBundleIdsByServiceName(lookupRef);

        const locations:vscode.Location[] = [];

        bundlesIds.forEach(id => {
            //Lookup manifest doc
            const bundleDoc = this.bundleIndex.findBundleById(id);
            if (!bundleDoc) {
                return;
            }
            const allProvides = bundleDoc.getAllProvides(lookupRef);
            const allProviding = bundleDoc.getAllProviding(lookupRef);

            const uri = vscode.Uri.parse(id);

            allProvides.forEach(component => {
                locations.push(new vscode.Location(uri, this.rangeOfSection(component.provides(lookupRef)?.section)));
            });
            allProviding.forEach(reference => {
                locations.push(new vscode.Location(uri, this.rangeOfSection(reference.getProviding()?.section)));
            });

        });

        return locations;

    }
}
