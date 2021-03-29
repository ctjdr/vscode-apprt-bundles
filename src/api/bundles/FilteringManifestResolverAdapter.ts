import { IMinimatch, Minimatch } from "minimatch";
import { URI } from "vscode-uri";
import { ManifestResolver } from "./BundleIndex";


export class FilteringManifestResolverAdapter implements ManifestResolver {

    private globs: IMinimatch[];
    
    constructor(
        private delegate: ManifestResolver,
        exclusionGlobs: string[] = [])
        {
            this.globs = this.getIgnoreMatchers(exclusionGlobs);
        }
        async getAllUris(): Promise<string[]> {
            const uris = await this.delegate.getAllUris();
            if (this.globs.length === 0) {
                return uris;
            }
            return uris.filter(uri => {
                return !this.globs.some(pattern => pattern.match(URI.parse(uri).fsPath));
            });
        }
        resolve(uri: string): Promise<string> {
            return this.delegate.resolve(uri);
        }
        
        setExclusionGlobs(exclusionGlobs: string[]) {
            this.globs = this.getIgnoreMatchers(exclusionGlobs);
        }
        
        private getIgnoreMatchers(exclusionGlobs: string[]) {        
            return exclusionGlobs.map(pattern => new Minimatch(pattern));
        }
        
        
        
    }