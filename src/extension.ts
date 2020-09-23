import { resolve } from 'path';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import ManifestDocument, { DocumentElement } from "./ManifestDocument";
// import * as fs from "fs/promises";
const fs = require("fs").promises;

const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/manifest.json"
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-manifest-navigation" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('vscode-manifest-navigation.helloWorld', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from vscode-manifest-navigation!');
    });


    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(
            manifestFilesSelector, new BundleReferenceProvider()));




    context.subscriptions.push(disposable);
}


class BundleReferenceProvider implements vscode.ReferenceProvider {

    private static nullRange = new vscode.Range(new vscode.Position(0,0) , new vscode.Position(0,0));

    rangeOf(element: DocumentElement | null, doc: vscode.TextDocument) {
        if (element === null) {
            return BundleReferenceProvider.nullRange;
        }
        const start = doc.positionAt(element.offset);
        const end = doc.positionAt(element.offset + (element.length || 0));
        return new vscode.Range(start, end);
    }

    public provideReferences(
        document: vscode.TextDocument, position: vscode.Position,
        options: { includeDeclaration: boolean }, token: vscode.CancellationToken):
        Thenable<vscode.Location[]> {

            const locations = this.getLocations(document, position);

            return Promise.resolve(locations);
    }


    private async getLocations(document: vscode.TextDocument, position: vscode.Position) {
        const quotedLookupRef = document.getText(document.getWordRangeAtPosition(position));
        const lookupRef = quotedLookupRef.substring(1, quotedLookupRef.length - 1);

        const fileUris = await vscode.workspace.findFiles("**/manifest.json", "**/target/**/manifest.json");

        let locations = fileUris.reduce(async (locations, uri) => {
            const manifestDoc = await vscode.workspace.openTextDocument(uri);
            const jsonDoc = manifestDoc.getText();
            const doc = ManifestDocument.fromString(jsonDoc);
            let references = doc.getAllProviding(lookupRef);
            const accu = await locations;
            references.forEach( ref => {
                const providingElement = ref.getAskProviding();
                accu.push(new vscode.Location(uri, this.rangeOf(providingElement, manifestDoc)));
            });


            return accu;
        }, Promise.resolve(new Array<vscode.Location>()));

        return locations;

    }
}

// this method is called when your extension is deactivated
export function deactivate() { }
