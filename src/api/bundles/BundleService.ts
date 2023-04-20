import { URI } from "vscode-uri";
import { BundleIndex, FileResolver } from "./BundleIndex";
import ManifestDocument from "./ManifestDocument";
import { Bundle } from "./BundleModel";
import { LayerFile } from "./LayerFile";
import path = require("path");
import  * as fs  from "fs";

interface BundleListOptions {
    sorted?: boolean
}

/**
 * Provides access to bundle information for a set of bundles known to this service.
 */
export class BundleService {

    private static pathRegex = /.*\/src\/main\/js\/((.*\/)(.*\/)manifest\.json)/;

    constructor(
        private bundleIndex: BundleIndex,
        private fileResolver: FileResolver
    ) {}

    /**
     * @param options 
     * @returns all bundles known by this bundle service.
     */
    getBundles(options?: BundleListOptions): Bundle[] {

        const sorted = options?.sorted ?? true;

        let bundles = [];
        for (let [bundleUri, manifestDoc] of this.bundleIndex.getBundles()) {
            bundles.push(this.createBundle(URI.parse(bundleUri), manifestDoc));
        }

        if (sorted) {
            bundles = bundles.sort((b1, b2) => b1.name.localeCompare(b2.name));
        }

        return bundles;
    }

    /**
     * @param manifestUri a URI pointing to a bundle manifest file like `file:///home/foo/bar-bundle/manifest.json`.
     * @returns bundle metadata of the the bundle at the given manifest location or `undefined` if the bundle is not known to this service.
     */
    getBundle(manifestUri: URI): Bundle | undefined {
        const manifestDoc = this.bundleIndex.findBundle(manifestUri);
        if (!manifestDoc) {
            return undefined;
        }
        return this.createBundle(manifestUri, manifestDoc);
    }

    /**
     * @param manifestUri a URI pointing to a bundle manifest file like `file:///home/foo/bar-bundle/manifest.json`.
     * @returns bundle manifest document at the given manifest location or `undefined` if the bundle is not known to this service.
     */
    getManifest(manifestUri: URI): ManifestDocument | undefined {
        return this.bundleIndex.findBundle(manifestUri);
    }

    /**
     * @param uri a URI pointing to a bundle manifest file like `file:///home/foo/bar-bundle/manifest.json`.
     * @returns `module.js` or `module.ts` file of the bundle at the given manifest location or `undefined` if the bundle is not known to this service.
     **/
    async getLayerFile(manifestUri: URI): Promise<LayerFile | undefined> {
        const bundle = this.getBundle(manifestUri);
        if (!bundle) {
            return undefined;
        }

        const bundlePath = path.resolve(URI.parse(bundle.uri).fsPath, "..");
        const moduleFilePath = [path.join(bundlePath, "module.js"), path.join(bundlePath, "module.ts")].find( (candidatePath)  => fs.existsSync(candidatePath));

        if (!moduleFilePath) {
            return undefined;
        }

        // const relativeBundlePath = workspace.asRelativePath(bundlePath);
        // // const moduleFiles = await workspace.findFiles(relativeBundlePath + "/" + "module.{js,ts}");
        // const moduleFiles = await this.fileResolver.getAllUris(relativeBundlePath + "/" + "module.{js,ts}");
        // if (moduleFiles.length === 0) {
        //     return undefined;
        // }

        // return LayerFile.parseFile(URI.file(moduleFilePath));

        const layerFileContent = await this.fileResolver.resolve(URI.file(moduleFilePath).fsPath);

        return LayerFile.parseContent(layerFileContent, URI.file(moduleFilePath).fsPath);

        return undefined;
        // return this.bundleIndex.findBundleByUri(uri);
    }

    private createBundle(manifestUri: URI, manifestDoc: ManifestDocument): Bundle {
        const matcher = BundleService.pathRegex.exec(manifestUri.path);
        const folder = matcher === null ? "" : matcher[2];
        return {
            uri: manifestUri.toString(),
            name: manifestDoc.name,
            folder: folder
        };
    }
}
