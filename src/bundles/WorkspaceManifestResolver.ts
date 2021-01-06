import { workspace, Uri } from "vscode";
import { promises as fs} from "fs";
import { ManifestResolver } from "./BundleIndex";

export class WorkspaceManifestProvider implements ManifestResolver {


    async getAllUris(): Promise<string[]> {
        return (await workspace.findFiles("**/manifest.json")).map(uri => uri.toString());

    }
    
    async resolve(uri: string): Promise<string> {
        const openDocs = workspace.textDocuments;
        for (let doc of openDocs) {
            if (doc.isDirty && doc.uri.toString() === uri) {
                return doc.getText();
            }
        }
        const vscodeUri = Uri.parse(uri);
        return await fs.readFile(vscodeUri.fsPath, "utf-8");
    }
}