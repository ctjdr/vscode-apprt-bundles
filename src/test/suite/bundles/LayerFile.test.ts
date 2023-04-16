import { expect } from "chai";
import { LayerFile } from "../../../api/bundles/LayerFile";

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

        const layerFile = LayerFile.parseContent(moduleJs, "");
        expect(layerFile.findSource("ComponentImpl")?.source).to.equal("./ComponentImpl");
        expect(layerFile.findSource("vz/tools/Tool")?.source).to.equal("vz/tools/Tool");
  });
    test("Exports detected", async function () {

        const layerFile = LayerFile.parseContent(moduleJs, "");
        const componentConfig = layerFile.findSource("Config");
        const componentFoo = layerFile.findSource("Foo");
        const componentBaz = layerFile.findSource("Baz");

        expect(componentConfig?.source).to.equal("./SearchFactory");
        expect(componentConfig?.nameRange).to.eql({start: 27, end: 33});
        expect(componentFoo?.source).to.equal("./SearchUiService");
        expect(componentBaz?.source).to.equal("./TemplateLayout");
  });
});


