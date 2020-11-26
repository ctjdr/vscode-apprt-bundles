import * as json from 'jsonc-parser';
import ManifestDocument from "../bundles/ManifestDocument";
import { DescriptionAggregator } from "./DescriptionAggregator";

export class HighlightCalculator {

    constructor(private descriptionAggregator: DescriptionAggregator) {
    }

    calculateHighlight(manifestDocText: string, position: { line: number; character: number; }, node?: json.Node): string | undefined {
        const t0 = new Date().getTime();
        //T10_START Mostly takes < 1ms for a manifest of 900 lines
        const lbOffsets = ManifestDocument.calcLineBreakOffsets(manifestDocText);
        const offset = lbOffsets[position.line - 1] + position.character + 1;
        //T10_END
        
        //T15_START Takes about 1 ms for elements at the first few lines, about 8 ms for elements at the end of a 900 line manifest
        const location = json.getLocation(manifestDocText, offset);
        const nodePath = location.path;
        //T15_END
        
        let hoverText = this.descriptionAggregator.findDescription(nodePath);
        if (hoverText === undefined) {
            //T20_START Takes about 40 to 70 ms for a manifest of 900 lines
            const node = json.parseTree(manifestDocText);
            const realJson = json.getNodeValue(node);
            this.descriptionAggregator.create(realJson);
            hoverText = this.descriptionAggregator.findDescription(nodePath, "");
            //T20_END Takes about 40 to 70 ms for a manifest of 900 lines
        } 

        return hoverText;

    }
}
