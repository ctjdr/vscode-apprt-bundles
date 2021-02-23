import * as vscode from "vscode";
import * as fs from "fs";

export class SchemaDocumentContentProvider implements vscode.TextDocumentContentProvider {

    private changeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.changeEmitter.event;
    private provideHelp = false;
    private maniLong: string;
    private maniShort: string;

    constructor(private extensionPath: string) {
        this.maniLong = fs.readFileSync(this.extensionPath + "/dist/schemas/manifest.schema.json", "utf-8");
        this.maniShort = fs.readFileSync(this.extensionPath + "/dist/schemas/manifest.schema.short.json", "utf-8");
    }

    async provideTextDocumentContent(uri: vscode.Uri) {
        return (this.provideHelp ? this.maniLong : this.maniShort);
    }

    toggleHelp() {
        this.setHelp(!this.provideHelp);
    }

    setHelp(provideHelp: boolean) {
        if (this.provideHelp === provideHelp) {
            return;
        }
        this.provideHelp = provideHelp;
        this.changeEmitter.fire(vscode.Uri.parse("apprt://./manifest.schema.json"));
    }
}
