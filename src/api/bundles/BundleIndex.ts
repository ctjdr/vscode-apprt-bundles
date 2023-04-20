import { URI } from "vscode-uri";
import ManifestDocument from "./ManifestDocument";
import ServiceNameIndex from "./ServiceIndex";

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

    private manifestUriToManifestDoc: Map<string, ManifestDocument> = new Map();
    private serviceNameIndex  = new ServiceNameIndex( (u) => this.findBundleByUri(u) );

    private dirtyIds: Set<string> = new Set();
    private dirtyRunner?: AsyncRunner;

    private constructor(private fileResolver: FileResolver) {
    }


    public static create(fileResolver: FileResolver): BundleIndex {
        return new BundleIndex(fileResolver);
    }

    public async rebuild(): Promise<number> {
        this.cleanCache();

        let manifestUris = await this.fileResolver.getAllUris("**/manifest.json");

        for (const manifestUri of manifestUris) {
            await this.updateSingle(manifestUri);
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
        return Promise.resolve(manifestUris.length);

    }

    private cleanCache() {
        this.dirtyIds.clear();
        this.serviceNameIndex.clearAll();
        this.manifestUriToManifestDoc.clear();
    }

    private async updateSingle(manifestUri: string) {
        let doc = await this.fileResolver.resolve(manifestUri);
        const manifestDoc = await ManifestDocument.fromString(doc);
        // TODO: This doesn't clean index servicenames->bundleIds correctly: 
        // What if a bundle does not reference a service name any more? The entry is kept although it should be deleted.
        if (manifestDoc) {
            this.indexDocById(manifestUri, manifestDoc);
            this.serviceNameIndex.index(manifestUri);
    
        }
    }

    public markDirty(manifestUri: URI): void {
        //Todo: check if bundleId is tracked.
        const preSize = this.dirtyIds.size;
        this.dirtyIds.add(manifestUri.toString());
        if (preSize === 0) {
            this.dirtyRunner?.resume();
        }
    }
    public assertClean(manifestUri: URI, timeout: number = 2000): Promise<any> {
        if (this.dirtyIds.size === 0 || !this.dirtyIds.has(manifestUri.toString())) {
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
        for (let manifestUri of this.dirtyIds) {
            this.serviceNameIndex.clearForManifest(manifestUri);
            await this.updateSingle(manifestUri);
        }
        this.dirtyIds.clear();
    }

    public getBundles() {
        return this.manifestUriToManifestDoc.entries();
    }

    /**
     * @deprecated use  {@link findBundle} instead
     * @param manifestUri
     * @returns 
     */
    public findBundleByUri(manifestUri: string): ManifestDocument | undefined {
        return this.manifestUriToManifestDoc.get(manifestUri);
    }

    public findBundle(manifestUri: URI): ManifestDocument | undefined {
        return this.manifestUriToManifestDoc.get(manifestUri.toString());
    }


    private indexDocById(bundleId: string, doc: ManifestDocument) {
        this.manifestUriToManifestDoc.set(bundleId, doc);
    }


    public getServiceNameIndex() {
        return this.serviceNameIndex;
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
