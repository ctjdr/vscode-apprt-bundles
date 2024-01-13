import * as vscode from "vscode";
import ManifestDocument from "api/bundles/ManifestDocument";
import { rangeOfSection } from "../Range";
import { BundleService } from "api/bundles/BundleService";
import { TextDocument, workspace } from "vscode";


/**
 * Provides a code lens above a component name to jump to the implementation module directly.
 */
export class ComponentImplCodeLensProvider implements vscode.CodeLensProvider {

    private changeEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.changeEmitter.event;

    private codeLensToggleState = true;
    private codeLensesInitialized = false;

    constructor(private context: vscode.ExtensionContext, private bundleService: BundleService) {

        this.context.subscriptions.push(
            vscode.commands.registerCommand("gotoComponentImpl", gotoComponentImpl)
        );
    }

    public updateLenses() {
        if (!this.codeLensesInitialized) {
            //Don't fire update if code lenses have never been calculated, yet
            console.debug(`Component Impl CodeLens: Ignoring update request`);
            return;
        }
        console.debug(`Component Impl CodeLens: Firing update`);
        this.changeEmitter.fire();
    }

    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        
        if (!this.codeLensToggleState) {
            return Promise.resolve([]);
        }
        
        //return lenses only, if document is asserted to be up to date after no more than 2 secs
        const manifestDoc = await this.bundleService.getManifestAsync(document.uri);
        if (!manifestDoc) {
            console.debug(`Component Impl CodeLens generation skipped, document not up to date`);
            return Promise.resolve([]);
        }
        console.debug(`${new Date().toLocaleString()} -  Component Impl CodeLens asked to generate lenses for ${document.uri}`);

        this.codeLensesInitialized = true;
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
                continue;
            }
            const namePosition = layerFileDoc.positionAt(layerClass.nameRange.start);


            
            let targetUri;
            let targetRange; 
            let jsTsSupportReady = true;
            
            //The "vscode.typescript-language-features" extension might not be active until the first editor with a .js or .ts file is opened.
            // It definitely gets activated when we trigger the "vscode.executeDefinitionProvider" command on a .js or .ts file that is not opened.
            // This is not ideal, as this might delay code lens generation.

            if (!vscode.extensions.getExtension("vscode.typescript-language-features")?.isActive) {
                jsTsSupportReady = false;
                console.debug("Activating TS language features");
                vscode.extensions.getExtension("vscode.typescript-language-features")?.activate().then(() => this.updateLenses());
            }

            if (jsTsSupportReady) {
                const items: vscode.LocationLink[] = await vscode.commands.executeCommand("vscode.executeDefinitionProvider", layerFile.uri, namePosition);
                if (items.length === 0) {
                    continue;
                }
                targetUri = items[0].targetUri;
                targetRange = new vscode.Range(items[0].targetRange.start, items[0].targetRange.start);
            } 



            const nameRange = rangeOfSection(section);
            
            //TODO: Add "tooltip" to command (Could be the file name that will be visited on click)
            const lens = new vscode.CodeLens(nameRange, {
                command: "gotoComponentImpl",
                title: jsTsSupportReady ? "Go to implementation" : "Searching implementation ...",
                arguments: [targetUri, targetRange]
            });
            lenses.push(lens);

        }

        const t1 = new Date().getTime();
        console.debug(`Component Impl CodeLens generation took ${t1 - t0} ms (TS support: ${"nn"})`);
        return lenses;
    }
}


async function gotoComponentImpl(targetUri: vscode.Uri | undefined, targetRange: vscode.Range) {
    if (!targetUri) {
        return;
    }
    vscode.window.showTextDocument(targetUri, {
        selection: targetRange
    });
}


