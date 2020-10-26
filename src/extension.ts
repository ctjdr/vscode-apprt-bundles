import { on } from "events";
import * as vscode from "vscode";
import { BundleIndex } from "./bundles/BundleIndex";
import BundleQuickPicker from "./features/BundleQuickPicker";
import { ServiceNameCodeLensProvider } from "./features/ServiceNameCodeLensProvider";
import { ServiceNameCompletionProvider } from "./features/ServiceNameCompletionProvider";
import { ServiceNameReferenceProvider } from "./features/ServiceNameReferenceProvider";

const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/src/**/manifest.json"
};

export async function activate(context: vscode.ExtensionContext) {

    const docProvider = new ApprtBundlesDocProvider();

    vscode.workspace.registerTextDocumentContentProvider("apprtbundles", docProvider);


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

        vscode.commands.registerCommand("apprtbundles.manifest.toggleSchemaValidation", () => {
            docProvider.toggle();
        }),

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


class ApprtBundlesDocProvider implements vscode.TextDocumentContentProvider{

    private changeEmitter = new vscode.EventEmitter<vscode.Uri>();
    public readonly onDidChange = this.changeEmitter.event;

    private validationEnabled = true;


    toggle() {
        this.validationEnabled = !this.validationEnabled;
        // this.changeEmitter.fire(vscode.Uri.parse("apprtbundles://schemas/support.schema.json"));
        // this.changeEmitter.fire(vscode.Uri.parse("apprtbundles://schemas/layout.schema.json"));
        // this.changeEmitter.fire(vscode.Uri.parse("apprtbundles://schemas/framework.schema.json"));
        // this.changeEmitter.fire(vscode.Uri.parse("apprtbundles://schemas/component.schema.json"));
        this.changeEmitter.fire(vscode.Uri.parse("apprtbundles://schemas/manifest.schema.json"));
    }

    // onDidChange?: vscode.Event<vscode.Uri> | undefined;
    provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        if (this.validationEnabled) {
            // const schema = require(`./${uri.authority}/${uri.fsPath}`);
            // return JSON.stringify(schema);
            const schema = `{
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "---THE NAME---"
                    }
                }
            }`;
            return schema;
        }

        return `{
            "properties": {
                "name": {
                    "type": "string",
                    "description": "---not---"
                }
            }
        }`;    }



}

export function deactivate() { }
