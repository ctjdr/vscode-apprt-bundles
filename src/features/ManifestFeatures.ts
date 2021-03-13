import * as vscode from "vscode";
import { manifestFilesSelector, noManifestFile } from "../extension";
import { DeprecationQuickFixAllProvider, DeprecationQuickFixProvider } from "./DeprecationQuickFixProvider";
import { SchemaDocumentContentProvider } from "./SchemaDocumentContentProvider";


export class ManifestFeatures {
    
    private maniPro: SchemaDocumentContentProvider;
    private displayHelp = true;
    
    constructor(private extensionCtx: vscode.ExtensionContext) {
        this.maniPro = new SchemaDocumentContentProvider(extensionCtx.extensionPath);            
    }
            
    register(): vscode.Disposable[] {
        const quickFixProvider = new DeprecationQuickFixProvider();
        const quickFixAllProvider = new DeprecationQuickFixAllProvider();
        const disposables = [
            vscode.workspace.registerTextDocumentContentProvider("apprt", this.maniPro),
            vscode.commands.registerCommand("apprtbundles.manifest.toggleDocumentationTooltips", () => {
                this.maniPro.toggleHelp();
            }),
            vscode.workspace.onDidChangeConfiguration( configEvt => {
                if (configEvt.affectsConfiguration("apprtbundles.manifest.documentationTooltips.enabled")) {
                    this.updateFromConfig();
                }
            }),
            vscode.languages.registerCodeActionsProvider(manifestFilesSelector, quickFixProvider, {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
            }),
            vscode.languages.registerCodeActionsProvider(manifestFilesSelector, quickFixAllProvider, {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
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
        
