import { findNodeAtLocation, modify, parseTree } from "jsonc-parser";
import * as vscode from "vscode";


export {
    DeprecationQuickFixProvider
};

class DeprecationQuickFixProvider implements vscode.CodeActionProvider<DeprecationFixCodeAction> {

    constructor() {
        vscode.commands.registerCommand("apprtbundles.manifest.snippet.insertAtRange", async (opts) => {
            const doc: vscode.TextDocument = opts.doc;
            const range: vscode.Range = opts.range;
            const snippet: string = opts.snippet;
            const editor = await vscode.window.showTextDocument(doc.uri);
            editor.insertSnippet(new vscode.SnippetString(snippet), range as vscode.Range);
        });
    }

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(DeprecationFixCodeAction | vscode.Command)[]> {
        console.info(`${context.only?.value} -- #diagnostics: ${context.diagnostics.length} -- Range lines ${range.start.line}, ${range.end.line}`);

        const actions: DeprecationFixCodeAction[] = [];
        const diagnostics = context.diagnostics;

        if (diagnostics.length === 0) {
            return [];
        }
        
        for (const diagnostic of diagnostics) {

            const diagnosticCode = typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code;
            if (diagnosticCode !== 2) {
                // Code '2' is what VS Code uses as "ErrorCode" for deprecated JSON schema elements.
                // See https://github.com/microsoft/vscode-json-languageservice/blob/07fec3faafa3f32915dcd6fcc6999a91ad113f88/src/parser/jsonParser.ts#L546
                return;
            }

            const deprecation = Deprecation.from(diagnostic.message);

            if (!deprecation) {
                continue;
            }

            const fix = this.createFix(deprecation, document, diagnostic.range);
            if (!fix) {
                return;
            }
            
            const action = new DeprecationFixCodeAction(fix);
            action.diagnostics = [diagnostic];
            actions.push(action);
        }
        
        // if (vscode.languages.getDiagnostics(document.uri).length > 1) {
        //     actions.push(
        //         new DeprecationFixCodeAction()
        //         new vscode.CodeAction("Fix all deprecated properties in this file", {
        //             actions: actions
        //         })
        //     );                
        // }
        return actions;
    }

    private createFix(deprecation: Deprecation, doc: vscode.TextDocument, docRange: vscode.Range): DeprecationFix | undefined {
        if (deprecation.deprecationKind === DeprecationKind.newPropertyName) {
            return new RenameDeprecationFix(deprecation, doc, docRange);
        } 
        else if (deprecation.deprecationKind === DeprecationKind.licenseToArray) {
            return new LicenseDeprecationFix(deprecation, doc, docRange);
        }
        return;
    }


    resolveCodeAction(codeAction: DeprecationFixCodeAction, token: vscode.CancellationToken): vscode.ProviderResult<DeprecationFixCodeAction> {
        codeAction.calculateEdit();
        return codeAction;
    }
}

class DeprecationFixCodeAction extends vscode.CodeAction {
    
    constructor(private readonly fix: DeprecationFix) {
        super(fix.calculateFixMessage(), vscode.CodeActionKind.QuickFix);
        this.command = fix.getCommand();
        this.isPreferred = true;
    }
    
    calculateEdit() {
        this.edit = this.fix.calculateEdit();
    }
}

enum DeprecationKind {
    newPropertyName = "newPropertyName",
    valueToArray = "valueToArray",
    licenseToArray = "licenseToArray",
    unknown = "unknown"
}

const deprecationKindReverseMap: Record<string, DeprecationKind>  = {
    "1": DeprecationKind.newPropertyName,
    "2": DeprecationKind.valueToArray,
    "42": DeprecationKind.licenseToArray
};

/**
 * Metadata (message and deprecation kind) for a single deprecation warning.
 * @param  {string} userMessage
 * @param  {DeprecationKind[]} privatedeprecationKinds
 */
class Deprecation {

    private static messageRegex = /^(.*)\[manifest\((\d+(?:,\d+)*)\)\]$/;

    private constructor(
        public readonly userMessage: string,
        public readonly deprecationKind: DeprecationKind
    ) {}

    static from(message: string): Deprecation | undefined {

        const messageRegexResult = Deprecation.messageRegex.exec(message);
        
        if (!messageRegexResult) {
            return;
        }

        const userMessage = messageRegexResult[1];
        const deprecationCode = messageRegexResult[2];
        const deprecationKind =  deprecationKindReverseMap[deprecationCode] ?? DeprecationKind.unknown;

        return new Deprecation(userMessage, deprecationKind);
    }

}

interface DeprecationFix {
    calculateFixMessage(): string;
    getCommand(): vscode.Command | undefined;
    calculateEdit(): vscode.WorkspaceEdit;
    //TODO: canFix(dep, doc range): boolean
}

class LicenseDeprecationFix implements DeprecationFix {
    
    
    constructor(
        private deprecation: Deprecation, 
        private doc: vscode.TextDocument,
        private range: vscode.Range
    ) {}
    
    getCommand(): vscode.Command | undefined {

        const oldPropNodeText = this.doc.getText(this.range);
        const oldPropNode = parseTree(`{${oldPropNodeText}}`);

        const propValNode = findNodeAtLocation(oldPropNode, ["Bundle-License"]);
        if (propValNode?.type !== "string") {
            return;
        }
        const licenseText = propValNode.value;


        return {
            command: "apprtbundles.manifest.snippet.insertAtRange",
            title: "Insert snippet at range",
            arguments: [
                {
                    snippet: `"licenses": [\n\t{\n\t\t"type": "${licenseText}",\n\t\t"url": ""\n\t}\n]`,
                    doc: this.doc,
                    range: this.range
                }
            ]
        };
    }
    
    calculateFixMessage(): string {
        return "Convert to 'licenses' array";
    }
    calculateEdit(): vscode.WorkspaceEdit {
        return new vscode.WorkspaceEdit();
    }

}

class RenameDeprecationFix implements DeprecationFix {
    
    private readonly newPropRegex = /^Use "(.*)"/;
    private newPropName: string;

    constructor(
        private deprecation: Deprecation, 
        private doc: vscode.TextDocument,
        private range: vscode.Range
    ) {
        const newPropResult = this.newPropRegex.exec(this.deprecation.userMessage);
        if (!newPropResult) {
            throw new Error("Deprecation notice does not specifiy new property name in expected format.");
        }

        this.newPropName = newPropResult[1];    
    }


    getCommand(): vscode.Command | undefined {
        return;
    }


    calculateFixMessage(): string {
        return `Replace by '${this.newPropName}'`;
    }

    calculateEdit(): vscode.WorkspaceEdit {
        const edit = new vscode.WorkspaceEdit();
        
        const deprecatedPropText = this.doc.getText(this.range);
        const deprecatedPropRes = /^"([^"]+)"/.exec(deprecatedPropText);
        if (!deprecatedPropRes) {
            return edit;
        }

        edit.replace(this.doc.uri, new vscode.Range(this.range.start.translate(0, 1), this.range.start.translate(0, deprecatedPropRes[1].length + 1)), this.newPropName);
        return edit;
    }

}
