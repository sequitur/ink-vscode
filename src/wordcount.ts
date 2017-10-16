'use strict';

import { window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument } from "vscode";

/* Provides word count functionality. Mostly adapted from the example
    word counter extension.
*/
export class WordAndNodeCounter {
    private _statusBarItem: StatusBarItem;

    private plural (n: number, word: string) : string {
        return `${n} ${n === 1 ? word : `${word}s`}`;
    }

    public updateWordCount () {
        // Create this as needed.
        if (!this._statusBarItem)
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        
        // Get the current text editor.
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;

        // Only update status if an Ink file.
        if (doc.languageId === "ink") {
            const docContent = doc.getText();
            const wordCount = this._getWordCount(docContent);
            const nodeCount = this._getNodeCount(docContent);


            // Update the status bar, finally.
            this._statusBarItem.text = `$(pencil) ${this.plural(wordCount, "Word")} in ${this.plural(nodeCount, "Node")}`;
            this._statusBarItem.show();
        } else {
            this._statusBarItem.hide();
        }
    }

    private static lineReducer (stack: { scope: string, lines: string[]}, line: string): { scope: string, lines: string[] } {
        // Reducer function to remove undesirable lines and inline content.
        let { scope, lines } = stack;
        if (line.match(/^\s*$/)) return stack; // Empty line
        if (scope === "multiline") { // Continuing multiline { block }
            if (line.match(/\}/) !== null) {
                scope = "root";
                // Add just the part of the line after the }, if anything.
                return WordAndNodeCounter.lineReducer({ scope, lines }, (line.match(/}(.*)/)[1]));
            }
            return stack;
        }
        if (scope === "comment") { // Continuing multiline comment
            if (line.match(/\*\//) !== null) {
                scope = "root";
                return WordAndNodeCounter.lineReducer({ scope, lines }, (line.match(/\*\/(.*)/)[1]));
            }
            return stack;
        }
        if (line.match(/\{/) !== null) { // Start of { block }
            if (line.match(/\}/) !== null)
                return WordAndNodeCounter.lineReducer(stack, line.replace(/\{.*\}/, ""));
            scope = "multiline";
            return { scope, lines };
        }
        if (line.match(/\/\//) !== null) { // // Comment
            return WordAndNodeCounter.lineReducer(stack, line.replace(/\/\/.*/, ""));
        }
        if (line.match(/\/\*/)) { // Start of /* comment
            if (line.match(/\*\//)) {
                return WordAndNodeCounter.lineReducer(stack, line.replace(/\/\*.*\*\//, ""));
            }
            scope = "comment";
            return { scope, lines };
        }
        // Various single-line directives/statements to ignore in wc
        if (line.match(/^\s*(~|=|VAR|EXTERNAL|INCLUDE)/) === null) {
            lines.push(line);
        }
        return { scope, lines };
    }

    public _getWordCount (docContent: string): number {

        // TODO: Write code for accurate word count of Ink document.
        // TODO: Add node count.

        /* We want an *accurate* word count, so we want to ignore things like knot identifiers
         * as much as possible. Consequently, we must go line by line and identify any lines
         * that should not be counted. */


        return docContent.split("\n").reduce(WordAndNodeCounter.lineReducer, { scope: 'root', lines: [] })
            .lines
            .join(" ")
            .split(/\s/)
            .filter(word => word.match(/\w/))
            .length;
    }

    public _getNodeCount (docContent: string): number {
        return docContent.split("\n").filter(line => line.match(/^\s*=/)).length;
    }

    public dispose() {
        this._statusBarItem.dispose();
    }
}

export class WordNodeCounterController {
    private _wordCounter: WordAndNodeCounter;
    private _disposable: Disposable;

    constructor (wordCounter: WordAndNodeCounter) {
        this._wordCounter = wordCounter;
        this._wordCounter.updateWordCount();

        // Subscribe to selection change and editor activation events.
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        // Create a combined disposable from both event subscriptions.
        this._disposable = Disposable.from(...subscriptions);
    }

    private _onEvent () {
        this._wordCounter.updateWordCount();
    }

    public dispose () {
        this._disposable.dispose();
    }
}