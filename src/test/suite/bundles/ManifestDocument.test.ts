import { assert } from "chai";
import ManifestDocument, { Section, ValueType } from "../../../api/bundles/ManifestDocument";

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
            "provides": "A2"
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

  test("Bundle name detected", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest?.name, "abc");
  });

  test("Bundle without name gets unknown name", async function () {
    const manifest = await ManifestDocument.fromString(
      `{
        "version": "1.0"
       }`
    );
    assert.isTrue(manifest?.name.startsWith("unknown-name-"));
  });

  test("All components are detected with correct sections", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest?.getComponents().length, 3);
    assert.deepEqual(manifest?.getComponents()[0].getName(), {
      value: "A",
      key: "name",
      section: new Section(
        { line: 5, col: 20 },
        { line: 5, col: 23 }
      ),
      type: ValueType.unknown
    });
    assert.deepEqual(manifest?.getComponents()[1].getName(), {
      value: "B",
      key: "name",
      section: new Section(
        { line: 9, col: 20 },
        { line: 9, col: 23 }
      ),
      type: ValueType.unknown
    });
  });

  test("'provides' elements are detected with correct section", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.deepEqual(manifest?.getComponents()[0].provides("A1"), {
      value: "A1",
      key: "provides",
      section: new Section(
        { line: 6, col: 25 },
        { line: 6, col: 29 }
      ),
      type: ValueType.provides
    });
    assert.deepEqual(manifest?.getComponents()[0].provides("A2"), {
      value: "A2",
      key: "provides",
      section: new Section(
          { line: 6, col: 31 },
          { line: 6, col: 35 }
      ),
      type: ValueType.provides
    });
  });

  test("'providing' element is detected with corect section", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(
      manifest?.getComponents()[2].referencesAskProviding("A2").length,
      1
    );

    assert.deepEqual(manifest?.getReferencesFor("A2").values().next().value.getProviding(), {
      value: "A2",
      key: "providing",
      section: {
        start: { line: 17, col: 33 },
        end: { line: 17, col: 37 }
      },
      type: ValueType.referenceProviding
    });

  });

  test("All components are returned if requested by correct service name", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest?.getComponentsFor("A1").size, 1);
    assert.equal(manifest?.getComponentsFor("A2").size, 2);
    assert.equal(manifest?.getComponentsFor("A3").size, 0);
  });

  test("All references are returned if requested by correct service name", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest?.getReferencesFor("A2").size, 1);
    assert.equal(manifest?.getReferencesFor("A1").size, 0);
  });

  test("All 'provides' elements are returned", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest?.getProvidesFor("A2").size, 2);
  });

  test("All 'providing' elements are returned", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest?.getProvidingFor("A2").size, 1);
  });
  // test("All 'provides' elements are returned if requested by correct service name", async function () {
  //   const manifest = await ManifestDocument.fromString(jsonFile);
  //   assert.equal(manifest.getProvidesFor("A1").size, 1);
  //   assert.equal(manifest.getProvidesFor("A2").size, 1);
  //   assert.equal(manifest.getProvidesFor("B1").size, 1);
  //   assert.equal(manifest.getProvidesFor("A3").size, 0);
  // });

  // test("All 'providing' elements are returned if requested by correct service name", async function () {
  //   const manifest = await ManifestDocument.fromString(jsonFile);
  //   assert.equal(manifest.getProvidingFor("A2").size, 1);
  //   assert.equal(manifest.getProvidingFor("A1").size, 0);
  // });


  test("StringFragment found for line number", async function () {
    const manifest = await ManifestDocument.fromString(jsonFile);
    assert.equal(manifest?.getStringFragmentsOnLine(6)?.size, 2);
    assert.equal(manifest?.getStringFragmentsOnLine(17)?.size, 1);
  });
  
  
});

suite("Section", function () {
 
  test("Location in multiline section detected as contained", async function () {
    const section = new Section(
      { line: 1, col: 5 },
      { line: 3, col: 2 }
    );
    assert.isTrue(section.contains(1, 6));
  });
  test("Location in single section detected as contained", async function () {
    const section = new Section(
      { line: 1, col: 5 },
      { line: 1, col: 8 }
    );
    assert.isTrue(section.contains(1, 5));
  });
  test("Location before section detected as not contained", async function () {
    const section = new Section(
      { line: 1, col: 5 },
      { line: 1, col: 8 }
    );
    assert.isFalse(section.contains(1, 4));
  });
  test("Location after section detected as not contained", async function () {
    const section = new Section(
      { line: 1, col: 5 },
      { line: 3, col: 2 }
    );
    assert.isFalse(section.contains(4, 1));
  });
  
});