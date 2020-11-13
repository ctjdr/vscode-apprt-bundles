import * as vscode from "vscode";
import { BundleIndex } from "./bundles/BundleIndex";
import BundleQuickPicker from "./features/BundleQuickPicker";
import { ManifestSchemaFeatures } from "./features/ManifestSchemaFeatures";
import { ServiceNameCodeLensProvider } from "./features/ServiceNameCodeLensProvider";
import { ServiceNameCompletionProvider } from "./features/ServiceNameCompletionProvider";
import { ServiceNameReferenceProvider } from "./features/ServiceNameReferenceProvider";

const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/manifest.json"
};

const fileExclusion: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/node_modules/**"
};

export async function activate(context: vscode.ExtensionContext) {

    vscode.commands.registerCommand("apprtbundles.activate", async () => {
        const decision = await vscode.window.showInformationMessage(
            "VS Code needs to be reloaded. Otherwise the extension might not work as expected. Unsaved changes will be lost!",
            {title: "Reload later", reload: false}, { title: "Reload", reload: true});

        if (decision?.reload) {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });

    // manifest schema doc provider must be registered before manifest.json files are read the first time.
    context.subscriptions.push(
        ...new ManifestSchemaFeatures(context.extensionPath).register()
    );

    
    
    let bundleIndex = BundleIndex.createDefault(new vscode.EventEmitter<void>());
    const indexBundles  = async () => {
        const message = await bundleIndex.rebuild();
        vscode.window.setStatusBarMessage(`Finished indexing ${message} bundles.`, 4000);
    };
    vscode.window.setStatusBarMessage("Indexing bundles... ", indexBundles());

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((evt) =>
        {
            if (vscode.languages.match(manifestFilesSelector, evt.document) === 0 || vscode.languages.match(fileExclusion, evt.document) !== 0) {
                return;
            }
            bundleIndex.markDirty(evt.document.uri.toString());
        }
    ));


    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', true);



    context.subscriptions.push(
        
        bundleIndex,
        
        ...new BundleQuickPicker(bundleIndex).register(),

        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new ServiceNameReferenceProvider(bundleIndex, context)),            
            
        vscode.languages.registerCompletionItemProvider(
            manifestFilesSelector, new ServiceNameCompletionProvider(bundleIndex), "\"", ":"),

        vscode.languages.registerCodeLensProvider(manifestFilesSelector,
            new ServiceNameCodeLensProvider(context, bundleIndex))

    );

    return Promise.resolve();
}
 


export function deactivate() { 
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', false);
}
