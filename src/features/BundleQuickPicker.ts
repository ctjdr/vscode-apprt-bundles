import * as vscode from "vscode";
import { BundleActionHandler } from "../bundles/BundleActions";
import { Bundle } from "../api/bundles/BundleModel";
import { BundleService } from "../api/bundles/BundleService";
import { Hotlist } from "../api/bundles/Hotlist";
import  * as glob from "./glob";

/**
 * Registers a command to display a "quick pick list" of all bundles detected in the current workspace.
 * 
 */
export default class BundleQuickPicker {

    constructor(
        private bundleService: BundleService,
        private bundleActionHandler: BundleActionHandler,
        private hotlist: Hotlist<string>
    ) {}

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand("apprtbundles.bundles.reveal", async () => {
                const pickItems = this.createPickItems();
                const selectedBundle = await vscode.window.showQuickPick(
                    pickItems.items,
                    {
                        matchOnDescription: true,
                        placeHolder: "Bundle name or path"
                    }
                );
                if (selectedBundle) {
                    this.bundleActionHandler.revealBundle(selectedBundle.bundleUri);
                }
            })
        ];
    }

    private getHiddenBundlePaths() {
        return vscode.workspace.getConfiguration("apprtbundles").get<string[]>("bundles.hidePaths") || [];
    }

    private createPickItems() {
        let pickItems = this.bundleService.getBundles().map(bundle => this.createPickItem(bundle));
        const unfilteredCount = pickItems.length;

        pickItems = glob.allNotMatching(this.getHiddenBundlePaths(), pickItems, (item) => vscode.Uri.parse(item.bundleUri).fsPath);
        const filteredCount = pickItems.length;

        //Don't add hotlist items if there are not more entries in the bundle list than could be in the hotlist.
        if (pickItems.length > 5) {
            //Add hotlist bundles to the top
            for (const bundleUri of this.hotlist.getTop(5).reverse()) {
                const bundle = this.bundleService.getBundle(bundleUri);
                if (!bundle) {
                    continue;
                }
                pickItems.unshift(this.createPickItem(bundle, "$(star-full) "));  
            }
        }

        return { 
            items: pickItems,
            unfilteredCount,
            filteredCount
        };
    }


    private createPickItem(bundle: Bundle, labelPrefix: string = "") {
        return {
            label: `${labelPrefix}${bundle.name}`,
            description: bundle.shortPath,
            bundleUri: bundle.uri
        };
    }
}