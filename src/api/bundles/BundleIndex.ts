import { URI } from "vscode-uri";
import ManifestDocument from "./ManifestDocument";
import { FileResolver } from "./FileResolver";
import ManifestProvider from "./ManifestProvider";
import { EventEmitter } from "events";

type Disposable = {
    dispose(): void;
};

enum Events {
    didIndexManifest = "didIndexManifest",
    didInvalidateIndex = "didInvalidateIndex",
    willRebuildIndex = "willRebuildIndex",
    didRebuildIndex = "didRebuildIndex"
};


export class BundleIndex implements Disposable, ManifestProvider {

    private manifestEvents = new EventEmitter();

    private manifestUriToManifestDoc: Map<string, ManifestDocument> = new Map();

    private dirtyIds: Set<string> = new Set();
    private dirtyRunner?: AsyncRunner;

    private constructor(private fileResolver: FileResolver) {
    }

    public onDidIndexManifest(listener: (uri: string) => void) {
        this.manifestEvents.on(Events.didIndexManifest, listener);
    }

    public onDidInvalidateIndex(listener: () => void) {
        this.manifestEvents.on(Events.didInvalidateIndex, listener);
    }

    public onDidRebuildIndex(listener: () => void) {
        this.manifestEvents.on(Events.didRebuildIndex, listener);
    }

    public onWillRebuildIndex(listener: (tracker: Promise<number> ) => void) {
        this.manifestEvents.on(Events.willRebuildIndex, listener);
    }

    public static create(fileResolver: FileResolver): BundleIndex {
        return new BundleIndex(fileResolver);
    }

    public async rebuild(): Promise<number> {
        // const indexResolver = (count: number | PromiseLike<number>) => count;
        
        // const foo = new Promise<number>(indexResolver);
        const rebuildPromise = this.doRebuild();
        this.manifestEvents.emit(Events.willRebuildIndex, rebuildPromise);
        return rebuildPromise;

    }

    private async doRebuild() {
        this.cleanIndex();
        // this.manifestEvents.emit(Events.willRebuildIndex);

        let manifestUris = await this.fileResolver.getAllUris("**/manifest.json");

        for (const manifestUri of manifestUris) {
            await this.updateSingle(manifestUri);
        }

        this.manifestEvents.emit(Events.didRebuildIndex);

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

    public getAllManifests() {
        return this.manifestUriToManifestDoc.entries();
    }

    public provideManifest(manifestUri: string): ManifestDocument | undefined {
        return this.manifestUriToManifestDoc.get(manifestUri);
    }

    public async markDirty(manifestUri: URI): Promise<void> {
        //Todo: check if bundleId is tracked.
        const preSize = this.dirtyIds.size;
        this.dirtyIds.add(manifestUri.toString());
        if (preSize === 0) {
            this.dirtyRunner?.resume();
        }
    }
    public async assertClean(manifestUri: URI, timeout: number = 2000): Promise<any> {
        if (this.dirtyIds.size === 0 || !this.dirtyIds.has(manifestUri.toString())) {
            return Promise.resolve();
        }

        return Promise.race(
            [
                this.dirtyRunner?.forceRun(),
                new Promise((resolve, reject) => {
                    setTimeout(() => {
                        console.debug("Dirt race timed out");
                        reject();
                    }, timeout);
                })
            ]
        );
    }

    private cleanIndex() {
        this.dirtyIds.clear();
        this.manifestUriToManifestDoc.clear();
        this.manifestEvents.emit(Events.didInvalidateIndex);
    }

    private async updateSingle(manifestUri: string) {
        let doc = await this.fileResolver.resolve(manifestUri);
        const manifestDoc = await ManifestDocument.fromString(doc);
        // TODO: This doesn't clean index servicenames->bundleIds correctly: 
        // What if a bundle does not reference a service name any more? The entry is kept although it should be deleted.
        if (manifestDoc) {
            this.indexDocById(manifestUri, manifestDoc);
            this.manifestEvents.emit(Events.didIndexManifest, manifestUri);

        }
    }

    private async updateDirty(): Promise<void> {
        for (let manifestUri of this.dirtyIds) {
            await this.updateSingle(manifestUri);
        }
        this.dirtyIds.clear();
    }

    private indexDocById(manifestUri: string, doc: ManifestDocument) {
        this.manifestUriToManifestDoc.set(manifestUri, doc);
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
        console.debug("BundleIndex: Forced run.");
        return this.runTask(this).then(() => console.debug("BundleIndex: Forced run ready."));
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
