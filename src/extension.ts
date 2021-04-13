import * as vscode from "vscode";
import { BundleIndex } from "api/bundles/BundleIndex";
import BundleQuickPicker from "features/bundles/BundleQuickPicker";
import { ManifestFeatures, manifestFilesSelector, noManifestFile } from "features/manifest/ManifestFeatures";
import { BundleFileOpener } from "features/bundles/BundleFileOpener";
import { ServiceNameCodeLensProvider } from "features/manifest/ServiceNameCodeLensProvider";
import { ServiceNameCompletionProvider } from "features/manifest/ServiceNameCompletionProvider";
import { ServiceNameReferenceProvider } from "features/manifest/ServiceNameReferenceProvider";
import { ComponentDefinitionProvider } from "features/manifest/ComponentDefinitionProvider";
import { BundleService } from "api/bundles/BundleService";
import { BundleActionHandler } from "features/bundles/BundleActions";
import { MostRecentHotlist } from "api/bundles/Hotlist";
import { ExtensionConfiguration } from "./Configuration";
import { BundleTreeProvider } from "features/bundles/BundleTreeProvider";
import { WorkspaceManifestProvider } from "features/manifest/WorkspaceManifestResolver";



export async function activate(context: vscode.ExtensionContext) {

    const manifestFeatures = new ManifestFeatures(context);
    const manifestFeaturesEarlyDisposables =  manifestFeatures.registerEarly();

    vscode.commands.registerCommand("apprtbundles.activate", async () => {
        const decision = await vscode.window.showInformationMessage(
            "VS Code needs to be reloaded. Otherwise the extension might not work as expected. Unsaved changes will be lost!",
            {title: "Reload later", reload: false}, { title: "Reload", reload: true});

        if (decision?.reload) {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });

    const configuration = new ExtensionConfiguration();
    configuration.onConfigKeyChange("apprtbundles.bundles.ignorePaths", (change) => {
        const ignorePaths = change.value as string[];
        bundleIndex.setBundleExclusions(ignorePaths);
        initIndex(bundleIndex);
    });

    let bundleIndex = BundleIndex.create(new WorkspaceManifestProvider());
    bundleIndex.setBundleExclusions(configuration.get<string[]>("apprtbundles.bundles.ignorePaths") ?? []);
    const bundleService = new BundleService(bundleIndex);
    const bundleActionHandler = new BundleActionHandler();
    const bundleHotlist  = new MostRecentHotlist<string>(20);

    const indexBundles  = async () => {
        const message = await bundleIndex.rebuild();
        vscode.window.setStatusBarMessage(`Finished indexing ${message} bundles.`, 4000);
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider("apprtbundles.tree", new BundleTreeProvider(bundleService))
        );
    };
    vscode.window.setStatusBarMessage("Indexing bundles... ", indexBundles());
    
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((evt) =>
    {
        if (noManifestFile(evt.document)) {
            return;
        }
        bundleIndex.markDirty(evt.document.uri.toString());
    }
    ));
    
    
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', true);



    context.subscriptions.push(
        
        bundleIndex,
        
        ...manifestFeaturesEarlyDisposables,

        ...manifestFeatures.register(bundleIndex),

        ...configuration.register(),

        ...bundleActionHandler.register(),
        
        ...new BundleQuickPicker(bundleService, bundleActionHandler, bundleHotlist).register(),

        ...new BundleFileOpener().register(),

        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new ServiceNameReferenceProvider(bundleIndex, context)),            
            
        vscode.languages.registerCompletionItemProvider(
            manifestFilesSelector, new ServiceNameCompletionProvider(bundleIndex), "\"", ":"),

        vscode.languages.registerCodeLensProvider(
            manifestFilesSelector, new ServiceNameCodeLensProvider(context, bundleIndex)),

        vscode.languages.registerDefinitionProvider(
            manifestFilesSelector, new ComponentDefinitionProvider(bundleIndex)),

        bundleActionHandler.onRevealBundle( bundleUri => bundleHotlist.promote(bundleUri))


    );

    return Promise.resolve();
}
 



function initIndex(bundleIndex: BundleIndex) {
    const indexBundles = async () => {
        const message = await bundleIndex.rebuild();
        vscode.window.setStatusBarMessage(`Finished indexing ${message} bundles.`, 4000);
    };
    vscode.window.setStatusBarMessage("Indexing bundles... ", indexBundles());
}

export function deactivate() { 
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', false);
}
