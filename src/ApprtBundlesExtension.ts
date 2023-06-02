import * as vscode from "vscode";
import path = require("path");
import { DeprecationFixFactory, DeprecationQuickFixAllProvider, DeprecationQuickFixProvider } from "./features/manifest/DeprecationQuickFixProvider";
import { SchemaDocumentContentProvider } from "./features/manifest/SchemaDocumentContentProvider";
import { BundleService } from "api/bundles/BundleService";
import { FilteringFileResolverAdapter } from "api/bundles/FilteringFileResolverAdapter";
import { WorkspaceFileResolver } from "features/manifest/WorkspaceFileResolver";
import { BundleIndex } from "api/bundles/BundleIndex";
import ServiceNameIndex from "api/bundles/ServiceIndex";
import { ExtensionConfiguration } from "./Configuration";
import { ComponentImplCodeLensProvider } from "features/manifest/ComponentImplCodeLensProvider";
import { BundleTreeProvider } from "features/bundles/BundleTreeProvider";
import { BundleActionHandler } from "features/bundles/BundleActions";
import { MostRecentHotlist } from "api/bundles/Hotlist";
import { ServiceNameReferenceProvider } from "features/manifest/ServiceNameReferenceProvider";
import { ServiceNameCompletionProvider } from "features/manifest/ServiceNameCompletionProvider";
import { ServiceNameCodeLensProvider } from "features/manifest/ServiceNameCodeLensProvider";
import { ComponentDefinitionProvider } from "features/manifest/ComponentDefinitionProvider";
import BundleQuickPicker from "features/bundles/BundleQuickPicker";
import { BundleFileOpener } from "features/bundles/BundleFileOpener";


