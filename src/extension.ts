'use strict';
/* Ink for VS Code Extension Main File */

import { ExtensionContext, DocumentFilter, languages } from "vscode";
import { WordAndNodeCounter, WordNodeCounterController } from "./wordcount";
import { DivertCompletionProvider } from "./completion";

const INK : DocumentFilter = { language: 'ink' };

export function activate(ctx: ExtensionContext) {

    // Create a new word counter.
    let wordCounter = new WordAndNodeCounter();
    let controller = new WordNodeCounterController(wordCounter);

    // Add to a list of disposables which are disposed when this extension is
    // deactivated again.
    ctx.subscriptions.push(controller);
    ctx.subscriptions.push(wordCounter);

    // Enable the completion provider.
    ctx.subscriptions.push(languages.registerCompletionItemProvider(INK, new DivertCompletionProvider(), '>'));
}