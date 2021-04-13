import { ManifestResolver } from "../../../api/bundles/BundleIndex";
import { expect } from "chai";
import { FilteringManifestResolverAdapter } from "../../../api/bundles/FilteringManifestResolverAdapter";

class StaticResolver implements ManifestResolver {

    constructor(private uriToContent: Record<string, string>) {
    }

    getAllUris() {
        const uris: string[] = [];
        for (const key in this.uriToContent) {
            uris.push(key);
        }
        return Promise.resolve(uris);
    }

    resolve(uri: string) {
        return Promise.resolve(this.uriToContent[uri]);
    }
};

suite("FilteringManifestResolverAdapter", function () {

  test("Empty exclusion returns all", async function () {

    const staticResolver = new StaticResolver({
        "file:///home/foo/manifest.json": "manifest1"
    });

    const uris = await new FilteringManifestResolverAdapter(staticResolver).getAllUris();

    expect(uris.length).to.equal(1);
  });

  test("Non-matching exclusion filters no items", async function () {
      
      const staticResolver = new StaticResolver({
          "file:///home/foo/manifest.json": "manifest1",
          "file:///home/bar/manifest.json": "manifest2"
        });
        
        const uris = await new FilteringManifestResolverAdapter(staticResolver, ["**/baz/**"]).getAllUris();
        
        expect(uris.length).to.equal(2);
    });
    
    test("Excluding all items results in no URI", async function () {
        
        const staticResolver = new StaticResolver({
            "file:///home/foo/manifest.json": "manifest1",
            "file:///home/bar/manifest.json": "manifest2"
        });

    const uris = await new FilteringManifestResolverAdapter(staticResolver, ["**/home/**"]).getAllUris();

    expect(uris.length).to.equal(0);
  });

  test("Excluding some items results some URIs", async function () {

    const staticResolver = new StaticResolver({
        "file:///home/foo/manifest.json": "manifest1",
        "file:///home/bar/manifest.json": "manifest2"
    });

    const uris = await new FilteringManifestResolverAdapter(staticResolver, ["**/bar/**"]).getAllUris();

    expect(uris.length).to.equal(1);
  });

});
