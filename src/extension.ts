import * as vscode from "vscode";
import ManifestDocument from "./bundles/ManifestDocument";
import { ManifestIndex } from "./bundles/ManifestIndex";
import { ServiceNameCompletionProvider } from "./features/ServiceNameCompletionProvider";
import { ServiceNameReferenceProvider } from "./features/ServiceNameReferenceProvider";

const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/manifest.json"
};

export async function activate(context: vscode.ExtensionContext) {



    const manifestIndex = ManifestIndex.createDefault();
    console.debug("Indexing bundles...");
    let message = await manifestIndex.update();
    
    console.debug("Indexing bundles finished. " + message);
    
    vscode.workspace.onDidChangeTextDocument((evt) => {
        const doc = evt.document;
        if (vscode.languages.match(manifestFilesSelector, doc) === 0) {
            return;
        }
        manifestIndex.markDirty(evt.document.uri.toString());
    });



    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new ServiceNameReferenceProvider(manifestIndex)));
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            manifestFilesSelector, new ServiceNameCompletionProvider(manifestIndex), "\""));


    return Promise.resolve();
}


export function deactivate() { }
