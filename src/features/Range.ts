import { Position, Range } from "vscode";
import { Section } from "../bundles/ManifestDocument";

export function rangeOfSection(section: Section): Range {
    return new Range(
        new Position(section.start.line, section.start.col),
        new Position(section.end.line, section.end.col)
    );
}