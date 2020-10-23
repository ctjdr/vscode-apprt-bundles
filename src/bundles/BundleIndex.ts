import ManifestDocument, { StringFragment } from "./ManifestDocument";
import MultiValueIndex from "./MultiValueIndex";

export interface ManifestResolver {
    /**
     * @returns a list of URIs pointing to manifest.json documents.
     */
    getAllUris(): Promise<string[]>;

    /**
     * 
     * @param uri URI of a manifest document whose content shall be returned.
     */
    resolve(uri: string): Promise<string>;
}

export class BundleIndex {
    
    private manifestProvider: ManifestResolver;
    
    private uri2manifestIdx: Map<string, ManifestDocument> = new Map();
    private servicename2uriIdx: MultiValueIndex<string, string> = new MultiValueIndex();

    private dirtyIds: Set<string> = new Set();

    private constructor(manifestProvider: ManifestResolver) {
        this.manifestProvider = manifestProvider;
    }
    
    static createDefault(): BundleIndex {
        const workspaceManifestProvider = require("./WorkspaceManifestResolver");
        return new BundleIndex(new workspaceManifestProvider.WorkspaceManifestProvider());
    }

    static create(manifestProvider: ManifestResolver): BundleIndex {
        return new BundleIndex(manifestProvider);
    }

    public async update():Promise<string> {

        // Should be called "rebuild" and clear index maps before rebuilding

        let ids = await this.manifestProvider.getAllUris();

        for (const id of ids) {
            await this.updateSingle(id);
        }
         return Promise.resolve(`Indexed ${ids.length} bundles.`);

    }

    private async updateSingle(bundleId: string) {
        let doc = await this.manifestProvider.resolve(bundleId.toString());
        const manifestDoc = await ManifestDocument.fromString(doc);
        console.debug(`Indexing bundle manifest <${bundleId}>`);
        // TODO: This doesn't clean index servicenames->bundleIds correctly: 
        // What if a bundle does not reference a service name any more? The entry is kept although it should be deleted.
        this.indexManifestDoc(bundleId.toString(), manifestDoc);
        this.dirtyIds.delete(bundleId);
    }

    public markDirty(bundleId: string):void {
        this.dirtyIds.add(bundleId);
        console.debug(`${bundleId} marked dirty. Now ${this.dirtyIds.size} marked dirty.`);
    }

    public async updateDirty(): Promise<void> {
        for (let id of this.dirtyIds) {
            await this.updateSingle(id);
        }
    }

    public getBundles() {
        return this.uri2manifestIdx.entries();
    }

    public findBundleIdsByServiceName(serviceName: string): Set<string> {
        return this.servicename2uriIdx.getValues(serviceName);
    }

    public findBundleByUri(uri: string): ManifestDocument | undefined {
        return this.uri2manifestIdx.get(uri);
    }

    public getServiceNames(): IterableIterator<string>{
        return this.servicename2uriIdx.getKeys();
    }

    public findProvidesFor(servicename: string) {
        const providesItems: StringFragment[] = [];
        const manifestCandidateUris = this.servicename2uriIdx.getValues(servicename);
        for (let manifestUri of manifestCandidateUris) {
            const manifest = this.uri2manifestIdx.get(manifestUri);
            if (!manifest) {
                continue;
            }
            providesItems.push(...manifest.getProvidesFor(servicename));
        }
        return providesItems;
    }
    
    public findProvidingFor(servicename: string) {
        const providingItems: StringFragment[] = [];
        const manifestCandidateUris = this.servicename2uriIdx.getValues(servicename);
        for (let manifestUri of manifestCandidateUris) {
            const manifest = this.uri2manifestIdx.get(manifestUri);
            if (!manifest) {
                continue;
            }
            providingItems.push(...manifest.getProvidingFor(servicename));
        }
        return providingItems;
    }

    private indexManifestDoc(bundleId: string, doc: ManifestDocument):void {
        this.indexDocById(bundleId, doc);
        this.indexIdByServiceName(bundleId, doc);
    }
    
    private indexDocById(bundleId: string, doc: ManifestDocument) {
        this.uri2manifestIdx.set(bundleId, doc);
    }

    private indexIdByServiceName(bundleId: string, doc: ManifestDocument) {
        doc.getServiceNames().forEach(serviceName => {
            this.servicename2uriIdx.index(serviceName, bundleId);
        });
    }
}