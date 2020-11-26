import { fail } from "assert";
import { assert } from "chai";
import * as fs from "fs";
import { DescriptionAggregator } from "../../../features/DescriptionAggregator";
import { HighlightCalculator } from "../../../features/HighlightCalculator";

suite("HighlightCalculator", function () {
  test("calculated hover equals description of manifest schema for that element", function () {

        const manfestText = fs.readFileSync(process.cwd() + "/src/test/suite/files/manifest.json", "utf8");

        const provider = new HighlightCalculator(new DescriptionAggregator("dist/schemas"));
        const hover = provider.calculateHighlight(manfestText, {line: 9, character: 18});
        assert.equal(hover, "An array of references to other services registered in the runtime.");

  });
});
