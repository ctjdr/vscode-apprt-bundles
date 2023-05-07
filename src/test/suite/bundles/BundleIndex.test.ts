import { fail } from "assert";
import { assert } from "chai";

import { BundleIndex } from "../../../api/bundles/BundleIndex";
import { FileResolver } from "api/bundles/FileResolver";

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

suite("Bundle Index", function () {
    test("Bundle docs found by bundle ID", async function () {

        let resolver: FileResolver = {
            getAllUris: () => Promise.resolve(["file:///a", "file:///b"]),
            resolve: (id) => id === "file:///a" ? Promise.resolve(jsonFile) : Promise.resolve("")
        };

        let index = BundleIndex.create(resolver);

        await index.rebuild();

        assert.equal(index.provideManifest("file:///a")?.name, "abc");
    });

    test("line breaks", function () {
        const numLinesExpected = 6;
        const text = "0123\n456\r\n789\n\n\n";

        const lbOffsets: number[] = [];

        let nextLb = 0;
        while (nextLb !== -1) {
            let lbOffset = text.indexOf("\n", nextLb);
            if (lbOffset !== -1) {
                lbOffsets.push(lbOffset);
                nextLb = lbOffset + 1;
            } else {
                nextLb = lbOffset;
            }
            // Math.min(text.indexOf("\r\n", nextLb), text.indexOf("\n", nextLb));
        }
        console.log(lbOffsets);
    });
});
