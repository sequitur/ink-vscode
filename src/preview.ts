'use strict';

import { ExtensionContext, commands, window, ViewColumn, workspace, WebviewPanel } from 'vscode';
import * as Client from './client';
import * as InkLanguageServer from "ink-language-server";

let currentPanel: WebviewPanel;

export function activateInkPreview(context: ExtensionContext) {
    Client.onRuntimeNotification(handleNotification);

    context.subscriptions.push(commands.registerCommand('ink.preview', () => {
        if (currentPanel) {
            currentPanel.reveal(ViewColumn.Two);
        } else {
            currentPanel = window.createWebviewPanel(
                'ink.preview',
                'Ink Preview',
                ViewColumn.Two,
                {
                    enableScripts: true,
                }
            );

            currentPanel.webview.onDidReceiveMessage((message) => {
                if (message.type === 'selectOption' && typeof message.optionIndex === 'number') {
                    Client.selectOption(message.optionIndex);
                }
            }, undefined, context.subscriptions)

            currentPanel.onDidDispose(() => {
                currentPanel = undefined;
                // Client.killInklecate();
            }, undefined, context.subscriptions);
        }

        showPreview(currentPanel, context);
    }));
}

/**
 * Show the interactive preview in the given panel.
 *
 * @param panel the webview panel to use.
 * @param context the extension context, passed by the activation method.
 */
function showPreview(panel: WebviewPanel, context: ExtensionContext) {
    getWebviewContent(context).then((result) => {
        panel.webview.html = undefined;
        panel.webview.html = result;
    }, (result) => { console.log(result) });

    Client.playCurrentStory();
}

/**
 * Return the HTML content to display in the webview.
 * @param context the extension context, passed by the activation method.
 */
async function getWebviewContent(context: ExtensionContext): Promise<string> {
    const doc = await workspace.openTextDocument(context.asAbsolutePath('webview/preview.html'));
    return doc.getText();
}

function handleNotification(notification: InkLanguageServer.RuntimeNotification, params?: any) {
    if (!currentPanel) { return; }

    switch(notification) {
    case InkLanguageServer.RuntimeNotification.text:
        const textParams = params as InkLanguageServer.RuntimeTextParams;
        currentPanel.webview.postMessage({
            command: 'render',
            type: 'text',
            content: textParams.text
        })
        break;
    case InkLanguageServer.RuntimeNotification.tag:
        const tagParams = params as InkLanguageServer.RuntimeTagParams;
        currentPanel.webview.postMessage({
            command: 'render',
            type: 'tag',
            content: tagParams.tags
        })
        break;
    case InkLanguageServer.RuntimeNotification.choice:
        const choiceParams = params as InkLanguageServer.RuntimeChoicesParams;
        currentPanel.webview.postMessage({
            command: 'render',
            type: 'choice',
            content: choiceParams.choice
        })
        break;
    case InkLanguageServer.RuntimeNotification.prompt:
        currentPanel.webview.postMessage({
            command: 'render',
            type: 'prompt'
        })
        break;
    case InkLanguageServer.RuntimeNotification.endOfStory:
        currentPanel.webview.postMessage({
            command: 'render',
            type: 'endOfStory'
        })
        break;
    }
}
