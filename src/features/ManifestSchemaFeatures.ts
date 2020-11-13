import * as vscode from "vscode";
import * as $RefParser from "@apidevtools/json-schema-ref-parser";



export class ManifestSchemaFeatures {

    private schemaProvider: ApprtManifestSchemaProvider;

    constructor(extensionPath: string) {
        this.schemaProvider = new ApprtManifestSchemaProvider(extensionPath);
    }
    
    register(): vscode.Disposable[] {
        const disposables = [
            vscode.workspace.registerTextDocumentContentProvider("apprtbundles", this.schemaProvider),
            vscode.commands.registerCommand("apprtbundles.manifest.toggleDocumentationTooltips", () => {
                this.schemaProvider.toggle(Toggle.showDocumentation);
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
        this.schemaProvider.toggle(Toggle.showDocumentation, docTooltipsEnabled);
    }
}


enum Toggle {
    // validation,
    showDocumentation
};

class ApprtManifestSchemaProvider implements vscode.TextDocumentContentProvider{

    private changeEmitter = new vscode.EventEmitter<vscode.Uri>();
    public readonly onDidChange = this.changeEmitter.event;

    private bundledSchema = "{}";

    private toggles: Record<Toggle, boolean> = {
        // [Toggle.validation]: true,
        [Toggle.showDocumentation]: true
    };


    constructor(private extensionPath: string) {
        console.info(process.cwd());
        $RefParser.bundle(`${extensionPath}/out/schemas/manifest.schema.json`).then((jsonSchema) => {
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

    toggle(type: Toggle, value?: boolean) {
        if (value !== undefined) {
            this.toggles[type] = value;
        } else {
            this.toggles[type] = !this.toggles[type];
        }
        this.changeEmitter.fire(vscode.Uri.parse("apprtbundles://schemas/manifest.schema.json"));
    }

    provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        if (!this.toggles[Toggle.showDocumentation]) {
            const parsedSchema = JSON.parse(this.bundledSchema);
            this.removeDescriptions(parsedSchema);
            return JSON.stringify(parsedSchema); 
        }
        return this.bundledSchema; 
    }

}
