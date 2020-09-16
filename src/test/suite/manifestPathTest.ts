
describe("External manifests", function () {

    const { assert } = require("chai");
    const validate = require("./validate");
    const glob = require("glob");

    it("All manifest files in path specified by env var 'MANIFEST_PATH' ", async function () {
        const path = process.env.MANIFEST_PATH || "./files";
        const manifestFilePaths: string[] = glob.sync(path + "/**/manifest.json");
        const invalidManifests: string[] = [];

        manifestFilePaths.forEach((path) => {
            if (!validate(require(path))) {
                invalidManifests.push(path);
            }
        });

        assert.equal(invalidManifests.length, 0, invalidManifests.length + 
            " invalid manifest(s) found: \n" + 
            invalidManifests.reduce((prev, curr, index, manifests) => prev + "\n" + curr + (index === manifests.length-1?"\n":"")), "");
    });
});
