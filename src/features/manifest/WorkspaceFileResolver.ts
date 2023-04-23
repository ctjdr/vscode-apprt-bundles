import { workspace, Uri } from "vscode";
import { promises as fs } from "fs";
import { FileResolver } from "api/bundles/FileResolver";

/**
 * A file resolver that accesses files of the current VS Code workspace.
 */
export class WorkspaceFileResolver implements FileResolver {

    async getAllUris(filesGlob: string): Promise<string[]> {
        return (await workspace.findFiles(filesGlob)).map(uri => uri.toString());
    }

    /**
     * 
     * @param uri URI of a file
     * @returns the content of the file as a string. If the file is opened in VS Code, you will get the actual content the file displays in the editor.
     * This may be different, from what is actually the state of the file on the disk, as you will get unsaved changes also.
     */
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
