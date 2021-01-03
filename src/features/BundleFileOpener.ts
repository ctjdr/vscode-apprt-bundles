import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class BundleFileOpener {

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand("apprtbundles.bundles.open.manifest",
                () => {
                    const bundleData = this.findCurrentBundleFolder();
                    if (bundleData) {
                        vscode.window.showTextDocument(vscode.Uri.parse(path.join(bundleData, "manifest.json")));
                    }
                }
                ),
            vscode.commands.registerCommand("apprtbundles.bundles.open.readme",
                () => {
                    const bundleData = this.findCurrentBundleFolder();
                    if (bundleData) {
                        vscode.window.showTextDocument(vscode.Uri.parse(path.join(bundleData, "README.md")));
                    }
                }
                )
            ];
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
            const testManifestPath =  path.join(testDir, "manifest.json");
            if (fs.existsSync(testManifestPath)) {
                return testDir;
            }
            
            // Move one folder up, until workspace or filesystem root path reached.
            testDir = path.resolve(testDir, "..");
        }

        return undefined;
    }
}
