import * as vscode from "vscode";
import { BundleActionHandler } from "../bundles/BundleActions";
import { Bundle } from "../bundles/BundleModel";
import { BundleService } from "../bundles/BundleService";
import { Hotlist } from "../bundles/Hotlist";

export default class BundleQuickPicker {

    constructor(
        private bundleService: BundleService,
        private bundleActionHandler: BundleActionHandler,
        private hotlist: Hotlist<string>
    ) {}

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand("apprtbundles.bundles.reveal", async () => {
                const selectedBundle = await vscode.window.showQuickPick(
                    this.createPickItems(),
                    {
                        matchOnDescription: true
                    }
                );
                if (selectedBundle) {
                    this.bundleActionHandler.revealBundle(selectedBundle.bundleUri);
                }
            })
        ];
    }

    private async createPickItems() {
        const pickItems = this.bundleService.getBundles().map(bundle => this.createPickItem(bundle));

        if (pickItems.length <= 5) {
            //Don't add hotlist items if there are not more entries in the bundle list than could be in the hotlist.
            return pickItems;
        }


        //Add hotlist bundles to the top
        for (const bundleUri of this.hotlist.getTop(5).reverse()) {
            const bundle = this.bundleService.getBundle(bundleUri);
            if (!bundle) {
                continue;
            }
            pickItems.unshift(this.createPickItem(bundle, "$(star-full) "));  
        }

        return pickItems;
    }


    private createPickItem(bundle: Bundle, labelPrefix: string = "") {
        return {
            label: `${labelPrefix}${bundle.name}`,
            description: bundle.shortPath,
            bundleUri: bundle.uri
        };
    }
}