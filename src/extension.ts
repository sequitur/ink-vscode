'use strict';
/* Ink for VS Code Extension Main File */

import { ExtensionContext, DocumentFilter, languages } from "vscode";
import { WordAndNodeCounter, WordNodeCounterController } from "./wordcount";
import { DivertCompletionProvider } from "./completion";
import * as NodeMap from "./nodemap";

const INK : DocumentFilter = { language: 'ink' };

export function activate(ctx: ExtensionContext) {

    // Create a new word counter.
    let wordCounter = new WordAndNodeCounter();
    let wcController = new WordNodeCounterController(wordCounter);
    let nodeMapController = new NodeMap.NodeController();

    // Start generating a node map.
    NodeMap.generateMaps();

    // Add to a list of disposables which are disposed when this extension is
    // deactivated again.
    ctx.subscriptions.push(wcController);
    ctx.subscriptions.push(wordCounter);
    ctx.subscriptions.push(nodeMapController);

    // Enable the completion provider.
    ctx.subscriptions.push(languages.registerCompletionItemProvider(INK, new DivertCompletionProvider(), '>'));
}