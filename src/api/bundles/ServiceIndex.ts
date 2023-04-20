import ManifestDocument, { StringFragment } from "./ManifestDocument";
import MultiValueIndex from "./MultiValueIndex";

export default class ServiceIndex {

    private servicenameToBundleIds: MultiValueIndex<string, string> = new MultiValueIndex();

    constructor(private manifestProvider: (bundleId: string) => ManifestDocument | undefined) {
    }

    public findBundleIdsByServiceName(serviceName: string): Set<string> {
        return this.servicenameToBundleIds.getValues(serviceName);
    }

    public getServiceNames(): IterableIterator<string> {
        return this.servicenameToBundleIds.getKeys();
    }

    public findProvidesFor(servicename: string): StringFragment[] {
        const providesItems: StringFragment[] = [];
        const manifestCandidateUris = this.servicenameToBundleIds.getValues(servicename);
        for (let manifestUri of manifestCandidateUris) {
            const manifest = this.manifestProvider(manifestUri);
            if (!manifest) {
                continue;
            }
            providesItems.push(...manifest.getProvidesFor(servicename));
        }
        return providesItems;
    }

    public findProvidingFor(servicename: string): StringFragment[] {
        const providingItems: StringFragment[] = [];
        const bundleUris = this.servicenameToBundleIds.getValues(servicename);
        for (let bundleUri of bundleUris) {
            const manifest = this.manifestProvider(bundleUri);
            if (!manifest) {
                continue;
            }
            providingItems.push(...manifest.getProvidingFor(servicename));
        }
        return providingItems;
    }

    public clear() {
        this.servicenameToBundleIds.clear();
    }

    public cleanupServiceNames(bundleId: string) {
        this.servicenameToBundleIds.invalidateValue(bundleId);
    }

    public index(bundleId: string) {
        const doc = this.manifestProvider(bundleId);
        if (!doc) {
            return;
        }
        doc.getServiceNames().forEach(serviceName => {
            this.servicenameToBundleIds.index(serviceName, bundleId);
        });
    }

}