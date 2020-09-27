import { assert } from "chai";
import { Selection } from "vscode";
import ManifestDocument, { ReferenceFragment, Section } from "../../../bundles/ManifestDocument";

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
  test("Index built", function () {
  });
});
