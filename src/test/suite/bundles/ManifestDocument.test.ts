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
  test("Component names with offset", function () {
    const manifest = ManifestDocument.fromString(jsonFile);
    assert.equal(manifest.getComponents().length, 3);
    assert.deepEqual(manifest.getComponents()[0].getName(), {
      value: "A",
      key: "name",
      section: new Section(93 ,3)
    });
    assert.deepEqual(manifest.getComponents()[1].getName(), {
      value: "B",
      key: "name",
      section: new Section(176, 3)
    });
  });

  test("Component provides with offset", function () {
    const manifest = ManifestDocument.fromString(jsonFile);
    assert.deepEqual(manifest.getComponents()[0].provides("A1"), {
      value: "A1",
      key: "provides",
      section: new Section(123, 4)
    });
    assert.deepEqual(manifest.getComponents()[0].provides("A2"), {
      value: "A2",
      key: "provides",
      section: new Section(129, 4)
    });
  });

  test("Reference providing with offset", function () {
    const manifest = ManifestDocument.fromString(jsonFile);
    assert.equal(
      manifest.getComponents()[2].referencesAskProviding("A2").length,
      1
    );
  });

  test("All component with provides for a certain service interface", function () {
    const manifest = ManifestDocument.fromString(jsonFile);
    assert.equal(manifest.getAllProvides("A1").size, 1);
    assert.equal(manifest.getAllProvides("A2").size, 1);
    assert.equal(manifest.getAllProvides("A3").size, 0);
  });

  test("All references with providing for a certain service interface", function () {
    const manifest = ManifestDocument.fromString(jsonFile);
    assert.equal(manifest.getAllProviding("A2").size, 1);
    assert.equal(manifest.getAllProviding("A1").size, 0);
  });





  test("Reference can be located", function () {
    const manifest = ManifestDocument.fromString(jsonFile);
    const reference = manifest.getAllProviding("A2").values().next();
    const ref: ReferenceFragment = reference.value;
    const startIndex = ref.getProviding()?.section.offset || 0;
    const length = ref.getProviding()?.section.length || 0;
    const onlineJson = jsonFile.replace(/\n/g, " ");
    console.info(onlineJson.substring(startIndex, startIndex + length));
  });
});
