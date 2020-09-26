import * as vscode from "vscode";
import ManifestDocument from "./ManifestDocument";


export default class ManifestIndex {



    private manifestDocIndex: Map<vscode.Uri, ManifestDocument> = new Map();

    constructor() {
        this.update();
    }

    static create(): ManifestIndex {
        return new ManifestIndex();
    }






    async update() {
        const fileUris = await vscode.workspace.findFiles("**/manifest.json", "**/target/**/manifest.json");

        fileUris.forEach(uri => {
            
        });




        let locations = fileUris.reduce(async (locations, uri) => {
            const manifestDoc = await vscode.workspace.openTextDocument(uri);
            const jsonDoc = manifestDoc.getText();
            const doc = ManifestDocument.fromString(jsonDoc);
            let references = doc.getAllProviding("");
            const accu = await locations;
            references.forEach(ref => {
                const providingElement = ref.getProviding();
                accu.push(new vscode.Location(uri, this.rangeOf(providingElement, manifestDoc)));
            });


            return accu;
        }, Promise.resolve(new Array<vscode.Location>()));

    }

}