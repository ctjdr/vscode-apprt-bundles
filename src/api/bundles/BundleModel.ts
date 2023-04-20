
export {
    Bundle
};

class Bundle {
    
    constructor(
        public uri: string,
        public name: string,

        /** The folder(s) containing the the bundle.
         * 
         * If the bundle is located in `src/main/js/foo-bundles/mybundle/manifest.json`,
         * this would be `foo-bundles`.
         * 
         * 
         */
        public folder: string,
    ) {}

}

