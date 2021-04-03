import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";


/**
 * Registers commands to to instantly open one the following files of the current bundle.
 *    
 *   - ` manifest.json`
 *   - `README.md`
 * 
 * The _current bundle_ is determined by the file of the active editor.
 *  
 */
export class BundleFileOpener {

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand("apprtbundles.bundles.open.manifest", () => this.showBundleFile("manifest.json")),
            vscode.commands.registerCommand("apprtbundles.bundles.open.readme", () => this.showBundleFile("README.md"))
            ];
        }

    private showBundleFile(relativeFileName: string) {
        const bundleData = this.findCurrentBundleFolder();
        if (bundleData) {
            vscode.window.showTextDocument(vscode.Uri.file(path.join(bundleData, relativeFileName)));
        }
    }
        
    private findCurrentBundleFolder() {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        const activeDoc = vscode.window.activeTextEditor.document;
        const workspacePath = vscode.workspace.getWorkspaceFolder(activeDoc.uri)?.uri.fsPath;

        if (!workspacePath) {
            return;
        }

        let testDir = path.parse(activeDoc.fileName).dir;

        while (!testDir.endsWith(workspacePath) && testDir !== "/") {
            const testManifestPath = path.join(testDir, "manifest.json");
            if (fs.existsSync(testManifestPath)) {
                return testDir;
            }
            
            // Move one folder up, until workspace or filesystem root path reached.
            testDir = path.resolve(testDir, "..");
        }

        return undefined;
    }
}