export {
    ApprtBundlesExtension
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

class ApprtBundlesExtension {

    private schemaDocumentProvider: SchemaDocumentContentProvider;
    private fileResolver: FilteringFileResolverAdapter;
    private manifestProvider: BundleIndex;
    private serviceNameIndex: ServiceNameIndex;
    private configuration: ExtensionConfiguration;
    private bundleService: BundleService;
    private componentImplCodeLensProvider: ComponentImplCodeLensProvider;
    private bundleTreeProvider: BundleTreeProvider;
    private bundleActionHandler: BundleActionHandler;
    private bundleHotlist: MostRecentHotlist<string>;
    private deprecationFixFactory: DeprecationFixFactory;
    private quickFixProvider: DeprecationQuickFixProvider;
    private quickFixAllProvider: DeprecationQuickFixAllProvider;
    private serviceNameReferenceProvider: ServiceNameReferenceProvider;
    private serviceNameCompletionProvider: ServiceNameCompletionProvider;
    private serviceNameCodeLensProvider: ServiceNameCodeLensProvider;
    private componentDefinitionProvider: ComponentDefinitionProvider;
    private bundleQuickPicker: BundleQuickPicker;
    private bundleOpener: BundleFileOpener;

    constructor(private extensionCtx: vscode.ExtensionContext) {

        //Create base services
        this.fileResolver = new FilteringFileResolverAdapter(new WorkspaceFileResolver());
        this.manifestProvider = BundleIndex.create(this.fileResolver);
        this.serviceNameIndex = new ServiceNameIndex(this.manifestProvider);
        this.configuration = new ExtensionConfiguration();
        this.bundleService = new BundleService(this.manifestProvider, this.fileResolver);
        this.fileResolver.setExclusionGlobs(this.configuration.get<string[]>("apprtbundles.bundles.ignorePaths") ?? []);

        //Create extended services
        this.bundleActionHandler = new BundleActionHandler();
        this.bundleHotlist = new MostRecentHotlist<string>(20);
        this.deprecationFixFactory = new DeprecationFixFactory(this.bundleService);
        this.bundleQuickPicker = new BundleQuickPicker(this.bundleService, this.bundleActionHandler, this.bundleHotlist);
        this.bundleOpener = new BundleFileOpener();

        //Create providers
        this.schemaDocumentProvider = new SchemaDocumentContentProvider(this.extensionCtx.extensionPath);
        this.componentImplCodeLensProvider = new ComponentImplCodeLensProvider(this.extensionCtx, this.bundleService);
        this.bundleTreeProvider = new BundleTreeProvider(this.bundleService);
        this.quickFixProvider = new DeprecationQuickFixProvider(this.deprecationFixFactory);
        this.quickFixAllProvider = new DeprecationQuickFixAllProvider(this.deprecationFixFactory);
        this.serviceNameReferenceProvider = new ServiceNameReferenceProvider(this.bundleService, this.serviceNameIndex, this.extensionCtx);
        this.serviceNameCompletionProvider = new ServiceNameCompletionProvider(this.bundleService, this.serviceNameIndex);
        this.serviceNameCodeLensProvider = new ServiceNameCodeLensProvider(this.extensionCtx, this.bundleService, this.serviceNameIndex);
        this.componentDefinitionProvider = new ComponentDefinitionProvider(this.bundleService);

        this.extensionCtx.subscriptions.push(this.manifestProvider);

        this.registerEarly();
        this.hookAll();
    }
    
    
    public async activate() {
        //Trigger bundle index
        //TODO
        vscode.window.setStatusBarMessage("Indexing bundles... ", this.indexBundles());


        //Register providers and such
        this.register();
    }

    /**
     * Register features that need to be available early.
     * This holds true for the (manifest) schema provides that must be able to deliver the dynamically adjusted schema before indexing of manifest files starts.
     */
    private registerEarly() {
        const disposables = [
            vscode.workspace.registerTextDocumentContentProvider("apprt", this.schemaDocumentProvider),
            vscode.commands.registerCommand("apprtbundles.manifest.toggleDocumentationTooltips", () => {
                this.schemaDocumentProvider.toggleHelp();
            }),
            vscode.workspace.onDidChangeConfiguration(configEvt => {
                if (configEvt.affectsConfiguration("apprtbundles.manifest.documentationTooltips.enabled")) {
                    this.updateFromConfig();
                }
            })
        ];
        this.updateFromConfig();
        this.extensionCtx.subscriptions.push(...disposables);
    }

    private register() {

        const disposables = [
            //VS Code providers
            vscode.languages.registerReferenceProvider(manifestFilesSelector, this.serviceNameReferenceProvider),
            vscode.languages.registerCompletionItemProvider(manifestFilesSelector, this.serviceNameCompletionProvider, "\"", ":"),
            vscode.languages.registerCodeLensProvider(manifestFilesSelector, this.serviceNameCodeLensProvider),
            vscode.languages.registerCodeLensProvider(manifestFilesSelector, this.componentImplCodeLensProvider),
            vscode.languages.registerDefinitionProvider(manifestFilesSelector, this.componentDefinitionProvider),
            vscode.languages.registerCodeActionsProvider(manifestFilesSelector, this.quickFixProvider,
                {
                    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
                }),
            vscode.languages.registerCodeActionsProvider(manifestFilesSelector, this.quickFixAllProvider,
                {
                    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
                }),

            vscode.window.registerTreeDataProvider("apprtbundles.tree", this.bundleTreeProvider),

            //Other disposables
            ...this.configuration.register(),
            ...this.bundleActionHandler.register(),
            ...this.bundleQuickPicker.register(),
            ...this.bundleOpener.register(),

        ];

        this.extensionCtx.subscriptions.push(...disposables);
    }

    private hookAll() {
        this.hookToManifestProvider();
        this.hookToConfig();
        this.hookToWorkspace();
        this.hookToBundleActions();
    }


    private hookToManifestProvider() {
        //HOOK ManifestProvider with ServiceNameIndex
        this.manifestProvider.onManifestIndexed((manifestUri) => {
            this.serviceNameIndex.clearForManifest(manifestUri);
            this.serviceNameIndex.index(manifestUri);
        });

        //HOOK: ManifestProvider with ServiceNameIndex
        this.manifestProvider.onManifestInvalidatedAll(() => {
            this.serviceNameIndex.clearAll();
        });

        //HOOK: ManifestProvider with BundleTreeProvider and ComponentImplCodeLensProvider
        this.manifestProvider.onIndexRebuilt(() => {
            this.bundleTreeProvider.update();
            this.componentImplCodeLensProvider.updateLenses();
        });

    }

    private hookToConfig() {
        //HOOK: Config with FileResolver
        this.configuration.onConfigKeyChange("apprtbundles.bundles.ignorePaths", (change) => {
            const ignorePaths = change.value as string[];
            this.fileResolver.setExclusionGlobs(ignorePaths);
            vscode.window.setStatusBarMessage("Indexing bundles... ", this.indexBundles());
        });
    }

    private hookToWorkspace() {
        //HOOK Workspace with ManifestProvider
        this.extensionCtx.subscriptions.push(vscode.workspace.onDidChangeTextDocument((evt) => {
            if (noManifestFile(evt.document)) {
                return;
            }
            this.manifestProvider.markDirty(evt.document.uri);
        }
        ));
    }

    private hookToBundleActions() {
        //HOOK: bundleActionHandler with bundleHotlist
        this.bundleActionHandler.onRevealBundle(bundleUri => this.bundleHotlist.promote(bundleUri));
    }

    private async indexBundles() {
        const message = await this.manifestProvider.rebuild();
        vscode.window.setStatusBarMessage(`Finished indexing ${message} bundles.`, 4000);
    };


    private updateFromConfig(): void {
        const docTooltipsEnabled = vscode.workspace.getConfiguration("apprtbundles.manifest.documentationTooltips").get<boolean>("enabled") ?? true;
        this.schemaDocumentProvider.setHelp(docTooltipsEnabled);
    }


}

