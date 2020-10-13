import ManifestDocument from "./ManifestDocument";

export interface ManifestResolver {
    getAllIds(): Promise<string[]>;
    resolve(id: string): Promise<string>;
}

export class BundleIndex {
    
    private bundleId2manifestIdx: Map<string, ManifestDocument> = new Map();
    private serviceName2bundleIdIdx: Map<string, Set<string>> = new Map();
    private manifestProvider: ManifestResolver;

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

        let ids = await this.manifestProvider.getAllIds();

        for (const id of ids) {
            await this.updateSingle(id);
        }
         return Promise.resolve(`Indexed ${ids.length} bundles.`);

    }

    public async updateSingle(bundleId: string) {
        let doc = await this.manifestProvider.resolve(bundleId);
        const manifestDoc = await ManifestDocument.fromString(doc);
        console.debug(`Indexing bundle manifest <${bundleId}>`);
        this.indexManifestDoc(bundleId, manifestDoc);
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

    public findBundleIdsByServiceName(serviceName: string): Set<string> {
        return this.serviceName2bundleIdIdx.get(serviceName) || new Set();
    }

    public findBundleById(bundleId: string): ManifestDocument | undefined {
        return this.bundleId2manifestIdx.get(bundleId);
    }

    public getServiceNames(): IterableIterator<string>{
        return this.serviceName2bundleIdIdx.keys();
    }

    private indexManifestDoc(bundleId: string, doc: ManifestDocument):void {
        this.indexDocById(bundleId, doc);
        this.indexIdByServiceName(bundleId, doc);
    }
    
    private indexDocById(budleId: string, doc: ManifestDocument) {
        this.bundleId2manifestIdx.set(budleId, doc);
    }

    private indexIdByServiceName(bundleId: string, doc: ManifestDocument) {
        doc.getAllServiceNames().forEach(serviceName => {
            let indexedUris = this.serviceName2bundleIdIdx.get(serviceName);
            if (indexedUris === undefined) {
                indexedUris = new Set();
            }
            indexedUris.add(bundleId);
            this.serviceName2bundleIdIdx.set(serviceName, indexedUris);
        });
    }
}