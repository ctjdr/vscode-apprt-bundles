import * as vscode from "vscode";
import { Bundle } from "../bundles/BundleModel";
import { BundleService } from "../bundles/BundleService";
import { MostRecentHotlist } from "../bundles/Hotlist";

interface BundleQickPickItem extends vscode.QuickPickItem {
    label: string ;
    description: string;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;
    bundleUri: vscode.Uri;
}


type RevealGoalType = "folder" | "manifest";

export default class BundleQuickPicker {

    private revealGoalType: RevealGoalType = "folder";
    private revealGoalExpandFolder = true;
    private hotlist = new MostRecentHotlist<string>(5);


    constructor(private bundleService: BundleService) {
        this.updateFromConfig();
    }

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand("apprtbundles.bundles.reveal", async () => {
            const selectedBundle = await vscode.window.showQuickPick(
                this.getItems()
            );
            if (selectedBundle) {
                await this.openBundle(selectedBundle.bundleUri);
            }
        }),
        vscode.workspace.onDidChangeConfiguration( configEvt => {
            if (configEvt.affectsConfiguration("apprtbundles.bundles.reveal.goal")) {
                this.updateFromConfig();
            }
        }),

    ];
    }
    private static  manifestFileNameLength = "/manifest.json".length;


    private updateFromConfig() {
        const goalConfig = vscode.workspace.getConfiguration("apprtbundles.bundles.reveal.goal");
        this.revealGoalType = goalConfig.get<string>("type") as RevealGoalType || "folder";
        this.revealGoalExpandFolder = goalConfig.has("expandFolder") ? goalConfig.get<boolean>("expandFolder")! : true;
    }

    private async openBundle(selectedBundleUri: string) {

        this.hotlist.promote(selectedBundleUri);

        const manifestPath = vscode.Uri.parse(selectedBundleUri).path;
        let pickUri = vscode.Uri.parse(manifestPath);
        if (this.revealGoalType === "folder") {
            pickUri = vscode.Uri.parse(manifestPath.substring(0, manifestPath.length - BundleQuickPicker.manifestFileNameLength));
        }


        if (this.revealGoalType === "folder" && this.revealGoalExpandFolder) {
            //Expand folder as a side effect by 1st revealing the manifest.json file 
            await vscode.commands.executeCommand("revealInExplorer", vscode.Uri.joinPath(pickUri, "manifest.json"));
        }
        await vscode.commands.executeCommand("revealInExplorer", pickUri);
    }

    async getItems() {
        return this.bundleService.getBundles({ hotCount: 5 }).map(bundle => this.createPickItem(bundle));
    }


    private createPickItem(bundle: Bundle) {
        return {
            label: bundle.name,
            description: this.revealGoalType === "folder" ? bundle.shortPath : bundle.shortManifestPath,
            bundleUri: bundle.uri
        };
    }
}