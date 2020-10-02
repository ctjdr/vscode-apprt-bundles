import { fail } from "assert";
import { assert } from "chai";

import { ManifestIndex, ManifestResolver } from "../../../bundles/ManifestIndex";

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

suite("Manifest Index", function () {
  test("Bundle IDs found by service name", async function () {

    let provider: ManifestResolver = {
        getAllIds: () =>  Promise.resolve(["a", "b"]),
        resolve: (id) => id === "a" ? Promise.resolve(jsonFile): Promise.resolve("")
    };

     let index = ManifestIndex.create(provider);
     
     await index.update();
     assert.isTrue(index.findBundleIdsByServiceName("A1").has("a"));
  });
  test("Bundle docs found by bundle ID", async function () {

    let provider: ManifestResolver = {
        getAllIds: () =>  Promise.resolve(["a", "b"]),
        resolve: (id) => id === "a" ? Promise.resolve(jsonFile): Promise.resolve("")
    };

     let index = ManifestIndex.create(provider);
     
     await index.update();
     assert.equal(index.findBundleById("a")?.name, "abc");
  });

  test("line breaks", function() {
    const numLinesExpected = 6;
    const text = "0123\n456\r\n789\n\n\n";

    const lbOffsets:number[] = [];

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
