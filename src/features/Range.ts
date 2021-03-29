import { Position, Range } from "vscode";
import { Section } from "../api/bundles/ManifestDocument";

export function rangeOfSection(section: Section | undefined): Range {
    if (!section) {
        return new Range(0,0,0,0);
    }
    return new Range(
        new Position(section.start.line, section.start.col),
        new Position(section.end.line, section.end.col)
    );
}