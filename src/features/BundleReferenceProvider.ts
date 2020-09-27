import * as vscode from "vscode";
import ManifestDocument, { StringFragment } from "../bundles/ManifestDocument";

export class BundleReferenceProvider implements vscode.ReferenceProvider {

    private static nullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

    rangeOf(element: StringFragment | null, doc: vscode.TextDocument) {
        if (element === null) {
            return BundleReferenceProvider.nullRange;
        }
        const start = doc.positionAt(element.section.offset);
        const end = doc.positionAt(element.section.offset + (element.section.length || 0));
        return new vscode.Range(start, end);
    }

    public provideReferences(
        document: vscode.TextDocument, position: vscode.Position,
        options: { includeDeclaration: boolean; }, token: vscode.CancellationToken): Thenable<vscode.Location[]> {

        //TODO: Handle "includeDeclaration" flag

        const locations = this.getLocations(document, position);

        return Promise.resolve(locations);
    }


    private async getLocations(document: vscode.TextDocument, position: vscode.Position) {
        const quotedLookupRef = document.getText(document.getWordRangeAtPosition(position));
        const lookupRef = quotedLookupRef.substring(1, quotedLookupRef.length - 1);

        const fileUris = await vscode.workspace.findFiles("**/manifest.json", "**/target/**/manifest.json");

        let locations = fileUris.reduce(async (locations, uri) => {
            const manifestDoc = await vscode.workspace.openTextDocument(uri);
            const jsonDoc = manifestDoc.getText();
            const doc = await ManifestDocument.fromString(jsonDoc);
            let references = doc.getAllProviding(lookupRef);
            const accu = await locations;
            references.forEach(ref => {
                const providingElement = ref.getProviding();
                accu.push(new vscode.Location(uri, this.rangeOf(providingElement, manifestDoc)));
            });


            return accu;
        }, Promise.resolve(new Array<vscode.Location>()));

        return locations;

    }
}
