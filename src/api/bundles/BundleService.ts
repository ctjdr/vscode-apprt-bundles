import { Uri } from "vscode";
import { BundleIndex } from "./BundleIndex";
import ManifestDocument from "./ManifestDocument";
import { Bundle, BundleDetails } from "./BundleModel";

interface BundleListOptions {
    sorted?: boolean
}

export class BundleService {

    private static pathRegex = /.*\/src\/main\/js\/((.*\/)(.*\/)manifest\.json)/;

    constructor(
        private bundleIndex: BundleIndex
    ) {}

    getBundles(options?: BundleListOptions): Bundle[] {

        const sorted = options?.sorted ?? true;

        let bundles = [];
        for (let [bundleUri, manifestDoc] of this.bundleIndex.getBundles()) {
            bundles.push(this.createBundle(bundleUri, manifestDoc));
        }

        if (sorted) {
            bundles = bundles.sort((b1, b2) => b1.name.localeCompare(b2.name));
        }

        return bundles;
    }

    getBundle(uri: string): Bundle | undefined {
        const manifestDoc = this.bundleIndex.findBundleByUri(uri);
        if (!manifestDoc) {
            return undefined;
        }
        return this.createBundle(uri, manifestDoc);
    }

    getBundleDetails(uri: string): BundleDetails | undefined {
        return new BundleDetails();
    }

    private createBundle(uri: string, manifestDoc: ManifestDocument): Bundle {
        const matcher = BundleService.pathRegex.exec(Uri.parse(uri).path);
        const shortBundlePath = matcher === null ? "" : matcher[2];
        return {
            uri,
            name: manifestDoc.name,
            shortPath: shortBundlePath,
            shortManifestPath: `${shortBundlePath}/manifest.json`
        };
    }
}
