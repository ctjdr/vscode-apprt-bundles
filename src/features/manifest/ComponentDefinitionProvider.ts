import { CancellationToken, DefinitionLink, DefinitionProvider, Location, Position, Range, TextDocument, Uri, workspace } from "vscode";
import * as path from "path";
import { BundleIndex } from "api/bundles/BundleIndex";
import { LayerFile } from "api/bundles/LayerFile";
import { rangeOfSection } from "features/Range";


/**
 * Implements a `vscode.DefinitionProvider` links a component of a manifest.json file to its implementing file.
 */
export class ComponentDefinitionProvider implements DefinitionProvider {

    constructor(
        private bundleIndex: BundleIndex
    ) { }

    async provideDefinition(doc: TextDocument, pos: Position, token: CancellationToken) {

        const manifestDoc = this.bundleIndex.findBundleByUri(doc.uri.toString());
        if (!manifestDoc) {
            return undefined;
        }


        const bundlePath = path.resolve(doc.uri.fsPath, "..");
        const relativeBundlePath = workspace.asRelativePath(bundlePath);
        const layerFile = await this.getLayerFile(relativeBundlePath);
        if (!layerFile) {
            return undefined;
        }
        const layerFileDoc = await workspace.openTextDocument(layerFile.uri);


        //TODO: Make this more efficient by letting the Manifest Document maintaining a lookup table for textPos -> component, so we don't have to iterate over components ech time <Ctrl> is pressed.
        for (const component of manifestDoc.getComponents()) {

            const componentNameFragment = component.getName();
            const componentImplFragment = component.getImpl();
            if (!componentNameFragment) {
                continue;
            }

            const isPosInName = componentNameFragment.section.contains(pos.line, pos.character);
            const isPosInImpl = componentImplFragment?.section.contains(pos.line, pos.character);
            if (!isPosInName && !isPosInImpl) {
                continue;
            }

            const layerClass = layerFile.findSource(componentImplFragment?.value.replace(/^.\//, "") || componentNameFragment.value);
            if (!layerClass) {
                return undefined;
            }
            const targetNameStart = layerFileDoc.positionAt(layerClass.nameRange.start);
            const targetNameEnd = layerFileDoc.positionAt(layerClass.nameRange.end);
            const targetStatementStart = layerFileDoc.positionAt(layerClass.statementRange.start);
            const targetStatementEnd = layerFileDoc.positionAt(layerClass.statementRange.end);

            let sourceRange;
            if (isPosInName) {
                sourceRange = rangeOfSection(componentNameFragment.section);
            } else {
                sourceRange = rangeOfSection(componentImplFragment!.section);
            }

            return [ {
                targetUri: layerFile.uri,
                targetRange: new Range(targetStatementStart, targetStatementEnd),
                targetSelectionRange: new Range(targetNameStart, targetNameEnd),
                originSelectionRange: sourceRange
            }] as DefinitionLink[];


            // const implFileName =  layerFile?.findSource(componentImplFragment?.value.replace(/^.\//, "") || componentNameFragment.value);
            // const implFilePath =  path.join(relativeBundlePath, implFileName?.source ?? "");

            // const globPattern = `${implFilePath}.{js,ts}`;
            // const componentImplUris = await workspace.findFiles(globPattern);

            // if (componentImplUris.length === 0) {
            //     return undefined;
            // }

            // return componentImplUris.map(uri => new Location(uri, new Position(0, 0)));
        }

        return undefined;
    }
    
    private async getLayerFile(relativeBundlePath: string): Promise<LayerFile | undefined>   {
        const moduleFiles = await workspace.findFiles(relativeBundlePath + "/" + "module.{js,ts}");
        if (moduleFiles.length === 0) {
            return undefined;
        }
        const moduleFilePath = moduleFiles[0];

        return LayerFile.parseFile(moduleFilePath);
    }

}