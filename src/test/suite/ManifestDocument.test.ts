import { assert } from "chai";
import ManifestDocument from '../../ManifestDocument';

const jsonFile = `{
    "name": "abc",
    "version": "1.0",
    "components": [
        {
            "name": "A",
            "provides": ["A1", "A2"]
        },
        {
            "name": "B",
            "provides": "B1"
        },
        {
            "name": "R",
            "references": [
                {
                    "name": "member_R1",
                    "providing": "A2"
                }
            ]
        }
    ]
}`;



suite("JSON Tree", function () {

    test("Components names with offset", function () {
        const manifest = ManifestDocument.fromString(jsonFile);
        assert.equal(manifest.getComponents().length, 3);
        assert.deepEqual(manifest.getComponents()[0].getName(), {value: "A", offset: 93});
        assert.deepEqual(manifest.getComponents()[1].getName(), {value: "B", offset: 176});
    });

    test("Component provides with offset", function () {
        const manifest = ManifestDocument.fromString(jsonFile);
        assert.deepEqual(manifest.getComponents()[0].provides("A1"), { value: "A1", offset: 123});
    });

    test("Reference providing with offset", function () {
        const manifest = ManifestDocument.fromString(jsonFile);
        // assert.deepEqual(manifest.getComponents()[3].getReferences().length, 1);
    });

});
