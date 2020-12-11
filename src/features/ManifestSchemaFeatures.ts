import * as vscode from "vscode";
import * as fs from "fs";


export class ManifestSchemaFeatures {
    
    private maniPro: ManifestProvider;
    private displayHelp = true;
    
    constructor(private extensionCtx: vscode.ExtensionContext) {
        this.maniPro = new ManifestProvider(extensionCtx.extensionPath);            
    }
            
    register(): vscode.Disposable[] {
        const disposables = [
            vscode.workspace.registerTextDocumentContentProvider("apprt", this.maniPro),
            vscode.commands.registerCommand("apprtbundles.manifest.toggleDocumentationTooltips", () => {
                this.maniPro.toggleHelp();
            }),
            vscode.workspace.onDidChangeConfiguration( configEvt => {
                if (configEvt.affectsConfiguration("apprtbundles.manifest.documentationTooltips.enabled")) {
                    this.updateFromConfig();
                }
            })
        ];
        this.updateFromConfig();
        return disposables;
    }
            
    private updateFromConfig(): void {
        const docTooltipsEnabled = vscode.workspace.getConfiguration("apprtbundles.manifest.documentationTooltips").get<boolean>("enabled") ?? true;
        this.maniPro.setHelp(docTooltipsEnabled);       
    }            
}
        


class ManifestProvider implements vscode.TextDocumentContentProvider {

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

