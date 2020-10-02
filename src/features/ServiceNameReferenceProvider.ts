import * as vscode from "vscode";
import ManifestDocument, { Section } from "../bundles/ManifestDocument";
import { ManifestIndex } from "../bundles/ManifestIndex";

export class ServiceNameReferenceProvider implements vscode.ReferenceProvider {

    changes = 0;

    private static nullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

    constructor(private manifestIndex: ManifestIndex) {
        vscode.workspace.onDidChangeTextDocument(this.updateIndexOnDocChange, this);
    }

    updateIndexOnDocChange(evt: vscode.TextDocumentChangeEvent): void {
        this.manifestIndex.markDirty(evt.document.uri.toString());
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
        return Promise.resolve(locations);
    }


    private async getLocations(document: vscode.TextDocument, position: vscode.Position) {

        await this.manifestIndex.updateDirty();

        const quotedLookupRef = document.getText(document.getWordRangeAtPosition(position));
        const lookupRef = quotedLookupRef.substring(1, quotedLookupRef.length - 1);

        const bundlesIds = this.manifestIndex.findBundleIdsByServiceName(lookupRef);

        const locations:vscode.Location[] = [];

        bundlesIds.forEach(id => {
            //Lookup manifest doc
            const bundleDoc = this.manifestIndex.findBundleById(id);
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


        // const fileUris = await vscode.workspace.findFiles("**/manifest.json", "**/target/**/manifest.json");

        // let locations = fileUris.reduce(async (locations, uri) => {
        //     const manifestDoc = await vscode.workspace.openTextDocument(uri);
        //     const jsonDoc = manifestDoc.getText();
        //     const doc = await ManifestDocument.fromString(jsonDoc);
        //     let references = doc.getAllProviding(lookupRef);
        //     const accu = await locations;
        //     references.forEach(ref => {
        //         const providingElement = ref.getProviding();
        //         accu.push(new vscode.Location(uri, this.rangeOfSection(providingElement?.section)));
        //     });


        //     return accu;
        // }, Promise.resolve(new Array<vscode.Location>()));

        return locations;

    }
}
