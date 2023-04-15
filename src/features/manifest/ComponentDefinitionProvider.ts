import { CancellationToken, DefinitionProvider, Location, Position, TextDocument, Uri, workspace } from "vscode";
import * as path from "path";
import { BundleIndex } from "api/bundles/BundleIndex";
import { LayerFile } from "./LayerFile";


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

        //TODO: Make this more efficient by letting the Manifest Document maintaining a lookup table for textPos -> component, so we don't have to iterate over components ech time <Ctrl> is pressed.
        for (const component of manifestDoc.getComponents()) {

            const componentNameFragment = component.getName();
            const componentImplFragment = component.getImpl();
            if (!componentNameFragment) {
                continue;
            }

            if (!componentNameFragment.section.contains(pos.line, pos.character) && !componentImplFragment?.section.contains(pos.line, pos.character)) {
                continue;
            }

            const bundlePath = path.resolve(doc.uri.fsPath, "..");
            const relativeBundlePath = workspace.asRelativePath(bundlePath);
            const layerFile = await this.getLayerFile(relativeBundlePath);
            const implFileName =  layerFile?.findSource(componentImplFragment?.value.replace(/^.\//, "") || componentNameFragment.value);
            const implFilePath =  path.join(relativeBundlePath, implFileName ?? "");

            const globPattern = `${implFilePath}.{js,ts}`;
            const componentImplUris = await workspace.findFiles(globPattern);

            if (componentImplUris.length === 0) {
                return undefined;
            }

            return componentImplUris.map(uri => new Location(uri, new Position(0, 0)));
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