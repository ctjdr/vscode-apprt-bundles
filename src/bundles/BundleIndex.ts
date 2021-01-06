import { FilteringManifestResolverAdapter } from "./FilteringManifestResolverAdapter";
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

type Disposable = {
    dispose(): void;
};


export class BundleIndex implements Disposable {
    
    private manifestProvider: FilteringManifestResolverAdapter;
    
    private uri2manifestIdx: Map<string, ManifestDocument> = new Map();
    private servicename2uriIdx: MultiValueIndex<string, string> = new MultiValueIndex();

    private dirtyIds: Set<string> = new Set();
    private dirtyRunner?: AsynRunner;
    
    private handleDirtyIds = async () => {        
        if (this.dirtyIds.size === 0 ) {
            //no new dirty IDs, task can be suspended
            return {suspend: true};
        }
        console.info(`dirt: ${this.dirtyIds.size} docs dirty. Cleaning docs. ${new Date().toISOString()}`);
        await this.updateDirty();
        return {
            suspend: false
        };
    };
    private constructor(manifestProvider: ManifestResolver) {
        this.manifestProvider = new FilteringManifestResolverAdapter(manifestProvider);
    }    
    
    static createDefault(): BundleIndex {
        const workspaceManifestProvider = require("./WorkspaceManifestResolver");
        return new BundleIndex(new workspaceManifestProvider.WorkspaceManifestProvider());
    }
    
    static create(manifestProvider: ManifestResolver): BundleIndex {
        return new BundleIndex(manifestProvider);
    }
    
    public async rebuild(): Promise<number> {
        this.cleanCache();
        
        let ids = await this.manifestProvider.getAllUris();
        
        for (const id of ids) {
            await this.updateSingle(id);
        }
        
        this.dirtyRunner = new AsynRunner(this.handleDirtyIds);
        this.dirtyRunner.start();
        return Promise.resolve(ids.length);
        
    }

    private cleanCache() {
        this.dirtyIds.clear();
        this.servicename2uriIdx.clear();
        this.uri2manifestIdx.clear();
    }

    public setBundleExclusions(exclusionGlobs: string[]) {
        this.manifestProvider.setExclusionGlobs(exclusionGlobs);
    }
    
    private async updateSingle(bundleId: string) {
        let doc = await this.manifestProvider.resolve(bundleId.toString());
        const manifestDoc = await ManifestDocument.fromString(doc);
        // TODO: This doesn't clean index servicenames->bundleIds correctly: 
        // What if a bundle does not reference a service name any more? The entry is kept although it should be deleted.
        this.indexManifestDoc(bundleId.toString(), manifestDoc);
    }
    
    public markDirty(bundleId: string):void {
        //Todo: check if bundleId is tracked.
        const preSize = this.dirtyIds.size;
        this.dirtyIds.add(bundleId);
        if (preSize === 0) {
            this.dirtyRunner?.resume();
        }
    }
    public assertClean(bundleId: string, timeout: number = 2000): Promise<any> {
        if (this.dirtyIds.size === 0 || !this.dirtyIds.has(bundleId)) {
            return Promise.resolve();
        }

        return Promise.race(
            [
                this.dirtyRunner?.forceRun(),
                new Promise((resolve, reject) => {
                    setTimeout(() => reject(), timeout);
                })
            ]
        );
    }

    private async updateDirty(): Promise<void> {
        for (let id of this.dirtyIds) {
            this.cleanupServiceNames(id.toString());
            await this.updateSingle(id);
        }
        this.dirtyIds.clear();
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

    private cleanupServiceNames(bundleId: string) {
        this.servicename2uriIdx.invalidateValue(bundleId);
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

    dispose(): void {
        if (this.dirtyRunner) {
            this.dirtyRunner.destroy();
        }
    }

}

class AsynRunner  {

    private timer: NodeJS.Timeout | null = null;

    constructor(private task: () => Promise<{suspend: boolean}>, private delay = 2000) {
    }
    
    start() {
        if (this.timer !== null) {
            //is already running
            return;
        }        
        this.timer = setTimeout(this.runTask, 0, this);
    }

    async forceRun():Promise<void> {
        return this.runTask(this);
    }

    resume() {
        this.start();
    }

    private async runTask(that:any) {
        if (!(that instanceof AsynRunner)) {
            return;
        }
       const { suspend } = await that.task();
       if (suspend) {
           if (that.timer !== null) {
               clearTimeout(that.timer);
               that.timer = null;
           }
           return;
        }
        
        that.timer = setTimeout(that.runTask, that.delay, that);
    }

    stop() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
        }
        this.timer === undefined;
    }

    destroy() {
        this.stop();
        this.task === undefined;
    }
}
