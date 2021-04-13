import { allNotMatching } from "../glob";
import { URI } from "vscode-uri";
import { ManifestResolver } from "./BundleIndex";


export class FilteringManifestResolverAdapter implements ManifestResolver {

    constructor(
        private delegate: ManifestResolver,
        private exclusionGlobs: string[] = [])
    {}

    async getAllUris(): Promise<string[]> {
        return allNotMatching(this.exclusionGlobs, await this.delegate.getAllUris(), (uri) => URI.parse(uri).fsPath);
    }

    resolve(uri: string): Promise<string> {
        return this.delegate.resolve(uri);
    }

    setExclusionGlobs(exclusionGlobs: string[]) {
        this.exclusionGlobs = exclusionGlobs;
    }
}