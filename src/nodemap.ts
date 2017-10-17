import { Uri, Position, CompletionItem, CompletionItemKind, Disposable,
    Location, TextDocument, TextDocumentChangeEvent,
    workspace } from "vscode";
import * as fs from "fs";
import * as path from "path";

/* Divert targets that are always valid. */
const PERMANENT_DIVERTS = [
    new CompletionItem("END", CompletionItemKind.Keyword),
    new CompletionItem("DONE", CompletionItemKind.Keyword),
    new CompletionItem("->", CompletionItemKind.Keyword)
]

class DivertTarget {
    constructor ( public readonly name : string | null) { }
    public line : number;
    public readonly parentFile : NodeMap;
    public toCompletionItem () : CompletionItem {
        return new CompletionItem(this.name, CompletionItemKind.Variable);
    }
}

class LabelNode extends DivertTarget {

    public get line () {
        return this._line + this.parentStitch.startLine;
    }

    public get parentFile () {
        return this.parentStitch.parentKnot.parentFile;
    }

    constructor (
        public readonly name : string,
        private readonly _line : number,
        public readonly parentStitch : StitchNode
    ) {
        super(name);
    }


}

class StitchNode extends DivertTarget {
    public readonly labels : LabelNode[]

    public get line () {
        return this.startLine;
    }

    public get startLine () {
        return this.parentKnot.startLine + this._relativeStart;
    }

    public get parentFile () {
        return this.parentKnot.parentFile;
    }

    public get endLine () {
        // On the last stich of the last knot in the file, we want the end line to actually be
        // the next line after the end of the file. This is why we track whether we're on the
        // last line or not when generating the map.
        return this.parentKnot.startLine + this._relativeEnd + (this.lastLine ? 1 : 0);
    }

    constructor (
        public readonly name : string,
        private readonly _relativeStart : number,
        private readonly _relativeEnd : number,
        public readonly parentKnot : KnotNode,
        textContent : string,
        private readonly lastLine : boolean = false
    ) {
        super(name);
        this.labels = textContent
            .split("\n")
            .map((line, index) => ({ found: line.match(/^\s*[-\*\+]\s*\((\w+)\)/), index }))
            .filter(({ found }) => found !== null)
            .map(({ found, index }) => new LabelNode(found[1], index, this));
    }
}

class KnotNode extends DivertTarget {

    public readonly stitches;

    public get line () {
        return this.startLine;
    }

    constructor (
        public readonly name : string | null,
        public readonly startLine : number,
        public readonly endLine : number,
        public readonly parentFile : NodeMap,
        textContent : string,
        private readonly lastLine : boolean = false
    ) {
        super(name);
        const lines = textContent.split("\n");
        this.stitches = lines
            .reduce((
                {nodes, currentNode, lastStart, lastName}
                : { nodes: StitchNode[], currentNode: string[], lastStart : number, lastName : string | null }
                , line : string
                , index : number) => {
                    if (line.match(/^\s*={1}\s*(\w+)/)) {
                        // Found the start of a new stitch.
                        const newName = line.match(/^\s*={1}\s*(\w+)/)[1];
                        const node = new StitchNode(lastName, lastStart, index, this, currentNode.join("\n"));
                        nodes.push(node);
                        if (index === lines.length -1) {
                            // The new stitch is also the last line of the knot.
                            const node = new StitchNode(newName, index, index + 1, this, currentNode.join("\n"), this.lastLine);
                            nodes.push(node);
                        }
                        return { nodes, currentNode: [line], lastStart: index, lastName: newName };
                    }
                    if (index === lines.length - 1) {
                        // Found the last line.
                        const node = new StitchNode(lastName, lastStart, index + 1, this, currentNode.join("\n"), this.lastLine);
                        nodes.push(node);
                        return { nodes, currentNode: [line], lastStart: index, lastName: null };
                    }
                    currentNode.push(line);
                    return { nodes, currentNode, lastStart, lastName };
            }, { nodes: [], currentNode: [], lastStart: 0, lastName: null })
            .nodes;
    }

    public toCompletionItem () : CompletionItem {
        return new CompletionItem(this.name, CompletionItemKind.Variable);
    }
}

class NodeMap {

    public readonly knots : KnotNode[];
    public readonly includes : string[];

