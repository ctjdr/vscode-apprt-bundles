import * as vscode from "vscode";
import { BundleIndex } from "../bundles/BundleIndex";
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

    private static pathRegex = /.*\/src\/main\/js\/((.*)\/manifest\.json)/;


    constructor(private bundleIndex: BundleIndex) {
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

    private async openBundle(selectedBundleUri:vscode.Uri) {

        this.hotlist.promote(selectedBundleUri.toString());

        const manifestPath = selectedBundleUri.path;
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

        const items: BundleQickPickItem[] = [];
        const id2bundleEntries = this.bundleIndex.getBundles();
        
        for (let [key, value] of id2bundleEntries) {
            items.push(this.createPickItem(key, value.name));
        }
        const itemsSorted = items.sort((item1, item2) => item1.label!.localeCompare(item2.label!));

        for (const hotlistUri of this.hotlist.getTop(5).reverse()) {
            const bundle = this.bundleIndex.findBundleByUri(hotlistUri);
            const item = this.createPickItem(hotlistUri, `$(star-full) ${bundle?.name || "unknown"}`);
            itemsSorted.unshift(item);
        }

        return itemsSorted;
    }


    private createPickItem(bundleUriString: string, label: string) {
        const bundleUri = vscode.Uri.parse(bundleUriString);

        const manifestPath = bundleUri.path;
        const matcher = BundleQuickPicker.pathRegex.exec(manifestPath);
        const shortBundlePath = matcher === null ? "" :  matcher[this.revealGoalType === "folder"? 2 : 1];

        const pickItem = {
            label,
            description: shortBundlePath,
            bundleUri
        };
        return pickItem;
    }
}