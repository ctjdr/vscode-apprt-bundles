import ManifestDocument from "./ManifestDocument";

export default interface ManifestProvider {

    //TODO Make async
    provideManifest(manifestUri: string): ManifestDocument | undefined;
}
