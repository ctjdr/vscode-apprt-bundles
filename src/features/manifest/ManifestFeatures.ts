import * as vscode from "vscode";
import { DeprecationFixFactory, DeprecationQuickFixAllProvider, DeprecationQuickFixProvider } from "./DeprecationQuickFixProvider";
import { SchemaDocumentContentProvider } from "./SchemaDocumentContentProvider";
import path = require("path");
import { BundleService } from "api/bundles/BundleService";


export {
    ManifestFeatures,
    manifestFilesSelector,
    noManifestFile,
    workspaceRelativeParentFolder
};

const manifestFilesSelector: vscode.DocumentSelector = {
    language: "json",
    scheme: "file",
    pattern: "**/manifest.json"
};

function noManifestFile(doc: vscode.TextDocument): boolean {
    return (vscode.languages.match(manifestFilesSelector, doc) === 0);
}

/**
 * 
 * @param uri a URI.
 * @return the folder containing the given resource (be it a file or a folder), relative to the workspace.
 */
function workspaceRelativeParentFolder(uri: vscode.Uri): string {
    const bundlePath = path.resolve(uri.fsPath, "..");
    return vscode.workspace.asRelativePath(bundlePath);
}

class ManifestFeatures {
    
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
            
    register(bundleService: BundleService): vscode.Disposable[] {
        const deprecationFixFactory = new DeprecationFixFactory(bundleService);
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
        
