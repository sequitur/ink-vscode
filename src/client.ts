"use strict";

import * as path from "path";
import { ExtensionContext, workspace, window, Uri } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  ExecuteCommandParams
} from "vscode-languageclient";

import * as InkLanguageServer from "ink-language-server";

/**
 * Maps workspace URIs with their corrresponding story URIs.
 */
export let compiledStories: Map<Uri, Uri> = new Map();

let client: LanguageClient;

/**
 * Callback to use when receiving a runtime notification from the server.
 */
let runtimeNotificationHandler: (
    notification: InkLanguageServer.RuntimeNotification,
    params?: any
) => void;

export function activateLanguageClient(context: ExtensionContext) {
    const SERVER_HOME = context.asAbsolutePath(
        path.join("node_modules", "ink-language-server", "lib", "server.js")
    );

    // The debug options for the server
    const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: SERVER_HOME, transport: TransportKind.ipc },
        debug: {
            module: SERVER_HOME,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // The server only supports the `file` scheme.
        documentSelector: [{ scheme: "file", language: "ink" }],
        synchronize: {}
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        "inkLanguage",
        "Ink Language Server",
        serverOptions,
        clientOptions
    );

    client.onReady().then(registerNotifications);

    // Start the client. This will also launch the server
    context.subscriptions.push(client.start());
}

export function deactivateLanguageClient(): Thenable<void> {
    if (!client) return undefined;
    return client.stop();
}

/**
 * Register an handler to be executed every time the client is notified by
 * the server when a compile time / runtime event occurs.
 *
 * @param handler the handler to register.
 */
export function onRuntimeNotification(
    handler: (RuntimeNotification, params?: any) => void
) {
    runtimeNotificationHandler = handler;
}

/**
 * Request the server to compile the current workspace.
 */
export function compileCurrentStory() {
    const params: ExecuteCommandParams = {
        command: InkLanguageServer.Commands.compileStory,
        arguments: [window.activeTextEditor.document.uri]
    };

    client.sendRequest("workspace/executeCommand", params);
}

/**
 * Request the server to play the current story.
 */
export function playCurrentStory() {
    const params: ExecuteCommandParams = {
        command: InkLanguageServer.Commands.playStory,
        arguments: [window.activeTextEditor.document.uri]
    };

    client.sendRequest("workspace/executeCommand", params);
}

/**
 * Request the server select the option found at the given index.
 * @param optionIndex the index of the option to choose.
 */
export function selectOption(optionIndex: number) {
    const params: ExecuteCommandParams = {
        command: InkLanguageServer.Commands.selectOption,
        arguments: [optionIndex]
    };

    client.sendRequest("workspace/executeCommand", params);
}

/**
 * Request the server to kill its underlying inklecate process.
 */
export function killInklecate() {
    const params: ExecuteCommandParams = {
        command: InkLanguageServer.Commands.killInklecate
    };

    client.sendRequest("workspace/executeCommand", params);
}

/**
 * Register compile time and runtime notification handlers.
 */
function registerNotifications() {
    registerDidCompileStoryNotification();
    registerRuntimeNotification();
}

/**
 * Whenever the server sends `CompilationNotification.didCompileStory`, we'll
 * keep track of the compiled story so we can use it in the interactive preview.
 */
function registerDidCompileStoryNotification() {
    client.onNotification(
        InkLanguageServer.CompilationNotification.didCompileStory,
        (params: InkLanguageServer.DidCompileStoryParams) => {
            const workspaceFolder = workspace.getWorkspaceFolder(
                Uri.parse(params.workspaceUri)
            );

            if (workspaceFolder) {
                try {
                    const storyUri = Uri.parse(params.storyUri);
                    compiledStories.set(workspaceFolder.uri, storyUri);
                } catch (e) {
                    window.showErrorMessage(
                        `The language server returned an invalid story URI: ${e}`
                    );
                }
            }
        }
    );
}

/**
 * When the server sends a `RuntimeNotification`, we'll notify the preview
 * _manager_.
 */
function notifyPreview(
    notification: InkLanguageServer.RuntimeNotification,
    params?: any
) {
    if (runtimeNotificationHandler) {
        runtimeNotificationHandler(notification, params);
    }
}

/**
 * Register untime notification handlers.
 */
function registerRuntimeNotification() {
    client.onNotification(
        InkLanguageServer.RuntimeNotification.text,
        (params: InkLanguageServer.RuntimeTextParams) => {
            notifyPreview(InkLanguageServer.RuntimeNotification.text, params);
        }
    );

    client.onNotification(
        InkLanguageServer.RuntimeNotification.tag,
        (params: InkLanguageServer.RuntimeTagParams) => {
            notifyPreview(InkLanguageServer.RuntimeNotification.tag, params);
        }
    );

    client.onNotification(
        InkLanguageServer.RuntimeNotification.endOfStory,
        () => {
            notifyPreview(InkLanguageServer.RuntimeNotification.endOfStory);
        }
    );

    client.onNotification(
        InkLanguageServer.RuntimeNotification.choice,
        (params: InkLanguageServer.RuntimeChoicesParams) => {
            notifyPreview(InkLanguageServer.RuntimeNotification.choice, params);
        }
    );

    client.onNotification(InkLanguageServer.RuntimeNotification.prompt, () => {
        notifyPreview(InkLanguageServer.RuntimeNotification.prompt);
    });

    client.onNotification(
        InkLanguageServer.RuntimeNotification.error,
        (params: InkLanguageServer.RuntimeErrorParams) => {
            window.showErrorMessage(params.error);
        }
    );
}
