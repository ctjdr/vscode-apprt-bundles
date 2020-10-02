import * as vscode from "vscode";
import { promises as fs} from "fs";
import { ManifestResolver } from "./ManifestIndex";

export class WorkspaceManifestProvider implements ManifestResolver {


    async getAllIds(): Promise<string[]> {
        return (await vscode.workspace.findFiles("**/manifest.json", "**/target/**/manifest.json")).map(uri => uri.toString());

    }
    
    async resolve(id: string): Promise<string> {
        const openDocs = vscode.workspace.textDocuments;
        for (let doc of openDocs) {
            if (doc.isDirty && doc.uri.toString() === id) {
                return doc.getText();
            }
        }
        const uri = vscode.Uri.parse(id);
        return await fs.readFile(uri.fsPath, "utf-8");
    }
}