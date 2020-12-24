import { CancellationToken, DefinitionProvider, Location, Position, TextDocument, Uri, window, workspace } from "vscode";
import { BundleIndex } from "../bundles/BundleIndex";
import * as path from "path";

export class ComponentDefinitionProvider implements DefinitionProvider{

    constructor(
        private bundleIndex: BundleIndex
    ) {}

    async provideDefinition(doc: TextDocument, pos: Position, token: CancellationToken)  {

        const manifestDoc = this.bundleIndex.findBundleByUri(doc.uri.toString());
        if (!manifestDoc) {
            return undefined;
        }
        for (const component of manifestDoc.getComponents()) {
            
            const componentNameFragment = component.getName();
            if (!componentNameFragment || !componentNameFragment.section.contains(pos.line, pos.character)) {
                continue;
            }
            const bundlePath = doc.uri.fsPath.replace(/(.*)\/manifest.json/, "$1");              
            
            const componentImplUris = await workspace.findFiles({
                base: bundlePath,
                pattern: `${componentNameFragment.value}.{js,ts}`
            });

            if (componentImplUris.length === 0) {
                return undefined;
            }

            //TODO: Check for component's "impl" property, eg.
            // "./LocalImplClass"
            // "anotherBundle/folder/ImplClass"
            return componentImplUris.map( uri => new Location(uri, new Position(0,0)));
        }                

        return undefined;
    }

}