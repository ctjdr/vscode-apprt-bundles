import { URI } from "vscode-uri";
import ManifestDocument from "./ManifestDocument";
import ServiceIndex from "./ServiceIndex";

export interface FileResolver {
    /**
     * @returns a list of URIs pointing to manifest.json documents.
     */
    getAllUris(filesGlob?: string): Promise<string[]>;

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

    private uriToManifest: Map<string, ManifestDocument> = new Map();
    private serviceIndexInstance  = new ServiceIndex( (u) => this.findBundleByUri(u) );

    private dirtyIds: Set<string> = new Set();
    private dirtyRunner?: AsyncRunner;

    private constructor(private fileResolver: FileResolver) {
    }


    public static create(fileResolver: FileResolver): BundleIndex {
        return new BundleIndex(fileResolver);
    }

    public async rebuild(): Promise<number> {
        this.cleanCache();

        let ids = await this.fileResolver.getAllUris("**/manifest.json");

        for (const id of ids) {
            await this.updateSingle(id);
        }

        const handleDirtyIds = async () => {
            if (this.dirtyIds.size === 0) {
                //no new dirty IDs, task can be suspended
                return { suspend: true };
            }
            console.info(`dirt: ${this.dirtyIds.size} docs dirty. Cleaning docs. ${new Date().toISOString()}`);
            await this.updateDirty();
            return {
                suspend: false
            };
        };

        this.dirtyRunner = new AsyncRunner(handleDirtyIds);
        this.dirtyRunner.start();
        return Promise.resolve(ids.length);

    }

    private cleanCache() {
        this.dirtyIds.clear();
        this.serviceIndexInstance.clear();
        this.uriToManifest.clear();
    }

    private async updateSingle(bundleId: string) {
        let doc = await this.fileResolver.resolve(bundleId);
        const manifestDoc = await ManifestDocument.fromString(doc);
        // TODO: This doesn't clean index servicenames->bundleIds correctly: 
        // What if a bundle does not reference a service name any more? The entry is kept although it should be deleted.
        if (manifestDoc) {
            this.indexDocById(bundleId, manifestDoc);
            this.serviceIndexInstance.index(bundleId);
    
        }
    }

    public markDirty(bundleId: string): void {
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
            this.serviceIndexInstance.cleanupServiceNames(id.toString());
            await this.updateSingle(id);
        }
        this.dirtyIds.clear();
    }

    public getBundles() {
        return this.uriToManifest.entries();
    }

    /**
     * @deprecated use  {@link findBundle} instead
     * @param manifestUri
     * @returns 
     */
    public findBundleByUri(manifestUri: string): ManifestDocument | undefined {
        return this.uriToManifest.get(manifestUri);
    }

    public findBundle(manifestUri: URI): ManifestDocument | undefined {
        return this.uriToManifest.get(manifestUri.toString());
    }


    private indexDocById(bundleId: string, doc: ManifestDocument) {
        this.uriToManifest.set(bundleId, doc);
    }


    public getServiceIndex() {
        return this.serviceIndexInstance;
    }

    dispose(): void {
        if (this.dirtyRunner) {
            this.dirtyRunner.destroy();
        }
    }

}

class AsyncRunner {

    private timer: NodeJS.Timeout | null = null;

    constructor(private task: () => Promise<{ suspend: boolean }>, private delay = 2000) {
    }

    start() {
        if (this.timer !== null) {
            //is already running
            return;
        }
        this.timer = setTimeout(this.runTask, 0, this);
    }

    async forceRun(): Promise<void> {
        return this.runTask(this);
    }

    resume() {
        this.start();
    }

    private async runTask(that: any) {
        if (!(that instanceof AsyncRunner)) {
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
