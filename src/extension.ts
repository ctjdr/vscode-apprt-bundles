import { resolve } from 'path';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

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
    public provideReferences(
        document: vscode.TextDocument, position: vscode.Position,
        options: { includeDeclaration: boolean }, token: vscode.CancellationToken):
        Thenable<vscode.Location[]> {

            
            return new Promise(async (resolve, reject) => {
                let fileUris = await vscode.workspace.findFiles("**/manifest.json");
                let fileLocations = fileUris.map((uri) => {
                    return new vscode.Location(uri, new vscode.Position(0, 0));
            });
            resolve(fileLocations);
        });
    }
}



// this method is called when your extension is deactivated
export function deactivate() { }
