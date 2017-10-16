'use strict';
/* Ink for VS Code Extension Main File */

import { ExtensionContext } from "vscode";
import { WordCounter, WordCounterController } from "./wordcount";

export function activate(ctx: ExtensionContext) {

    // Create a new word counter.
    let wordCounter = new WordCounter();
    let controller = new WordCounterController(wordCounter);

    // Add to a list of disposables which are disposed when this extension is
    // deactivated again.
    ctx.subscriptions.push(controller);
    ctx.subscriptions.push(wordCounter);
}