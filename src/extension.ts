import * as vscode from "vscode";
import { ApprtBundlesExtension } from "./ApprtBundlesExtension";

export async function activate(context: vscode.ExtensionContext) {

    const apprtBundlesExtension = new ApprtBundlesExtension(context);

    vscode.commands.registerCommand("apprtbundles.activate", async () => {
        const decision = await vscode.window.showInformationMessage(
            "VS Code needs to be reloaded. Otherwise the extension might not work as expected. Unsaved changes will be lost!",
            { title: "Reload later", reload: false }, { title: "Reload", reload: true });

        if (decision?.reload) {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });

    await apprtBundlesExtension.activate();

    //Enable commands in command palette
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', true);

    return;
}


export function deactivate() {
    vscode.commands.executeCommand('setContext', 'vscode-apprt-bundles:showCommands', false);
}
