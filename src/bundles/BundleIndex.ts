import ManifestDocument, { Fragment, StringFragment } from "./ManifestDocument";
import MultiValueIndex from "./MultiValueIndex";

export interface ManifestResolver {
    getAllIds(): Promise<string[]>;
    resolve(id: string): Promise<string>;
}

export class BundleIndex {
    
    private bundleId2manifestIdx: Map<string, ManifestDocument> = new Map();
    private servicename2bundleIdIdx: MultiValueIndex<string, string> = new MultiValueIndex();
    private manifestProvider: ManifestResolver;
    private servicename2provides: MultiValueIndex<string, StringFragment> = new MultiValueIndex();
    private servicename2providing: MultiValueIndex<string, StringFragment> = new MultiValueIndex();

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
        // TODO: This doesn't clean index servicenames->bundleIds correctly: 
        // What if a bundle does not reference a service name any more? The entry is kept although it should be deleted.
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
        return this.servicename2bundleIdIdx.getValues(serviceName);
    }

    public findBundleById(bundleId: string): ManifestDocument | undefined {
        return this.bundleId2manifestIdx.get(bundleId);
    }

    public getServiceNames(): IterableIterator<string>{
        return this.servicename2bundleIdIdx.getKeys();
    }

    public findProvidesFor(servicename: string) {
        return this.servicename2provides.getValues(servicename);
    }

    public findProvidingFor(servicename: string) {
        return this.servicename2providing.getValues(servicename);
    }

    private indexManifestDoc(bundleId: string, doc: ManifestDocument):void {
        this.indexDocById(bundleId, doc);
        this.indexIdByServiceName(bundleId, doc);
        this.indexProvidesByServiceName(bundleId, doc);
        this.indexProvidingByServiceName(bundleId, doc);
    }
    
    private indexDocById(bundleId: string, doc: ManifestDocument) {
        this.bundleId2manifestIdx.set(bundleId, doc);
    }

    private indexIdByServiceName(bundleId: string, doc: ManifestDocument) {
        doc.getServiceNames().forEach(serviceName => {
            this.servicename2bundleIdIdx.index(serviceName, bundleId);
        });
    }
    private indexProvidesByServiceName(bundleId: string, doc: ManifestDocument) {

        doc.getProvides().forEach(provides => {
            this.servicename2provides.index(provides.value, provides);
        });
    }
    private indexProvidingByServiceName(bundleId: string, doc: ManifestDocument) {
        doc.getProviding().forEach(providing => {
            this.servicename2providing.index(providing.value, providing);
        });
    }
}