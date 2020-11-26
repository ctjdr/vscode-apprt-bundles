import * as vscode from "vscode";
import * as $RefParser from "@apidevtools/json-schema-ref-parser";
import { ManifestDocHoverProvider } from "./ManifestDocHoverProvider";
import { manifestFilesSelector } from "../extension";


export class ManifestSchemaFeatures implements vscode.Disposable {
    
    private featureToggles: Record<FeatureNames, boolean> = {
        [FeatureNames.showDocumentation]: true
    };
    
    private features: Map<FeatureNames, Feature> = new Map();
    
    
    
    constructor(private extensionCtx: vscode.ExtensionContext) {
        this.features.set(FeatureNames.showDocumentation, new DisposableFeature( 
            (ctx: vscode.ExtensionContext) => {
                return vscode.languages.registerHoverProvider(
                    manifestFilesSelector, new ManifestDocHoverProvider(ctx.extensionPath));
                }
        )
    );

    }
    dispose() {
        for (const feature of this.features) {
            feature[1].deactivate();
        }
    }
    
    register(): vscode.Disposable[] {
        const disposables = [
            vscode.commands.registerCommand("apprtbundles.manifest.toggleDocumentationTooltips", () => {
                this.toggleFeature(FeatureNames.showDocumentation);
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
        this.setFeature(FeatureNames.showDocumentation, docTooltipsEnabled);
    }

    setFeature(featureName: FeatureNames, featureEnabled: boolean) {
        const feature = this.features.get(featureName);
        if (!feature) {
            return;
        }
        
        featureEnabled ? feature.activate(this.extensionCtx):feature.deactivate();
    }
    
    toggleFeature(featureName: FeatureNames) {
        const feature = this.features.get(featureName);
        if (!feature) {
            return;
        }

        feature.activated()?feature.deactivate():feature.activate(this.extensionCtx);
    }

}

class DisposableFeature implements Feature {

    private disposable?: vscode.Disposable;

    constructor(private activator: (ctx: vscode.ExtensionContext) => vscode.Disposable) {
    }

    activate(ctx: vscode.ExtensionContext) {
        this.disposable?.dispose();
        // if (this.disposable) {
        //     this.disposable.dispose();
        // }
        this.disposable = this.activator(ctx);
    }
    
    deactivate() {
        this.disposable?.dispose();
        this.disposable = undefined;
    }

    activated() {
        return !!this.disposable;
    }

}

interface Feature {
    activate: (ctx: vscode.ExtensionContext) => void;
    deactivate: () => void;
    activated: () => boolean;
};

enum FeatureNames {
    // validation,
    showDocumentation
};

class ApprtManifestSchemaProvider implements vscode.TextDocumentContentProvider{

    private changeEmitter = new vscode.EventEmitter<vscode.Uri>();
    public readonly onDidChange = this.changeEmitter.event;

    private bundledSchema = "{}";

    private toggles: Record<FeatureNames, boolean> = {
        // [Toggle.validation]: true,
        [FeatureNames.showDocumentation]: true
    };


    constructor(extensionPath: string) {
        $RefParser.bundle(`${extensionPath}/dist/schemas/manifest.schema.json`).then((jsonSchema) => {
                delete jsonSchema["$schema"];
                this.bundledSchema = JSON.stringify(jsonSchema);
            }, (rejected) => {
                vscode.window.showErrorMessage("Cannot load manfiest.json schema: " + rejected);
                console.error(rejected);
            }
        );

    }

    private removeDescriptions(obj: any): void {
        if (obj instanceof Array) {
            for (var i in obj) {
                this.removeDescriptions(obj[i]);
            }
            return;
        }

        if (obj instanceof Object) {
            let description = obj["description"];
            if (typeof description === "string" || description instanceof String) {
                delete obj["description"];
            }
            let children = Object.keys(obj);
            if (children.length > 0) {
                for (let i = 0; i < children.length; i++) {
                    this.removeDescriptions(obj[children[i]]);
                }
            }
        }
        return;
    }

    toggle(type: FeatureNames, value?: boolean) {
        if (value !== undefined) {
            this.toggles[type] = value;
        } else {
            this.toggles[type] = !this.toggles[type];
        }
        this.changeEmitter.fire(vscode.Uri.parse("apprtbundles://schemas/manifest.schema.json"));
    }

    provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        if (!this.toggles[FeatureNames.showDocumentation]) {
            const parsedSchema = JSON.parse(this.bundledSchema);
            this.removeDescriptions(parsedSchema);
            return JSON.stringify(parsedSchema); 
        }
        return this.bundledSchema; 
    }

}
