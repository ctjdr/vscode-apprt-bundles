import { Uri } from "vscode";
import { BundleIndex } from "./BundleIndex";
import ManifestDocument from "./ManifestDocument";
import { Bundle, BundleDetails } from "./BundleModel";
import { Configuration } from "../Configuration";
// import { Minimatch } from "minimatch";
// import M = require("minimatch");



interface BundleListOptions {
    sorted?: boolean
}

export class BundleService {

    private static pathRegex = /.*\/src\/main\/js\/((.*\/)(.*\/)manifest\.json)/;

    constructor(
        private bundleIndex: BundleIndex,
        private config: Configuration
    ) {}

    getBundles(options?: BundleListOptions): Bundle[] {

        const sorted = options?.sorted ?? true;

        // const ignoreMatchers = this.getIgnoreMatchers();
        let bundles = [];
        for (let [bundleUri, manifestDoc] of this.bundleIndex.getBundles()) {
            // if (this.isExcluded(bundleUri, ignoreMatchers)) {
            //     continue;
            // }
            bundles.push(this.createBundle(bundleUri, manifestDoc));
        }

        if (sorted) {
            bundles = bundles.sort((b1, b2) => b1.name.localeCompare(b2.name));
        }

        return bundles;
    }

    getBundle(uri: string): Bundle | undefined {
        // if (this.isExcluded(uri, this.getIgnoreMatchers())) {
        //     return;
        // }
        const manifestDoc = this.bundleIndex.findBundleByUri(uri);
        if (!manifestDoc) {
            return undefined;
        }
        return this.createBundle(uri, manifestDoc);
    }

    getBundleDetails(uri: string): BundleDetails | undefined {
        // if (this.isExcluded(uri, this.getIgnoreMatchers())) {
        //     return;
        // }
        return new BundleDetails();
    }

    // private isExcluded(bundleUri: string, ignoreMathcher: M.IMinimatch[]): boolean {
    //     const isExcluded = ignoreMathcher.some(pattern => pattern.match(Uri.parse(bundleUri).fsPath));
    //     return isExcluded;
    // }
    
    // getIgnoreMatchers() {
    //     const ignorePathStrings = this.config.get<Array<string>>("apprtbundles.bundles.ignorePaths");
    //     if (!ignorePathStrings) {
    //         return [];
    //     }
        
    //     return ignorePathStrings.map(pattern => new Minimatch(pattern));
    // }

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
