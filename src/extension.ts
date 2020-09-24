import * as vscode from "vscode";
import { BundleReferenceProvider } from "./features/BundleReferenceProvider";

const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/manifest.json"
};

export function activate(context: vscode.ExtensionContext) {

  
    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new BundleReferenceProvider()));


}


export function deactivate() { }
