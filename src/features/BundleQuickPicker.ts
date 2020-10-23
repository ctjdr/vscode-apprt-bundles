import * as vscode from "vscode";
import { BundleIndex } from "../bundles/BundleIndex";

interface BundleQickPickItem extends vscode.QuickPickItem {
    label: string ;
    description: string;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;
    bundleUri: vscode.Uri;
}

export default class BundleQuickPicker {


    private revealGoalType = "folder";
    private revealGoalExpandFolder = true;

    constructor(private bundleIndex: BundleIndex) {

    }

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand("apprtbundles.bundles.reveal", async () => {
            const selection = await vscode.window.showQuickPick(
                this.getItems()
            );
            if (selection) {
                if (this.revealGoalType === "folder" && this.revealGoalExpandFolder) {
                    await vscode.commands.executeCommand("revealInExplorer", vscode.Uri.joinPath(selection.bundleUri, "manifest.json"));
                } 
                await vscode.commands.executeCommand("revealInExplorer", selection.bundleUri);
                
            }
        }),
        vscode.workspace.onDidChangeConfiguration( configEvt => {
            if (configEvt.affectsConfiguration("apprtbundles.bundles.reveal.goal")) {
                const goalConfig = vscode.workspace.getConfiguration("apprtbundles.bundles.reveal.goal");
                this.revealGoalType = goalConfig.get<string>("type") || "folder";
                this.revealGoalExpandFolder = goalConfig.has("expandFolder")? goalConfig.get<boolean>("expandFolder")! : true;
            }
        }),

    
    ];
    }
    private static  manifestFileNameLength = "/manifest.json".length;


    async getItems(options?: {pickManifest: boolean}) {
        const items: BundleQickPickItem[] = [];
        const id2bundleEntries = this.bundleIndex.getBundles();
        for (let [key, value] of id2bundleEntries) {

            const manifestPath  = vscode.Uri.parse(key).path;

            let pickPath = manifestPath.substring(0, manifestPath.length - BundleQuickPicker.manifestFileNameLength);           
            if (this.revealGoalType === "manifest") {
                pickPath =  manifestPath;
            }
             
            const shortBundlePath = pickPath.substring(pickPath.lastIndexOf("/src/main/js") + 13);

            items.push(
                {
                    label: value.name,
                    description: shortBundlePath,
                    bundleUri: vscode.Uri.parse(pickPath)
                }
            );
        }
        return items.sort( (item1, item2) => item1.label!.localeCompare(item2.label!));
    }

}