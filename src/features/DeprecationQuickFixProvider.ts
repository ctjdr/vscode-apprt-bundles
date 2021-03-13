import { findNodeAtLocation, getLocation, JSONPath, Location, parseTree} from "jsonc-parser";
import * as vscode from "vscode";


export {
    DeprecationQuickFixProvider,
    DeprecationQuickFixAllProvider
};


type LocationDiag = {
    location: Location,
    diag: vscode.Diagnostic
};

function rangeOfNode(document: vscode.TextDocument, nodePath: JSONPath): vscode.Range | undefined {

    const jsonDoc = parseTree(document.getText());
    const propValNode = findNodeAtLocation(jsonDoc, nodePath);
    if (!propValNode ||propValNode.parent?.type !== "property") {
        return;
    }
    const offset = propValNode.offset;
    const start = document.positionAt(propValNode.parent.offset);
    const end = document.positionAt(offset + propValNode.length);

    return new vscode.Range(start, end);
}

class DeprecationQuickFixAllProvider implements vscode.CodeActionProvider {

    constructor() {
        vscode.commands.registerCommand("apprtbundles.manifest.quickfixall", async (diagnostics: vscode.Diagnostic[], doc: vscode.TextDocument) => {

            const fixItems = collectFixes(diagnostics, doc);

            fixItems.sort((item1, item2) => {
                return item1.fix.getFixPath().length - item2.fix.getFixPath().length;
            }).reverse();

            for (const {fix, diagnostic} of fixItems) {
                const range  = rangeOfNode(doc, fix.getFixPath());
                const command = fix.calculateCommand(range);
                if (command) {
                    await vscode.commands.executeCommand(command.command, ...command.arguments??[]);
                }
                const edit = fix.calculateEdit(range);
                if (edit) {
                    await vscode.workspace.applyEdit(edit);
                }
            }
        });
    }

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {

        const allDiagnostics = vscode.languages.getDiagnostics(document.uri);
        if (allDiagnostics.length === 0) {
            return [];
        }

        const locationDiags: LocationDiag[] = [];

        for (const diagnostic of allDiagnostics) {

            const diagnosticCode = typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code;
            if (diagnosticCode !== 2) {
                // Code '2' is what VS Code uses as "ErrorCode" for deprecated JSON schema elements.
                // See https://github.com/microsoft/vscode-json-languageservice/blob/07fec3faafa3f32915dcd6fcc6999a91ad113f88/src/parser/jsonParser.ts#L546
                continue;
            }

            const diagOffset = document.offsetAt(diagnostic.range.start);
            const nodeLocation = getLocation(document.getText(), diagOffset);
            locationDiags.push({
                diag: diagnostic,
                location: nodeLocation
            });
        }

        const action = new vscode.CodeAction("Fix all auto-fixable deprecations", vscode.CodeActionKind.QuickFix);
        action.command = {
            command: "apprtbundles.manifest.quickfixall",
            title: "Fix all",
            arguments: [
                allDiagnostics,
                document
            ]
        };
        return [action];
    }
}


function collectFixes(diagnostics: readonly vscode.Diagnostic[], doc: vscode.TextDocument): {diagnostic: vscode.Diagnostic, fix: DeprecationFix}[]  {

    if (diagnostics.length === 0) {
        return [];
    }

    const items = [];
    for (const diagnostic of diagnostics) {

        const diagnosticCode = typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code;
        if (diagnosticCode !== 2) {
            // Code '2' is what VS Code uses as "ErrorCode" for deprecated JSON schema elements.
            // See https://github.com/microsoft/vscode-json-languageservice/blob/07fec3faafa3f32915dcd6fcc6999a91ad113f88/src/parser/jsonParser.ts#L546
            continue;
        }

        const fix = createFix(diagnostic, doc);
        if (!fix) {
            continue;
        }

        items.push({fix, diagnostic});
    }

    return items;
}

class DeprecationQuickFixProvider implements vscode.CodeActionProvider<DeprecationFixCodeAction> {

    constructor() {
        vscode.commands.registerCommand("apprtbundles.manifest.snippet.insertAtRange", async (opts) => {
            const doc: vscode.TextDocument = opts.doc;
            const range: vscode.Range = opts.range;
            const snippet: string = opts.snippet;
            const editor = await vscode.window.showTextDocument(doc.uri);
            const snippetString = new vscode.SnippetString(snippet);
            editor.insertSnippet(snippetString, range as vscode.Range);
        });
    }


    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(DeprecationFixCodeAction | vscode.Command)[]> {
        console.info(`${context.only?.value} -- #diagnostics: ${context.diagnostics.length} -- Range lines ${range.start.line}, ${range.end.line}`);

        const actions: DeprecationFixCodeAction[] = [];
        const diagnostics = context.diagnostics;

        const fixByDiag = collectFixes(diagnostics, document);

        for (const {fix, diagnostic} of fixByDiag) {
            const action = new DeprecationFixCodeAction(fix, diagnostic.range);
            action.diagnostics = [diagnostic];
            actions.push(action);
        }

        return actions;
    }

