import ManifestDocument from "./ManifestDocument";

export interface ManifestResolver {
    getAllIds(): Promise<string[]>;
    resolve(id: string): Promise<string>;
}

export class ManifestIndex {
    
    private manifestId2docIdx: Map<string, ManifestDocument> = new Map();
    private serviceName2manifestIdIdx: Map<string, Set<string>> = new Map();
    private manifestProvider: ManifestResolver;

    private dirtyIds: Set<string> = new Set();

    private constructor(manifestProvider: ManifestResolver) {
        this.manifestProvider = manifestProvider;
    }
    
    static createDefault(): ManifestIndex {
        const workspaceManifestProvider = require("./WorkspaceManifestResolver");
        return new ManifestIndex(new workspaceManifestProvider.WorkspaceManifestProvider());
    }

    static create(manifestProvider: ManifestResolver): ManifestIndex {
        return new ManifestIndex(manifestProvider);
    }

    public async update():Promise<string> {

        let ids = await this.manifestProvider.getAllIds();

        for (const id of ids) {
            await this.updateSingle(id);
        }
         return Promise.resolve(`Indexed ${ids.length} bundles.`);

    }

    public async updateSingle(id: string) {
        let doc = await this.manifestProvider.resolve(id);
        const manifestDoc = await ManifestDocument.fromString(doc);
        console.debug(`Indexing bundle manifest <${id}>`);
        this.indexManifestDoc(id, manifestDoc);
        this.dirtyIds.delete(id);
    }

    public findBundleIdsByServiceName(serviceName: string): Set<string> {
        return this.serviceName2manifestIdIdx.get(serviceName) || new Set();
    }

    public findBundleById(bundleId: string): ManifestDocument | undefined {
        return this.manifestId2docIdx.get(bundleId);
    }

    public markDirty(bundleId: string):void {
        this.dirtyIds.add(bundleId);
        // console.debug(`${bundleId} marked dirty. Now ${this.dirtyIds.size} marked dirty.`);
    }

    public async updateDirty(): Promise<void> {
        for (let id of this.dirtyIds) {
            await this.updateSingle(id);
        }
    }

    private indexManifestDoc(id: string, doc: ManifestDocument):void {
        this.indexDocById(id, doc);
        this.indexIdByServiceName(id, doc);
    }
    
    private indexDocById(id: string, doc: ManifestDocument) {
        this.manifestId2docIdx.set(id, doc);
    }

    private indexIdByServiceName(id: string, doc: ManifestDocument) {
        doc.getAllServiceNames().forEach(serviceName => {
            let indexedUris = this.serviceName2manifestIdIdx.get(serviceName);
            if (indexedUris === undefined) {
                indexedUris = new Set();
            }
            indexedUris.add(id);
            this.serviceName2manifestIdIdx.set(serviceName, indexedUris);
        });
    }
}