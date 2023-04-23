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
import { WorkspaceFileResolver } from "features/manifest/WorkspaceFileResolver";
import { FilteringFileResolverAdapter } from "api/bundles/FilteringFileResolverAdapter";
import ServiceNameIndex from "api/bundles/ServiceIndex";



export async function activate(context: vscode.ExtensionContext) {

    const manifestFeatures = new ManifestFeatures(context);
    const manifestFeaturesEarlyDisposables =  manifestFeatures.registerEarly();
    const bundleFilesResolver = new FilteringFileResolverAdapter(new WorkspaceFileResolver());

    vscode.commands.registerCommand("apprtbundles.activate", async () => {
        const decision = await vscode.window.showInformationMessage(
            "VS Code needs to be reloaded. Otherwise the extension might not work as expected. Unsaved changes will be lost!",
            {title: "Reload later", reload: false}, { title: "Reload", reload: true});

        if (decision?.reload) {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });

    const configuration = new ExtensionConfiguration();
    
    const bundleIndex = BundleIndex.create(bundleFilesResolver);
    

    //TODO Use this ServiceNameIndex instance one to pass around.
    const serviceNameIndex = new ServiceNameIndex(bundleIndex);

    bundleIndex.onManifestIndexed((manifestUri) => {
        serviceNameIndex.clearForManifest(manifestUri);
        serviceNameIndex.index(manifestUri);
    });
    bundleIndex.onManifestInvalidatedAll(() => {
        serviceNameIndex.clearAll();
    });
    
    bundleFilesResolver.setExclusionGlobs(configuration.get<string[]>("apprtbundles.bundles.ignorePaths") ?? []);
    const bundleService = new BundleService(bundleIndex, bundleFilesResolver);
    const bundleActionHandler = new BundleActionHandler();
    const bundleHotlist  = new MostRecentHotlist<string>(20);
    const bundleTreeProvider = new BundleTreeProvider(bundleService);
    
    bundleIndex.onIndexRebuilt( () => {
        bundleTreeProvider.update();
    });
    const indexBundles  = async () => {
        const message = await bundleIndex.rebuild();
        vscode.window.setStatusBarMessage(`Finished indexing ${message} bundles.`, 4000);
    };
    vscode.window.setStatusBarMessage("Indexing bundles... ", indexBundles());

    configuration.onConfigKeyChange("apprtbundles.bundles.ignorePaths", (change) => {
        const ignorePaths = change.value as string[];
        bundleFilesResolver.setExclusionGlobs(ignorePaths);
        vscode.window.setStatusBarMessage("Indexing bundles... ", indexBundles());
    });


    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((evt) =>
    {
        if (noManifestFile(evt.document)) {
            return;
        }
        bundleIndex.markDirty(evt.document.uri);
    }
    ));
    
    
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', true);

    context.subscriptions.push(
        
        bundleIndex,
        ...manifestFeaturesEarlyDisposables,
        ...manifestFeatures.register(bundleService),
        ...configuration.register(),
        ...bundleActionHandler.register(),
        ...new BundleQuickPicker(bundleService, bundleActionHandler, bundleHotlist).register(),
        ...new BundleFileOpener().register(),
        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new ServiceNameReferenceProvider(bundleService, serviceNameIndex, context)),            
        vscode.languages.registerCompletionItemProvider(
            manifestFilesSelector, new ServiceNameCompletionProvider(bundleService, serviceNameIndex), "\"", ":"),
        vscode.languages.registerCodeLensProvider(
            manifestFilesSelector, new ServiceNameCodeLensProvider(context, bundleService, serviceNameIndex)),
        vscode.languages.registerDefinitionProvider(
            manifestFilesSelector, new ComponentDefinitionProvider(bundleService)),
        bundleActionHandler.onRevealBundle( bundleUri => bundleHotlist.promote(bundleUri)),
        vscode.window.registerTreeDataProvider("apprtbundles.tree", bundleTreeProvider)
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
