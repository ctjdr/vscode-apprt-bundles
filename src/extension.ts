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
import { ComponentImplCodeLensProvider } from "features/manifest/ComponentImplCodeLensProvider";



export async function activate(context: vscode.ExtensionContext) {

    const manifestFeatures = new ManifestFeatures(context);
    const manifestFeaturesEarlyDisposables = manifestFeatures.registerEarly();

    vscode.commands.registerCommand("apprtbundles.activate", async () => {
        const decision = await vscode.window.showInformationMessage(
            "VS Code needs to be reloaded. Otherwise the extension might not work as expected. Unsaved changes will be lost!",
            { title: "Reload later", reload: false }, { title: "Reload", reload: true });

        if (decision?.reload) {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });


    const fileResolver = new FilteringFileResolverAdapter(new WorkspaceFileResolver());
    const manifestProvider = BundleIndex.create(fileResolver);
    const serviceNameIndex = new ServiceNameIndex(manifestProvider);

    //HOOK ManifestProvider with ServiceNameIndex
    manifestProvider.onManifestIndexed((manifestUri) => {
        serviceNameIndex.clearForManifest(manifestUri);
        serviceNameIndex.index(manifestUri);
    });

    //HOOK: ManifestProvider with ServiceNameIndex
    manifestProvider.onManifestInvalidatedAll(() => {
        serviceNameIndex.clearAll();
    });

    const configuration = new ExtensionConfiguration();
    fileResolver.setExclusionGlobs(configuration.get<string[]>("apprtbundles.bundles.ignorePaths") ?? []);
    const bundleService = new BundleService(manifestProvider, fileResolver);
    const bundleActionHandler = new BundleActionHandler();
    const bundleHotlist = new MostRecentHotlist<string>(20);
    const bundleTreeProvider = new BundleTreeProvider(bundleService);
    const componentImplCodeLensProvider = new ComponentImplCodeLensProvider(context, bundleService);

    //HOOK: ManifestProvider with BundleTreeProvider and ComponentImplCodeLensProvider
    manifestProvider.onIndexRebuilt(() => {
        bundleTreeProvider.update();
        componentImplCodeLensProvider.updateLenses();
    });
    const indexBundles = async () => {
        const message = await manifestProvider.rebuild();
        vscode.window.setStatusBarMessage(`Finished indexing ${message} bundles.`, 4000);
    };
    vscode.window.setStatusBarMessage("Indexing bundles... ", indexBundles());

    
    //HOOK: Config with FileResolver
    configuration.onConfigKeyChange("apprtbundles.bundles.ignorePaths", (change) => {
        const ignorePaths = change.value as string[];
        fileResolver.setExclusionGlobs(ignorePaths);
        vscode.window.setStatusBarMessage("Indexing bundles... ", indexBundles());
    });


    //HOOK Workspace with ManifestProvider
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((evt) => {
        if (noManifestFile(evt.document)) {
            return;
        }
        manifestProvider.markDirty(evt.document.uri);
    }
    ));


    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', true);

    context.subscriptions.push(

        manifestProvider,
        ...manifestFeaturesEarlyDisposables,
        ...manifestFeatures.register(bundleService),
        ...configuration.register(),
        ...bundleActionHandler.register(),
        ...new BundleQuickPicker(bundleService, bundleActionHandler, bundleHotlist).register(),
        ...new BundleFileOpener().register(),
        vscode.languages.registerReferenceProvider(manifestFilesSelector, new ServiceNameReferenceProvider(bundleService, serviceNameIndex, context)),
        vscode.languages.registerCompletionItemProvider(manifestFilesSelector, new ServiceNameCompletionProvider(bundleService, serviceNameIndex), "\"", ":"),
        vscode.languages.registerCodeLensProvider(manifestFilesSelector, new ServiceNameCodeLensProvider(context, bundleService, serviceNameIndex)),
        vscode.languages.registerCodeLensProvider(manifestFilesSelector, componentImplCodeLensProvider),
        vscode.languages.registerDefinitionProvider(manifestFilesSelector, new ComponentDefinitionProvider(bundleService)),
        vscode.window.registerTreeDataProvider("apprtbundles.tree", bundleTreeProvider),

        //HOOK: bundleActionHandler with bundleHotlist
        bundleActionHandler.onRevealBundle(bundleUri => bundleHotlist.promote(bundleUri))
    );

    return;
}


export function deactivate() {
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', false);
}
