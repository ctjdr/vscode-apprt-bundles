import { assert } from "chai";

import ServiceNameIndex from "../../../api/bundles/ServiceIndex";
import ManifestDocument from "../../../api/bundles/ManifestDocument";

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

const manifestProviderFor = (doc?: ManifestDocument) => {
    return {
        provideManifest(v: string) { 
            return v === "abc" ? doc : undefined;
        }
    };
};

suite("Service Index", function () {
    test("Bundle IDs found by service name", async function () {

        const doc = await ManifestDocument.fromString(jsonFile);
        const serviceIndex = new ServiceNameIndex(manifestProviderFor(doc));
        serviceIndex.index("abc");
        assert.isTrue(serviceIndex.findBundleIdsByServiceName("A1").has("abc"));
    });

    test("'provides' by service name found", async function () {

        const doc = await ManifestDocument.fromString(jsonFile);
        const serviceIndex = new ServiceNameIndex(manifestProviderFor(doc));
        serviceIndex.index("abc");

        assert.equal(serviceIndex.findProvidesFor("A1").length, 1);
        assert.equal(serviceIndex.findProvidesFor("xyz").length, 0);
    });

    test("'providing' by service name found", async function () {

        const doc = await ManifestDocument.fromString(jsonFile);
        const serviceIndex = new ServiceNameIndex(manifestProviderFor(doc));
        serviceIndex.index("abc");

        assert.equal(serviceIndex.findProvidingFor("A2").length, 1);
        assert.equal(serviceIndex.findProvidingFor("xyz").length, 0);
    });
});
