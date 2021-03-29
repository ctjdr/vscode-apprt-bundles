import * as vscode from "vscode";
import { BundleIndex } from "../api/bundles/BundleIndex";
import { manifestFilesSelector } from "../extension";
import { DeprecationFixFactory, DeprecationQuickFixAllProvider, DeprecationQuickFixProvider } from "./DeprecationQuickFixProvider";
import { SchemaDocumentContentProvider } from "./SchemaDocumentContentProvider";


export class ManifestFeatures {
    
    private maniPro: SchemaDocumentContentProvider;
    
    constructor(private extensionCtx: vscode.ExtensionContext) {
        this.maniPro = new SchemaDocumentContentProvider(extensionCtx.extensionPath);            
    }
    /**
     * Register features that need to be available early.
     * This holds true for the (manifest) schema provides that must be able to deliver the dynamically adjusted schema before indexing of manifest files starts.
     */
    registerEarly() {
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
            
    register(bundleIndex: BundleIndex): vscode.Disposable[] {
        const deprecationFixFactory = new DeprecationFixFactory(bundleIndex);
        const quickFixProvider = new DeprecationQuickFixProvider(deprecationFixFactory);
        const quickFixAllProvider = new DeprecationQuickFixAllProvider(deprecationFixFactory);

        const disposables = [
            vscode.languages.registerCodeActionsProvider(manifestFilesSelector, quickFixProvider, {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
            }),
            vscode.languages.registerCodeActionsProvider(manifestFilesSelector, quickFixAllProvider, {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
            })    
        ];
        return disposables;
    }
            
}
        
