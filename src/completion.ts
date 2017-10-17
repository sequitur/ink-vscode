import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem, Range, CompletionItemKind, workspace } from "vscode";
import * as NodeMap from "./nodemap";
import * as fs from "fs";

export class DivertCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems (document: TextDocument, position: Position) : CompletionItem[] {
        // Make sure we are at the end of a valid divert arrow.
        // Ignore a > at the start of a line.
        if (position.character <= 1) return;
        const prefix = document.getText(new Range(position.with(position.line, Math.max(position.character - 4, 0)), position));
        // Ignore a double divert end of tunnel operator.
        if (prefix === "->->") return;
        // Ignore any other usage of >
        if (prefix.match(/->$/) === null) return;
        return NodeMap.getDivertCompletionTargets(document.uri.fsPath, position.line);
    }

}