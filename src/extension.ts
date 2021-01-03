import * as vscode from "vscode";
import { BundleIndex } from "./bundles/BundleIndex";
import BundleQuickPicker from "./features/BundleQuickPicker";
import { ManifestSchemaFeatures } from "./features/ManifestSchemaFeatures";
import { BundleFileOpener } from "./features/BundleFileOpener";
import { ServiceNameCodeLensProvider } from "./features/ServiceNameCodeLensProvider";
import { ServiceNameCompletionProvider } from "./features/ServiceNameCompletionProvider";
import { ServiceNameReferenceProvider } from "./features/ServiceNameReferenceProvider";
import { ComponentDefinitionProvider } from "./features/ComponentDefinitionProvider";
import { BundleService } from "./bundles/BundleService";
import { BundleActionHandler } from "./bundles/BundleActions";
import { MostRecentHotlist } from "./bundles/Hotlist";

export const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/manifest.json"
};

const fileExclusion: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/node_modules/**"
};

export function noManifestFile(doc: vscode.TextDocument): boolean {
    return (vscode.languages.match(manifestFilesSelector, doc) === 0 || vscode.languages.match(fileExclusion, doc) !== 0);
}

export async function activate(context: vscode.ExtensionContext) {

    const manifestSchemaDisposables =  new ManifestSchemaFeatures(context).register();

    vscode.commands.registerCommand("apprtbundles.activate", async () => {
        const decision = await vscode.window.showInformationMessage(
            "VS Code needs to be reloaded. Otherwise the extension might not work as expected. Unsaved changes will be lost!",
            {title: "Reload later", reload: false}, { title: "Reload", reload: true});

        if (decision?.reload) {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });

    let bundleIndex = BundleIndex.createDefault(new vscode.EventEmitter<void>());
    const bundleService = new BundleService(bundleIndex);
    const bundleActionHandler = new BundleActionHandler();
    const bundleHotlist  = new MostRecentHotlist<string>(20);

    const indexBundles  = async () => {
        const message = await bundleIndex.rebuild();
        vscode.window.setStatusBarMessage(`Finished indexing ${message} bundles.`, 4000);
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

        ...manifestSchemaDisposables,

        ...bundleActionHandler.register(),
        
        ...new BundleQuickPicker(bundleService, bundleActionHandler, bundleHotlist).register(),

        ... new BundleFileOpener(bundleIndex).register(),

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
 



export function deactivate() { 
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', false);
}
