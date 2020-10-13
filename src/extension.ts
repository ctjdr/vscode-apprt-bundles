import * as vscode from "vscode";
import { BundleIndex } from "./bundles/BundleIndex";
import { ServiceNameCompletionProvider } from "./features/ServiceNameCompletionProvider";
import { ServiceNameReferenceProvider } from "./features/ServiceNameReferenceProvider";

const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/manifest.json"
};

export async function activate(context: vscode.ExtensionContext) {



    const bundleIndex = BundleIndex.createDefault();
    console.debug("Indexing bundles...");
    let message = await bundleIndex.update();
    
    console.debug("Indexing bundles finished. " + message);
    
    vscode.workspace.onDidChangeTextDocument((evt) => {
        const doc = evt.document;
        if (vscode.languages.match(manifestFilesSelector, doc) === 0) {
            return;
        }
        bundleIndex.markDirty(evt.document.uri.toString());
    });

    context.subscriptions.push(
        vscode.commands.registerCommand("zim", () => vscode.window.showInformationMessage("Zoola")));


    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new ServiceNameReferenceProvider(bundleIndex)));
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            manifestFilesSelector, new ServiceNameCompletionProvider(bundleIndex), "\"", ":"));        

    return Promise.resolve();
}


export function deactivate() { }
