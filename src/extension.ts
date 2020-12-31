import * as vscode from "vscode";
import { BundleIndex } from "./bundles/BundleIndex";
import BundleQuickPicker from "./features/BundleQuickPicker";
import { ManifestSchemaFeatures } from "./features/ManifestSchemaFeatures";
import { BundleFileOpener } from "./features/BundleFileOpener";
import { ServiceNameCodeLensProvider } from "./features/ServiceNameCodeLensProvider";
import { ServiceNameCompletionProvider } from "./features/ServiceNameCompletionProvider";
import { ServiceNameReferenceProvider } from "./features/ServiceNameReferenceProvider";
import { ComponentDefinitionProvider } from "./features/ComponentDefinitionProvider";
import { ComponentQuickPicker } from "./features/ComponentQuickPicker";
import { BundleTreeProvider } from "./features/BundleTreeProvider";
import { BundleService } from "./bundles/BundleService";

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

export function noManifestFile(doc: vscode.TextDocument | undefined): boolean {
    if (!doc) {
        return true;
    }
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


    const indexBundles  = async () => {
        const message = await bundleIndex.rebuild();
        vscode.window.setStatusBarMessage(`Finished indexing ${message} bundles.`, 4000);
        context.subscriptions.push(
            ... new ComponentQuickPicker(bundleIndex).register(),
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

        ...manifestSchemaDisposables,
        
        ...new BundleQuickPicker(bundleService).register(),

        ... new BundleFileOpener(bundleIndex).register(),

        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new ServiceNameReferenceProvider(bundleIndex, context)),            
            
        vscode.languages.registerCompletionItemProvider(
            manifestFilesSelector, new ServiceNameCompletionProvider(bundleIndex), "\"", ":"),

        vscode.languages.registerCodeLensProvider(manifestFilesSelector,
            new ServiceNameCodeLensProvider(context, bundleIndex)),

        vscode.languages.registerDefinitionProvider(manifestFilesSelector,
            new ComponentDefinitionProvider(bundleIndex))

    );

    return Promise.resolve();
}
 



export function deactivate() { 
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', false);
}