    private constructor (public filePath : string, fileText : string) {
        const lines = fileText.split("\n");
        this.knots = lines
            .reduce((
                {nodes, currentNode, lastStart, lastName}
                : { nodes: KnotNode[], currentNode: string[], lastStart : number, lastName : string | null }
                , line : string
                , index : number) => {
                    if (line.match(/^\s*===(\s*function)?\s*(\w+)/)) {
                        // Found the start of a new knot.
                        const newName = line.match(/^\s*===(\s*function)?\s*(\w+)/)[2];
                        const node = new KnotNode(lastName, lastStart, index, this, currentNode.join("\n"));
                        nodes.push(node);
                        return { nodes, currentNode: [line], lastStart: index, lastName: newName };
                    }
                    if (index === lines.length - 1) {
                        // Found the last line
                        const node = new KnotNode(lastName, lastStart, index + 1, this, currentNode.concat(line).join("\n"), true);
                        nodes.push(node);
                        return { nodes, currentNode: [line], lastStart: index, lastName: null };
                    }
                    currentNode.push(line);
                    return { nodes, currentNode, lastStart, lastName };
            }, { nodes: [], currentNode: [], lastStart: 0, lastName: null })
            .nodes;
        this.includes = lines
            .filter(line => line.match(/^\s*INCLUDE\s+(\w+\.ink)/))
            .map(line => {
                const filename = line.match(/^\s*INCLUDE\s+(\w+\.ink)/)[1];
                const dirname = path.dirname(filePath);
                return path.normalize(dirname + path.sep +  filename);
            });
    }

    public static from (filePath : string) : Promise<NodeMap> {
        return new Promise<string>((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data : string) => {
                if (err) return reject(err);
                return resolve(data);
            });
        })
        .catch((err) => console.log("Error opening file: ", err))
        .then((data) => new NodeMap(filePath, data ? data : ""));
    }

    public static fromDocument (document : TextDocument) : NodeMap {
        const { fsPath } = document.uri;
        return new NodeMap(fsPath, document.getText());
    }
}

const nodeMaps : { [key: string]: NodeMap; } = {};
let mapsDone : boolean = false;

export function generateMaps () : Thenable<void> {
    return workspace.findFiles("**/*.ink")
        .then(uris => {
            return Promise.all(uris.map(({fsPath}) => NodeMap.from(fsPath))).catch(err => console.log);
        })
        .then((maps : NodeMap[]) => {
            maps.forEach(map => nodeMaps[map.filePath] = map);
            mapsDone = true;
        });
}

function getIncludeScope (filePath : string, knownScope : string[] = []) : string[] {
    const fileMap = nodeMaps[filePath];
    if (!fileMap) return knownScope;
    if (knownScope.indexOf(filePath) === -1) knownScope.push(filePath);
    const newScope = fileMap.includes.filter(include => knownScope.indexOf(include) === -1);
    if (newScope.length < 1) return knownScope;
    return getIncludeScope(filePath, getIncludeScope(newScope[0], knownScope));

}

function stitchFor (filePath : string, line : number) : StitchNode | null {
    const nodemap = nodeMaps[filePath]
    if (!nodemap) return null;
    const knot = nodemap.knots.find(knot => knot.startLine <= line && knot.endLine > line);
    if (!knot) {
        console.log("Can't identify knot for line ", line);
        return null;
    }
    const stitch = knot.stitches.find(stitch => stitch.startLine <= line && stitch.endLine > line);
    if (!stitch) {
        console.log("Can't identify stitch for line ", line);
        return null;
    }
    return stitch;
}

/* Gets the divert names that are in scope for a given line and file. */
function getDivertsInScope (filePath: string, line : number) : DivertTarget[] {
    if (nodeMaps[filePath]) {
        let targets : DivertTarget[] = [];
        const scope = getIncludeScope(filePath);
        const knots = scope.map(path =>
                nodeMaps[path]
                .knots
            )
            .reduce((a, b) => a.concat(b));
        targets = targets.concat(knots);
        const currentStitch = stitchFor(filePath, line);
        if (currentStitch) {
            const stitches = currentStitch.parentKnot.stitches;
            const labels = currentStitch.labels;
            targets = targets.concat(stitches);
            targets = targets.concat(labels);
        } else {
            console.log("WARN: Couldn't find current stitch for line ", line);
        }
    
        return targets;
    }
    console.log(`Node map missing for file ${filePath}`);
    return [];
}

export function getDefinitionByNameAndScope (name: string, filePath : string, line : number) : Location {
    const divert = getDivertsInScope(filePath, line)
        .find(target => target.name === name);
    return new Location(Uri.file(divert.parentFile.filePath), new Position(divert.line, 0));
}

/* Returns completion items for divert target names for a given line and file. */
export function getDivertCompletionTargets (filePath : string, line : number) : CompletionItem[] {
    return getDivertsInScope(filePath, line)
        .filter(target => target.name !== null)
        .map(target => target.toCompletionItem())
        .concat(PERMANENT_DIVERTS);
}

export class NodeController {
    private _disposable : Disposable;

    constructor () {
        let subscriptions : Disposable[] = [];
        workspace.onDidChangeTextDocument(this._onEvent, this, subscriptions);

        this._disposable = Disposable.from(...subscriptions);
    }

    private _onEvent ({ contentChanges, document } : TextDocumentChangeEvent) {
        // Don't rebuild the entire file unless we have a new line or special character
        // suggesting the node map actually changed.
        if (!contentChanges.find(change => change.text.match(/[\n\*\+\(\)-=]/) !== null)) return;
        const { fsPath } = document.uri;
        nodeMaps[fsPath] = NodeMap.fromDocument(document);
    }

    public dispose () {
        this._disposable.dispose();
    }
}