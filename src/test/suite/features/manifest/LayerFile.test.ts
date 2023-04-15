import { expect } from "chai";
import { LayerFile } from "../../../../features/manifest/LayerFile";

const moduleJs = 
`
export { SearchFactory as Config, Bar} from "./SearchFactory";
export {SearchUiServiceImpl, Foo} from "./SearchUiService";
export { default as Baz } from "./TemplateLayout";
export * from "module-name";

import "./ComponentImpl";
import "vz/tools/Tool";
const a = 1;
`;

suite("LayerFile", function () {
    test("Imports detected", async function () {

        const layerFile = LayerFile.parseContent(moduleJs);
        expect(layerFile.findSource("ComponentImpl")).to.equal("./ComponentImpl");
        expect(layerFile.findSource("vz/tools/Tool")).to.equal("vz/tools/Tool");
  });
    test("Exports detected", async function () {

        const layerFile = LayerFile.parseContent(moduleJs);
        expect(layerFile.findSource("Config")).to.equal("./SearchFactory");
        expect(layerFile.findSource("Foo")).to.equal("./SearchUiService");
        expect(layerFile.findSource("Baz")).to.equal("./TemplateLayout");
  });
});


