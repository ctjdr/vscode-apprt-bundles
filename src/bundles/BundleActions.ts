import * as vscode from "vscode";

export {
    BundleActionHandler
};

type RevealGoalType = "folder" | "manifest";


class BundleActionHandler {

    private static manifestFileNameLength = "/manifest.json".length;


    private revealGoalType: RevealGoalType = "manifest";
    private revealGoalExpandFolder = true;

    private revealEventEmitter = new vscode.EventEmitter<string>();
    readonly onRevealBundle = this.revealEventEmitter.event;

    constructor() {
        this.updateFromConfig();
    }

    register(): vscode.Disposable[] {
        return [
            vscode.workspace.onDidChangeConfiguration( configEvt => {
                if (configEvt.affectsConfiguration("apprtbundles.bundles.reveal.goal")) {
                    this.updateFromConfig();
                }
            })
        ];
    }

    private updateFromConfig() {
        const goalConfig = vscode.workspace.getConfiguration("apprtbundles.bundles.reveal.goal");
        this.revealGoalType = goalConfig.get<string>("type") as RevealGoalType || "manifest";
        this.revealGoalExpandFolder = goalConfig.has("expandFolder") ? goalConfig.get<boolean>("expandFolder")! : true;
    }


    async revealBundle(bundleUri: string) {

        const manifestPath = vscode.Uri.parse(bundleUri).path;
        let pickUri = vscode.Uri.parse(manifestPath);

        this.revealEventEmitter.fire(bundleUri);

        if (this.revealGoalType === "folder") {
            pickUri = vscode.Uri.parse(manifestPath.substring(0, manifestPath.length - BundleActionHandler.manifestFileNameLength));
        }


        if (this.revealGoalType === "folder" && this.revealGoalExpandFolder) {
            //Expand folder as a side effect by 1st revealing the manifest.json file 
            await vscode.commands.executeCommand("revealInExplorer", vscode.Uri.joinPath(pickUri, "manifest.json"));
        }
        await vscode.commands.executeCommand("revealInExplorer", pickUri);

    }
    
    
    async openBundleFile(bundleRelativePath: string) {
    }

}
