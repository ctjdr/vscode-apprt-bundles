
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
