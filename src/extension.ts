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
    pattern: "**/src/**/manifest.json"
};

export async function activate(context: vscode.ExtensionContext) {

    // manifest schema doc provider must be registered before manifest.json files are read the first time.
    context.subscriptions.push(
        ...new ManifestSchemaFeatures(context.extensionPath).register()
    );

    console.debug("Indexing bundles...");
    const bundleIndex = BundleIndex.createDefault(new vscode.EventEmitter<void>());
    let message = await bundleIndex.rebuild();
    console.debug("Indexing bundles finished. " + message);

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((evt) => {
            if (vscode.languages.match(manifestFilesSelector, evt.document) === 0) {
                return;
            }
            bundleIndex.markDirty(evt.document.uri.toString());
        }
    ));


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
 


export function deactivate() { }
