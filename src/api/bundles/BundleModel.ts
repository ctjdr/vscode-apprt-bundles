
export {
    Bundle,
    BundleDetails
};

class Bundle {
    
    constructor(
        public uri: string,
        public name: string,
        public shortPath: string,
        public shortManifestPath: string
    ) {}

}


class BundleDetails {
    constructor() {}
}