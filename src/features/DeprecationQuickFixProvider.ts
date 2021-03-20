import { findNodeAtLocation, getLocation, getNodeValue, JSONPath, Location, parseTree} from "jsonc-parser";
import * as vscode from "vscode";
import { BundleIndex } from "../bundles/BundleIndex";
import ManifestDocument from "../bundles/ManifestDocument";


export {
    DeprecationQuickFixProvider,
    DeprecationQuickFixAllProvider,
    DeprecationFixFactory
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

    constructor(private fixFactory: DeprecationFixFactory) {
        vscode.commands.registerCommand("apprtbundles.manifest.quickfixall", async (diagnostics: vscode.Diagnostic[], doc: vscode.TextDocument) => {

            const fixItems = this.fixFactory.collectFixes(diagnostics, doc);

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

        let deprecationCount  = 0;

        for (let i = 0; i < allDiagnostics.length && deprecationCount < 2; i++) {
            const diagnostic = allDiagnostics[i];
            const diagnosticCode = typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code;
            if (diagnosticCode === 2) {
                deprecationCount++;
            }            
        }

        if (deprecationCount < 2) {
            return[];
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


class DeprecationFixFactory {


    constructor(private bundleIndex: BundleIndex) {

    }

    collectFixes(diagnostics: readonly vscode.Diagnostic[], doc: vscode.TextDocument): {diagnostic: vscode.Diagnostic, fix: DeprecationFix}[]  {

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
    
            const fix = this.createFix(diagnostic, doc);
            if (!fix) {
                continue;
            }
    
            items.push({fix, diagnostic});
        }
    
        return items;
    }

    private createFix(diagnostic: vscode.Diagnostic, doc: vscode.TextDocument): DeprecationFix | undefined {
        
        const deprecation = DeprecationInfo.from(diagnostic.message);
        if (!deprecation) {
            return;
        }
        
        const diagOffset = doc.offsetAt(diagnostic.range.start);
        const nodeLocation = getLocation(doc.getText(), diagOffset);
        // const nodePath = nodeLocation.path;
    
    
    
        switch (deprecation.deprecationKind) {
            case DeprecationKind.newPropertyName:
                return new RenameDeprecationFix(deprecation, doc, nodeLocation.path);
    
            case DeprecationKind.licenseToArray:
                return new LicenseDeprecationFix(doc, nodeLocation.path);
    
            case DeprecationKind.requireBundleArrayToMap:
                return new RequireBundleDeprecationFix(doc, nodeLocation.path, this.bundleIndex.findBundleByUri(doc.uri.toString()));
        
            default:
                return;
        }
    }
    
}





class DeprecationQuickFixProvider implements vscode.CodeActionProvider<DeprecationFixCodeAction> {

    constructor(private fixFactory: DeprecationFixFactory) {
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

        const fixByDiag = this.fixFactory.collectFixes(diagnostics, document);

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
    requireBundleArrayToMap= "requireBundleArrayToMap",
    unknown = "unknown"
}

/**
 * Info (message and deprecation kind) for a single deprecation warning.
 */
class DeprecationInfo {
    
    private static  deprecationKindReverseMap: Record<string, DeprecationKind>  = {
        "1": DeprecationKind.newPropertyName,
        "2": DeprecationKind.valueToArray,
        "42": DeprecationKind.licenseToArray,
        "52": DeprecationKind.requireBundleArrayToMap
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

class LicenseDeprecationFix extends DeprecationFix {

    constructor(
        private doc: vscode.TextDocument,
        fixPath: JSONPath
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
/**
 * Converts from:
 * 
 *   ```json
 *   "Require-Bundle": [
 *     "name": "toolrules",
 *     "version": "1.0.0"
 *   ]
 *  ```
 * 
 * to
 *   ```json
 *   "dependencies": {
 *      "toolrules": "1.0.0"
 *   }
 *   ```
 * 
 * @param  {vscode.TextDocument} privatedoc
 * @param  {JSONPath} fixPath
 */
class RequireBundleDeprecationFix extends DeprecationFix {

    constructor(
        private doc: vscode.TextDocument,
        fixPath: JSONPath,
        private manifestDoc: ManifestDocument | undefined

    ) {
        super(fixPath);
    }
    
    calculateMessage(): string {
        return "Convert to 'dependencies' map";
    }
    
    calculateCommand(range?: vscode.Range): vscode.Command | undefined {
        if (!range) {
            return;
        }

        const oldPropNodeText = this.doc.getText(range);
        const oldPropNode = parseTree(`{${oldPropNodeText}}`);

        const propValNode = findNodeAtLocation(oldPropNode, ["Require-Bundle"]);
        if (propValNode?.type !== "array") {
            return;
        }

        // const requiredBundles = propValNode.value;
        const requiredBundles = getNodeValue(propValNode);

        let snippetEntries = "";

        for (const {name, version} of requiredBundles) {
            const bundleVersion = this.manifestDoc ? "~" + this.manifestDoc.version : "";
            snippetEntries += `\n\t"${name}": "${version || bundleVersion}",`;
        }

        if (requiredBundles.length > 0) {
            snippetEntries = snippetEntries.substr(0, snippetEntries.length - 1) + "\n";
        }


        return {
            command: "apprtbundles.manifest.snippet.insertAtRange",
            title: "Insert snippet at range",
            arguments: [
                {
                    // snippet: `"dependencies": {\n\t"${"foo"}": "${"bar"}"\n}`,
                    snippet: `"dependencies": {${snippetEntries}}`,
                    doc: this.doc,
                    range: range
                }
            ]
        };




    }


    calculateEdit(range?: vscode.Range): vscode.WorkspaceEdit | undefined {
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

