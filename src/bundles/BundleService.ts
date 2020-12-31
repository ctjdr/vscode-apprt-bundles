import { Uri } from "vscode";
import { BundleIndex } from "./BundleIndex";
import ManifestDocument from "./ManifestDocument";
import { Bundle, BundleDetails } from "./BundleModel";
import { MostRecentHotlist } from "./Hotlist";



interface BundleListOptions {
    sorted?: boolean,
    hotCount?: number,
    hotNameFn?: (b: Bundle) => string
}

export class BundleService {

    private static pathRegex = /.*\/src\/main\/js\/((.*)\/manifest\.json)/;

    private hotlist = new MostRecentHotlist<string>(5);

    constructor(
        private bundleIndex: BundleIndex,
        private exclusionGlobs: string[] = ["**/test/**", "**/sample/**"]
    ) { }

    getBundles(options?: BundleListOptions): Bundle[] {

        const sorted = options?.sorted ?? true;
        const hotCount = options?.hotCount ?? 0;
        const hotNameFn = options?.hotNameFn ?? ((b: Bundle) => `$(star-full) ${b.name}`);

        let bundles = [];
        for (let [bundleUri, manifestDoc] of this.bundleIndex.getBundles()) {
            bundles.push(this.createBundle(bundleUri, manifestDoc));
        }

        if (sorted) {
            bundles = bundles.sort((b1, b2) => b1.name.localeCompare(b2.name));
        }

        if (hotCount > 0) {
            this.hotlist.getTop(hotCount).forEach(bundleId => {
                const bundle = this.getBundle(bundleId);
                if (!bundle) {
                    return;
                }
                bundle.name = hotNameFn(bundle);
                bundles.unshift(bundle);
            });
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

    getBundleDetails(uri: string): BundleDetails {
        return new BundleDetails();
    }


    private createBundle(uri: string, manifestdoc: ManifestDocument): Bundle {
        const matcher = BundleService.pathRegex.exec(Uri.parse(uri).fsPath);
        const shortBundlePath = matcher === null ? "" : matcher[2];
        return {
            uri,
            name: manifestdoc.name,
            shortPath: shortBundlePath,
            shortManifestPath: `${shortBundlePath}/manifest.json`
        };
    }
}
