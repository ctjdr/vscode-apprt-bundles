import { assert } from "chai";
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

suite("ManifestDocument", function () {
  
  test("Bundle name", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest.name, "abc");
  });
  
  test("Bundle without name", async function () {
    const manifest = await ManifestDocument.fromString(
      `{
        "version": "1.0"
       }`
    );
    assert.equal(manifest.name, "unknown-name-0");
  });

  test("Component names with offset", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest.getComponents().length, 3);
    assert.deepEqual(manifest.getComponents()[0].getName(), {
      value: "A",
      key: "name",
      // section: new Section(93 ,3, 5, 5)
      section: {
        start: {line: 5, col: 20},
        end: {line: 5, col: 23}
      }
    });
    assert.deepEqual(manifest.getComponents()[1].getName(), {
      value: "B",
      key: "name",
      // section: new Section(176, 3, 9, 9)
      section: {
        start: {line: 9, col: 20},
        end: {line: 9, col: 23}
      }
    });
  });

  test("Component provides with offset", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.deepEqual(manifest.getComponents()[0].provides("A1"), {
      value: "A1",
      key: "provides",
      // section: new Section(123, 4, 6, 6)
      section: {
        start: {line: 6, col: 25},
        end: {line: 6, col: 29}
      }
    });
    assert.deepEqual(manifest.getComponents()[0].provides("A2"), {
      value: "A2",
      key: "provides",
      // section: new Section(129, 4, 6, 6)
      section: {
        start: {line: 6, col: 31},
        end: {line: 6, col: 35}
      }

    });
  });

  test("Reference providing with offset", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(
      manifest.getComponents()[2].referencesAskProviding("A2").length,
      1
    );

    assert.deepEqual(manifest.getAllProviding("A2").values().next().value.getProviding(), {
      value: "A2",
      key: "providing",
      section: {
        start: {line: 17, col: 33},
        end: {line: 17, col: 37}
      }

    });

  });

  test("All component with provides for a certain service interface", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest.getAllProvides("A1").size, 1);
    assert.equal(manifest.getAllProvides("A2").size, 1);
    assert.equal(manifest.getAllProvides("A3").size, 0);
  });

  test("All references with providing for a certain service interface", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest.getAllProviding("A2").size, 1);
    assert.equal(manifest.getAllProviding("A1").size, 0);
  });





  test("Reference can be located", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    const reference = manifest.getAllProviding("A2").values().next();
    const ref: ReferenceFragment = reference.value;
    // const startIndex = ref.getProviding()?.section.offset || 0;
    // const length = ref.getProviding()?.section.length || 0;
    // const onlineJson = jsonFile.replace(/\n/g, " ");
    // assert.equal(onlineJson.substring(startIndex, startIndex + length), `"A2"`);
  });
});
