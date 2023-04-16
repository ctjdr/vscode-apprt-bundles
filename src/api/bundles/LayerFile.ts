import { URI } from "vscode-uri";
import { promises as fs } from "fs";
import * as acorn from "acorn";

/**
 * Representation of the `module.js` bundle layer file.
 */
export class LayerFile {

    private nameToSource: Map<string, LayerClass> = new Map();

    private constructor(content: string, public uri: URI) {
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

    public static async parseFile(uri: URI): Promise<LayerFile> {
        const contentBuffer = await fs.readFile(uri.fsPath);
        return new LayerFile(contentBuffer.toString(), uri);
    }

    public static parseContent(content: string, path: string): LayerFile {
        return new LayerFile(content, URI.file(path));
    }

    public findSource(componentName: string): LayerClass | undefined {
        return this.nameToSource.get(componentName);
    }

    private addImport(importNode: any) {
        const sourceValue = importNode.source.value as string;
        const layerClass = {
            source: sourceValue,
            nameRange: {
                start: importNode.source.start,
                end: importNode.source.end
            },
            name: sourceValue.replace(/^.\//, ""),
            statementRange: {start: importNode.start, end: importNode.end}
        };
        this.nameToSource.set(layerClass.name, layerClass);
    }

    private addExport(exportNode: any) {
        const sourceValue = exportNode.source.value as string;
        const exportSpecifiers = exportNode.specifiers as any[];
        for (const exportSpecifier of exportSpecifiers) {
            const layerClass = {
                source: sourceValue,
                nameRange: {
                    start: exportSpecifier.exported.start,
                    end: exportSpecifier.exported.end
                },
                name: exportSpecifier.exported.name,
                statementRange: {start: exportNode.start, end: exportNode.end}
            };
            this.nameToSource.set(layerClass.name, layerClass);
        }
    };

}

export interface LayerClass {
    source: string;
    nameRange: { start: number, end: number };
    name: string,
    statementRange: {start: number, end: number}
}