import { workspace, Uri } from "vscode";
import { promises as fs } from "fs";
import { FileResolver } from "api/bundles/BundleIndex";

export class WorkspaceFileResolver implements FileResolver {


    async getAllUris(filesGlob: string): Promise<string[]> {
        return (await workspace.findFiles(filesGlob)).map(uri => uri.toString());

    }

    async resolve(uri: string): Promise<string> {
        const openDocs = workspace.textDocuments;
        for (let doc of openDocs) {
            if (doc.isDirty && doc.uri.toString() === uri) {
                return doc.getText();
            }
        }
        const vscodeUri = Uri.parse(uri);

        //TODO, Remove await, or what?!?
        return await fs.readFile(vscodeUri.fsPath, "utf-8");
    }
}