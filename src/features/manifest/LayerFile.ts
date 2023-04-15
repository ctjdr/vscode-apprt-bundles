import * as vscode from "vscode";
import { promises as fs } from "fs";
import * as acorn from "acorn";

export class LayerFile {

    private nameToSource: Map<string, string> = new Map();

    private constructor(private content: string, private fileUri?: vscode.Uri) {
        const ast: any = acorn.parse(content, {
            ecmaVersion: 2020,
            sourceType: "module"
        }) as any;

        if (!ast.body || ast.body.length === 0) {
            return;
        }

        const bodyNodes = ast.body as acorn.Node[];
        for (const node of bodyNodes) {
            if (node.type === "ImportDeclaration") {
                this.addImport(node);
            }
            else if (node.type === "ExportNamedDeclaration") {
                this.addExport(node);
            }
        }
    }

    public static async parseFile(uri: vscode.Uri): Promise<LayerFile> {
        const contentBuffer = await fs.readFile(uri.fsPath);
        return new LayerFile(contentBuffer.toString(), uri);
    }

    public static parseContent(content: string): LayerFile {
        return new LayerFile(content);
    }

    public findSource(componentName: string): string | undefined {
        return this.nameToSource.get(componentName);
    }

    private addImport(importNode: any) {
        const sourceValue = importNode.source.value as string;
        this.nameToSource.set(sourceValue.replace(/^.\//, ""), sourceValue);
    }

    private addExport(exportNode: any) {
        const sourceValue = exportNode.source.value as string;
        const exportSpecifiers = exportNode.specifiers as any[];
        for (const exportSpecifier of exportSpecifiers) {
            this.nameToSource.set(exportSpecifier.exported.name, sourceValue);
        }
    }
}