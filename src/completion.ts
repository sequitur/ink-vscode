import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem, Range, CompletionItemKind, workspace } from "vscode";
import * as fs from "fs";

const PERMANENT_DIVERTS = [
    new CompletionItem("END", CompletionItemKind.Keyword),
    new CompletionItem("DONE", CompletionItemKind.Keyword),
    new CompletionItem("->", CompletionItemKind.Keyword)
]

async function readFile (path: string) : Promise<string>{
    return new Promise<string>((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) return reject(err);
            return resolve(data);
        });
    });
}

export class DivertCompletionProvider implements CompletionItemProvider {

    private permanentDiverts () {
        return PERMANENT_DIVERTS;
    }

    private getKnots (docText : string) : CompletionItem[] {
        return docText
            .split("\n")
            .filter(line => line.match(/^\s*===/))
            .map(line => line.match(/^\s*===\s*([\w_]+)/)[1])
            .map(knotName => new CompletionItem(knotName, CompletionItemKind.Reference));
    }

    private getStitches (docText : string, position : Position) : CompletionItem[] {
        // Get valid stitches from the current knot.

        const lines = docText.split("\n");

        const currentKnotIndex = lines.slice(0, position.line)
            .reduce((current, line, index) => {
                if (line.match(/^\s*===/)) {
                    return index;
                }
                return current;
            }, 0);

        const knotEndIndex = lines.slice(position.line)
            .reduceRight((current, line, index) => {
                if (line.match(/^\s*===/)) {
                    return index;
                }
                return current;
            }, lines.length) + position.line;
        
        
        return lines.slice(currentKnotIndex, knotEndIndex)
            .filter(line => line.match(/^\s*={1}\s*(\w+)/))
            .map(line => {
                const stitchName = line.match(/^\s*={1}\s*(\w+)/)[1];
                return new CompletionItem(stitchName, CompletionItemKind.Reference);
            });
    }

    private async getIncludes (document : TextDocument, token: CancellationToken) : Promise<CompletionItem[]> {
        const pathSplitter = /(^.*[\/\\])(.*$)/;
        const [_, folder, fileName] = document.uri.fsPath.match(pathSplitter);
        const includeFilenames = document.getText()
            .split("\n")
            .filter(line => line.match(/^\s*INCLUDE/))
            .map(line => line.match(/^\s*INCLUDE\s*([\w_\.]+)/)[1]);
        
        const inkFiles = await workspace.findFiles("**/*.ink", '', Infinity, token);
        const usedFiles = inkFiles.
            map(uri => {
                const [_, folder, fileName ] = uri.fsPath.match(pathSplitter);
                return { uri, folder, fileName };
            })
            .filter(obj => obj.folder === folder)
            .filter(obj => includeFilenames.indexOf(obj.fileName) !== -1);
        
        const knotLists = await Promise.all(usedFiles
            .map(file => readFile(file.uri.fsPath))
            .map(filePromise => filePromise.then(data => this.getKnots(data))))
            .then(ary => ary.reduce((a, b) => a.concat(b)));
        
        return knotLists;
    }

    public async provideCompletionItems (
        document : TextDocument, position: Position, token: CancellationToken
    ) : Promise<CompletionItem[]> {
        if (position.character <= 1) return;
        const prefix = document.getText(new Range(position.with(position.line, Math.max(position.character - 4, 0)), position));
        if (prefix === "->->") return;
        if (prefix.match(/->$/) === null) return;

        const knotContext = await this.getIncludes(document, token);

        const docText = document.getText();

        return knotContext
            .concat(this.getKnots(docText))
            .concat(this.getStitches(docText, position))
            .concat(PERMANENT_DIVERTS);
    }
}