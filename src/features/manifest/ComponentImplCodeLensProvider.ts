import * as vscode from "vscode";
import ManifestDocument from "api/bundles/ManifestDocument";
import { rangeOfSection } from "../Range";
import ServiceNameIndex from "api/bundles/ServiceIndex";
import { BundleService } from "api/bundles/BundleService";
import { TextDocument, workspace } from "vscode";


export class ComponentImplCodeLensProvider implements vscode.CodeLensProvider {

    private changeEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.changeEmitter.event;

    private codeLensToggleState = true;

    constructor(private context: vscode.ExtensionContext, private bundleService: BundleService, private serviceNameIndex: ServiceNameIndex) {

        context.subscriptions.push(
            vscode.commands.registerCommand("gotoComponentImpl", gotoComponentImpl),
        //     vscode.workspace.onDidChangeConfiguration(configEvt => {
        //         if (configEvt.affectsConfiguration("apprtbundles.manifest.serviceNameCodeLens.enabled")) {
        //             this.changeEmitter.fire();
        //             this.updateConfig();
        //         }
        //     }),
        //     vscode.commands.registerCommand("apprtbundles.manifest.toggleServiceNameCodeLens", () => {
        //         this.codeLensToggleState = !this.codeLensToggleState;
        //         this.changeEmitter.fire();
        //     })
        );

        this.updateConfig();
    }

    private updateConfig() {
        // const codelensConfig = vscode.workspace.getConfiguration("apprtbundles.manifest.serviceNameCodeLens");
        // this.codeLensToggleState = codelensConfig.get<boolean>("enabled") ?? false;
    }

    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {

        if (!this.codeLensToggleState) {
            return Promise.resolve([]);
        }

        //return lenses only, if document is asserted to be up to date after no more than 2 secs
        const manifestDoc = await this.bundleService.getManifestAsync(document.uri);
        if (!manifestDoc) {
            return Promise.resolve([]);
        }
        return this.calcLenses(manifestDoc, document);
    }

    private async calcLenses(manifestDoc: ManifestDocument, document: TextDocument): Promise<vscode.CodeLens[]> {
        const lenses: vscode.CodeLens[] = [];
        const t0 = new Date().getTime();
        
        const layerFile = await this.bundleService.getLayerFile(document.uri);

        if (!layerFile) {
            return [];
        }
        const layerFileDoc = await workspace.openTextDocument(layerFile.uri);


        for (const component of manifestDoc.getComponents()) {

            const componentNameFragment = component.getName();
            const componentImplFragment = component.getImpl();
            if (!componentNameFragment) {
                continue;
            }
            const section = componentNameFragment.section;

            const layerClass = layerFile.findSource(componentImplFragment?.value.replace(/^.\//, "") || componentNameFragment.value);
            if (!layerClass) {
                return [];
            }
            const namePosition = layerFileDoc.positionAt(layerClass.nameRange.start);

            const nameRange = rangeOfSection(section);
            const lens = new vscode.CodeLens(nameRange, {
                // command: "vscode.executeDefinitionProvider",
                command: "gotoComponentImpl",
                title: "Go to implementation",
                arguments: [layerFile.uri, namePosition]
            });
            lenses.push(lens);

        }

        const t1 = new Date().getTime();
        console.debug(`Component Impl CodeLens generation took ${t1 - t0} ms`);
        return lenses;
    }
    // resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
    //     return undefined;
    // }
}


async function gotoComponentImpl(layerDocUri: vscode.Uri, pos: vscode.Position) {

    const items: vscode.LocationLink[] = await vscode.commands.executeCommand("vscode.executeDefinitionProvider", layerDocUri, pos);

    if (items.length === 0) {
        return;
    }

    await vscode.window.showTextDocument(items[0].targetUri, {
        selection: new vscode.Range(items[0].targetRange.start, items[0].targetRange.start)
    });
}


