'use strict';

import * as path from 'path';
import { ExtensionContext, workspace, window } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

let client: LanguageClient;

export function activateLanguageClient(context: ExtensionContext) {

    const SERVER_HOME = context.asAbsolutePath(
        path.join('node_modules', 'ink-language-server', 'lib', 'server.js')
    );

    // The debug options for the server
    const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: SERVER_HOME, transport: TransportKind.ipc },
        debug: { module: SERVER_HOME, transport: TransportKind.ipc, options: debugOptions }
    }

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // The server only supports the `file` scheme.
        documentSelector: [{scheme: 'file', language: 'ink'}],
        synchronize: {}
    }

    // Create the language client and start the client.
    client = new LanguageClient('inkLanguage', 'Ink Language Server', serverOptions, clientOptions);

    // Start the client. This will also launch the server
    client.start();
}

export function deactivateLanguageClient(): Thenable<void> {
    if (!client) return undefined;
    return client.stop();
}
