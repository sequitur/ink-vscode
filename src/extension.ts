'use strict';
/* Ink for VS Code Extension Main File */

import { ExtensionContext } from "vscode";
import { WordAndNodeCounter, WordNodeCounterController } from "./wordcount";

export function activate(ctx: ExtensionContext) {

    // Create a new word counter.
    let wordCounter = new WordAndNodeCounter();
    let controller = new WordNodeCounterController(wordCounter);

    // Add to a list of disposables which are disposed when this extension is
    // deactivated again.
    ctx.subscriptions.push(controller);
    ctx.subscriptions.push(wordCounter);
}