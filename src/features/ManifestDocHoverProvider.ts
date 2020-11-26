import * as vscode from "vscode";
import { MarkdownString } from "vscode";
import { DescriptionAggregator } from "./DescriptionAggregator";
import { HighlightCalculator } from "./HighlightCalculator";


export class ManifestDocHoverProvider implements vscode.HoverProvider {


    private calculator: HighlightCalculator;

    constructor(extensionPath: string) {
        const aggregator = new DescriptionAggregator(`${extensionPath}/dist/schemas`);
        this.calculator = new HighlightCalculator(aggregator);
    }

    
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {

        const manifestDocText = document.getText();

        const hoverText = this.calculator.calculateHighlight(manifestDocText, position);

        if (!hoverText) {
            return;
        }

        return new vscode.Hover(new MarkdownString(hoverText));
    }
}

