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
        ...new ManifestSchemaFeatures().register()
    );

    console.debug("Indexing bundles...");
    const bundleIndex = BundleIndex.createDefault();
    let message = await bundleIndex.update();
    console.debug("Indexing bundles finished. " + message);

    const documentChangeHandler = (evt: vscode.TextDocumentChangeEvent): void => {
        const doc = evt.document;
        if (vscode.languages.match(manifestFilesSelector, doc) === 0) {
            return;
        }
        bundleIndex.markDirty(evt.document.uri.toString());
    };
    
    context.subscriptions.push(

        ...new BundleQuickPicker(bundleIndex).register(),

        vscode.workspace.onDidChangeTextDocument(documentChangeHandler),

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
