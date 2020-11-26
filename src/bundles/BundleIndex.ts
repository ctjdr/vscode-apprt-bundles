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

type Event<T> = (cb: ((evt: T) => void), thisArg?:any, disposables?: Array<Disposable>) => Disposable;

type Emitter<T> = {
    event: Event<T>;
    fire(data?: T): void;
};

const nullEvent: Event<any> = () => {
    return {
        dispose(){}
    };
};


export class BundleIndex implements Disposable {
    
    private manifestProvider: ManifestResolver;
    
    private uri2manifestIdx: Map<string, ManifestDocument> = new Map();
    private servicename2uriIdx: MultiValueIndex<string, string> = new MultiValueIndex();

    private onIndexUpdatedEmitter: Emitter<void>;
    private dirtyIds: Set<string> = new Set();
    private dirtyRunner?: AsynRunner;
    public onIndexUpdated: Event<void>;
    
    private handleDirtyIds = async () => {        
        if (this.dirtyIds.size === 0 ) {
            //no new dirty IDs, task can be suspended
            return {suspend: true};
        }
        console.info(`dirt: ${this.dirtyIds.size} docs dirty. Cleaning docs. ${new Date().toISOString()}`);
        await this.updateDirty();
        this.onIndexUpdatedEmitter.fire(undefined);
        return {
            suspend: false
        };
    };
    private constructor(manifestProvider: ManifestResolver, updateEmitter?: Emitter<void>) {
        this.onIndexUpdatedEmitter = updateEmitter || {event: nullEvent, fire(){}};
        this.onIndexUpdated = updateEmitter?.event ?? nullEvent;
        this.manifestProvider = manifestProvider;
    }    
    
    static createDefault(updateEmitter?: Emitter<void>): BundleIndex {
        const workspaceManifestProvider = require("./WorkspaceManifestResolver");
        return new BundleIndex(new workspaceManifestProvider.WorkspaceManifestProvider(), updateEmitter);
    }
    
    static create(manifestProvider: ManifestResolver, updateEmitter?: Emitter<void>): BundleIndex {
        return new BundleIndex(manifestProvider, updateEmitter);
    }
    
    public async rebuild(): Promise<number> {
        
        // TODO: Should clear index maps before rebuilding
        
        let ids = await this.manifestProvider.getAllUris();
        
        for (const id of ids) {
            await this.updateSingle(id);
        }
        
        this.onIndexUpdatedEmitter.fire(undefined);
        
        this.dirtyRunner = new AsynRunner(this.handleDirtyIds);
        this.dirtyRunner.start();
        return Promise.resolve(ids.length);
        
    }
    
    private async updateSingle(bundleId: string) {
        let doc = await this.manifestProvider.resolve(bundleId.toString());
        const manifestDoc = await ManifestDocument.fromString(doc);
        // TODO: This doesn't clean index servicenames->bundleIds correctly: 
        // What if a bundle does not reference a service name any more? The entry is kept although it should be deleted.
        this.indexManifestDoc(bundleId.toString(), manifestDoc);
    }
    
    public markDirty(bundleId: string):void {
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
