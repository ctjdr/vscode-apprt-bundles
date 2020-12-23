import * as vscode from "vscode";
import * as path from "path";
import { BundleIndex } from "../bundles/BundleIndex";

export class BundleFileOpener {

    constructor(private bundleIndex: BundleIndex) {

    }

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand("apprtbundles.bundles.open.manifest",
                () => {
                    const bundleData = this.findCurrentBundle();
                    if (bundleData) {
                        vscode.window.showTextDocument(bundleData.manifestUri);
                    }
                }
                ),
            vscode.commands.registerCommand("apprtbundles.bundles.open.readme",
                () => {
                    const bundleData = this.findCurrentBundle();
                    if (bundleData) {
                        vscode.window.showTextDocument(vscode.Uri.parse(path.join(bundleData.path, "README.md")));
                    }
                }
                )
            ];
        }
        
    private findCurrentBundle() {
        if (!vscode.window.activeTextEditor) {
            return;
        }

        const currentFilePath = path.parse(vscode.window.activeTextEditor.document.fileName);
        let workdir = currentFilePath.dir;                    
        do {
            const manifestUri = vscode.Uri.parse(path.join(workdir, "manifest.json"));
            const bundle = this.bundleIndex.findBundleByUri(manifestUri.toString());
            if (bundle) {
                return { 
                        name: bundle.name,
                        path: workdir,
                        manifestUri
                    };
            }
            workdir = path.resolve(workdir, "..");
        } while (!workdir.endsWith("src/main/js") && workdir !== "/");

        return undefined;
    }
}
