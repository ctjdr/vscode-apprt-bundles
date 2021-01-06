import { workspace, Uri } from "vscode";
import { promises as fs} from "fs";
import { ManifestResolver } from "./BundleIndex";

export class WorkspaceManifestProvider implements ManifestResolver {


    async getAllUris(): Promise<string[]> {
        // return (await workspace.findFiles("**/manifest.json", "**/target/**")).map(uri => uri.toString()).filter((uri) => uri.indexOf("node_modules") === -1);
        // return (await workspace.findFiles("**/manifest.json", "{**/target/**,**/node_modules/**}")).map(uri => uri.toString());
        return (await workspace.findFiles("**/manifest.json", "**/target/**")).map(uri => uri.toString());

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