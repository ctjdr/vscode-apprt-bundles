import { StringFragment } from "./ManifestDocument";
import ManifestProvider from "./ManifestProvider";
import MultiValueIndex from "./MultiValueIndex";

export default class ServiceNameIndex {

    private servicenameToManifestUris: MultiValueIndex<string, string> = new MultiValueIndex();

    constructor(private manifestProvider: ManifestProvider) {
    }

    public findBundleIdsByServiceName(serviceName: string): Set<string> {
        return this.servicenameToManifestUris.getValues(serviceName);
    }

    public getServiceNames(): IterableIterator<string> {
        return this.servicenameToManifestUris.getKeys();
    }

    public findProvidesFor(servicename: string): StringFragment[] {
        const providesItems: StringFragment[] = [];
        const manifestCandidateUris = this.servicenameToManifestUris.getValues(servicename);
        for (let manifestUri of manifestCandidateUris) {
            const manifest = this.manifestProvider.provideManifest(manifestUri);
            if (!manifest) {
                continue;
            }
            providesItems.push(...manifest.getProvidesFor(servicename));
        }
        return providesItems;
    }

    public findProvidingFor(servicename: string): StringFragment[] {
        const providingItems: StringFragment[] = [];
        const manifestUris = this.servicenameToManifestUris.getValues(servicename);
        for (let manifestUri of manifestUris) {
            const manifestDoc = this.manifestProvider.provideManifest(manifestUri);
            if (!manifestDoc) {
                continue;
            }
            providingItems.push(...manifestDoc.getProvidingFor(servicename));
        }
        return providingItems;
    }

    public rebuild() {}

    public clearAll() {
        this.servicenameToManifestUris.clear();
    }

    public clearForManifest(manifestUri: string) {
        this.servicenameToManifestUris.invalidateValue(manifestUri);
    }

    public index(manifestUri: string) {
        const doc = this.manifestProvider.provideManifest(manifestUri);
        if (!doc) {
            return;
        }
        doc.getServiceNames().forEach(serviceName => {
            this.servicenameToManifestUris.index(serviceName, manifestUri);
        });
    }

}