import * as vscode from "vscode";
import * as fs from "fs/promises";
import ManifestDocument from "./ManifestDocument";


export default class ManifestIndex {

    private uriIndex: Map<vscode.Uri, ManifestDocument> = new Map();
    private serviceNameIndex: Map<string, Set<vscode.Uri>> = new Map();

    constructor() {
        this.update();
    }

    static create(): ManifestIndex {
        return new ManifestIndex();
    }

    async update() {

        const fileUris = await vscode.workspace.findFiles("**/manifest.json", "**/target/**/manifest.json");

        fileUris.forEach(async uri => {
            const manifestContent = await fs.readFile(uri.fsPath, "utf-8");
            const manifestDoc = await ManifestDocument.fromString(manifestContent);
            this.indexManifestDoc(uri, manifestDoc);
        });
    }

    private indexManifestDoc(uri: vscode.Uri, doc: ManifestDocument):void {
        this.indexUri(uri, doc);
        this.indexServiceNames(uri, doc);
    }
    
    private indexUri(uri: vscode.Uri, doc: ManifestDocument) {
        this.uriIndex.set(uri, doc);
    }

    private indexServiceNames(uri: vscode.Uri, doc: ManifestDocument) {
        doc.getAllServiceNames().forEach(serviceName => {
            let indexedUris = this.serviceNameIndex.get(serviceName);
            if (indexedUris === undefined) {
                indexedUris = new Set();
            }
            indexedUris.add(uri);
            this.serviceNameIndex.set(serviceName, indexedUris);
        });
    }
}