import { workspace, Uri, TextDocument } from "vscode";
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
            if (doc.uri.toString() === uri) {
                    console.debug("WorkspaceFileResolver: Reading from workspace: " + uri);
                    return doc.getText();
                // if (doc.isDirty) {
                //     console.debug("Resolver: Reading from WORKSPACE: " + uri);
                //     return doc.getText();
                // } else {
                //     console.debug("Resolver: Not reading from WORKSPACE, file not dirty: " + uri);
                //     break;
                // }
            }
        }
        const vscodeUri = Uri.parse(uri);
        
        console.debug("WorkspaceFileResolver - Reading from file: " + uri);
        return fs.readFile(vscodeUri.fsPath, "utf-8");
    }
}
