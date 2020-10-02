import * as vscode from "vscode";
import { ManifestIndex } from "./bundles/ManifestIndex";
import { ServiceNameReferenceProvider } from "./features/ServiceNameReferenceProvider";

const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/manifest.json"
};

export async function activate(context: vscode.ExtensionContext) {



    const manifestIndex = ManifestIndex.createDefault();
  
    console.info("Indexing bundles...");
    let message = await manifestIndex.update();

    console.info("Indexing bundles finished. " + message);
    
    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new ServiceNameReferenceProvider(manifestIndex)));


    return Promise.resolve();
}


export function deactivate() { }