    resolveCodeAction(codeAction: DeprecationFixCodeAction, token: vscode.CancellationToken): vscode.ProviderResult<DeprecationFixCodeAction> {
        codeAction.calculateEdit();
        return codeAction;
    }
}


class DeprecationFixCodeAction extends vscode.CodeAction {

    constructor(private readonly fix: DeprecationFix, private readonly range: vscode.Range) {
        super(fix.calculateMessage(), vscode.CodeActionKind.QuickFix);
        this.command = fix.calculateCommand(this.range);
        this.isPreferred = true;
    }

    calculateEdit() {
        this.edit = this.fix.calculateEdit(this.range);
    }
}

// ----------------- Info ------------------

enum DeprecationKind {
    newPropertyName = "newPropertyName",
    valueToArray = "valueToArray",
    licenseToArray = "licenseToArray",
    unknown = "unknown"
}

/**
 * Info (message and deprecation kind) for a single deprecation warning.
 */
class DeprecationInfo {
    
    private static  deprecationKindReverseMap: Record<string, DeprecationKind>  = {
        "1": DeprecationKind.newPropertyName,
        "2": DeprecationKind.valueToArray,
        "42": DeprecationKind.licenseToArray
    };

    private static messageRegex = /^(.*)\[manifest\((\d+(?:,\d+)*)\)\]$/;

    private constructor(
        public readonly userMessage: string,
        public readonly deprecationKind: DeprecationKind
    ) {}

    static from(message: string): DeprecationInfo | undefined {

        const messageRegexResult = DeprecationInfo.messageRegex.exec(message);

        if (!messageRegexResult) {
            return;
        }

        const userMessage = messageRegexResult[1];
        const deprecationCode = messageRegexResult[2];
        const deprecationKind =  DeprecationInfo.deprecationKindReverseMap[deprecationCode] ?? DeprecationKind.unknown;

        return new DeprecationInfo(userMessage, deprecationKind);
    }
}


// ----------------- Fixes --------------------


abstract class DeprecationFix {

    constructor(protected fixPath: JSONPath) {
    }

    abstract calculateMessage(): string;
    abstract calculateCommand(range?: vscode.Range): vscode.Command | undefined;
    abstract calculateEdit(range?: vscode.Range): vscode.WorkspaceEdit | undefined;

    public getFixPath(): JSONPath {
        return this.fixPath;
    }

}


function createFix(diagnostic: vscode.Diagnostic, doc: vscode.TextDocument): DeprecationFix | undefined {

    const deprecation = DeprecationInfo.from(diagnostic.message);
    if (!deprecation) {
        return;
    }
    
    const diagOffset = doc.offsetAt(diagnostic.range.start);
    const nodeLocation = getLocation(doc.getText(), diagOffset);
    // const nodePath = nodeLocation.path;


    if (deprecation.deprecationKind === DeprecationKind.newPropertyName) {
        return new RenameDeprecationFix(deprecation, doc, nodeLocation.path);
    }
    else if (deprecation.deprecationKind === DeprecationKind.licenseToArray) {
        return new LicenseDeprecationFix(doc, nodeLocation.path);
    }

    return;
}


class LicenseDeprecationFix extends DeprecationFix {

    constructor(
        private doc: vscode.TextDocument,
        fixPath: JSONPath
        // ,
        // private range: vscode.Range
    ) {
        super(fixPath);
    }

    calculateCommand(range: vscode.Range): vscode.Command | undefined {

        if (!range) {






            return;
        }

        const oldPropNodeText = this.doc.getText(range);
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
                    range: range
                }
            ]
        };
    }

    calculateMessage(): string {
        return "Convert to 'licenses' array";
    }
    calculateEdit(): vscode.WorkspaceEdit {
        return new vscode.WorkspaceEdit();
    }

}

class RenameDeprecationFix extends DeprecationFix {

    private readonly newPropRegex = /^Use "(.*)"/;
    private newPropName: string;

    constructor(
        private deprecation: DeprecationInfo,
        private doc: vscode.TextDocument,
        fixPath: JSONPath
        // ,
        // private range: vscode.Range
    ) {
        super(fixPath);
        const newPropResult = this.newPropRegex.exec(this.deprecation.userMessage);
        if (!newPropResult) {
            throw new Error("Deprecation notice does not specifiy new property name in expected format.");
        }

        this.newPropName = newPropResult[1];
    }

    calculateCommand(): vscode.Command | undefined {
        return;
    }

    calculateMessage(): string {
        return `Replace by '${this.newPropName}'`;
    }

    calculateEdit(range?: vscode.Range): vscode.WorkspaceEdit {

        const edit = new vscode.WorkspaceEdit();

        if (!range) {
            return edit;
        }

        const deprecatedPropText = this.doc.getText(range);
        const deprecatedPropRes = /^"([^"]+)"/.exec(deprecatedPropText);
        if (!deprecatedPropRes) {
            return edit;
        }

        edit.replace(this.doc.uri, new vscode.Range(range.start.translate(0, 1), range.start.translate(0, deprecatedPropRes[1].length + 1)), this.newPropName);
        return edit;
    }

}

