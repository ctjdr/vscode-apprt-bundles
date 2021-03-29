import * as json from "jsonc-parser";
import * as vscode from "vscode";
import { noManifestFile } from "../extension";


class ManifestDocWatcher implements vscode.Disposable {

    private disposables: vscode.Disposable[] = [];
    private currentFile?: vscode.Uri;
    private currentFileNode?: json.Node;


    constructor() {
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(this.activeEditorChanged, this),
            vscode.workspace.onDidChangeTextDocument(this.docChanged, this)
        );
    }


    activeEditorChanged(editor: vscode.TextEditor | undefined) {
        if (editor && noManifestFile(editor.document)) {
            return;
        }
        if (!editor) {
            this.currentFile = undefined;
            this.currentFileNode = undefined;
            console.info(`CURRENT manifest.json: <undefined>`);
            return;
        }

        this.currentFile = editor.document.uri;
        console.info(`CURRENT manifest.json: ${this.currentFile}`);
        this.currentFileNode = json.parseTree(editor.document.getText());
        
    }
    
    docChanged(e: vscode.TextDocumentChangeEvent) {
        if (noManifestFile(e.document) || !this.matchesCurrentFile(e.document.uri)) {
            return;
        }
        
        console.info(`CURRENT UPDATE manifest.json: ${this.currentFile}`);
        this.currentFileNode = json.parseTree(e.document.getText());
    }

    getNode(uri: vscode.Uri): json.Node | undefined {
        if (this.matchesCurrentFile(uri)) {
            return this.currentFileNode;
        }
        return;
    }

    private matchesCurrentFile(uri: vscode.Uri) {
        return this.currentFile && uri.toString() === this.currentFile?.toString();
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }


}