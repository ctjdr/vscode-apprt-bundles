import { allNotMatching } from "../glob";
import { URI } from "vscode-uri";
import { FileResolver } from "./BundleIndex";


export class FilteringFileResolverAdapter implements FileResolver {

    constructor(
        private delegate: FileResolver,
        private exclusionGlobs: string[] = [])
    {}

    async getAllUris(filesGlob?: string): Promise<string[]> {
        return allNotMatching(this.exclusionGlobs, await this.delegate.getAllUris(filesGlob), (uri) => URI.parse(uri).fsPath);
    }

    resolve(uri: string): Promise<string> {
        return this.delegate.resolve(uri);
    }

    setExclusionGlobs(exclusionGlobs: string[]) {
        this.exclusionGlobs = exclusionGlobs;
    }
}