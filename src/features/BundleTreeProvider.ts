import path = require("path");
import { commands, Event, ProviderResult, ThemeIcon, TreeDataProvider, TreeItem, Uri } from "vscode";
import { Bundle } from "../api/bundles/BundleModel";
import { BundleService } from "../api/bundles/BundleService";

class BundleTreeItem extends TreeItem {

    constructor(
        bundle: Bundle
    ) {
        super(bundle.name);
        this.description = bundle.shortPath;
        this.iconPath = new ThemeIcon("package");
    }



}

export class BundleTreeProvider implements TreeDataProvider<BundleTreeItem> {
    
    constructor(
        private bundleService: BundleService
    ) {

        commands.registerCommand("apprtbundles.bundles.tree.refresh", _ => {});

    }

    onDidChangeTreeData?: Event<void | BundleTreeItem | null | undefined> | undefined;
    
    getChildren(element?: BundleTreeItem): ProviderResult<BundleTreeItem[]> {
        if (!element) {
            //Return root items
            return Promise.resolve(this.createItems());
        }

        //return subitems
        return Promise.resolve([]);
    }
    
    private createItems() {
        return this.bundleService.getBundles().map( bundle => new BundleTreeItem(bundle));
    }

    getTreeItem(element: BundleTreeItem): TreeItem | Thenable<TreeItem> {
        return element;
    }
}