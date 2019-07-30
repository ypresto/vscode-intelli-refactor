import * as vscode from 'vscode';
import * as ts from 'typescript';

export interface CandidateNode {
  selection: vscode.Selection;
  actions: (vscode.Command | vscode.CodeAction)[];
  getText(): string;
}

export interface ActionFilter {
  kind?: vscode.CodeActionKind;
  preferred?: boolean;
}

const isExcludedForNearest = (node: ts.Node) =>
  // NOTE: Enable 'Move to New File' which is only available when whole declaration (const foo = ...) is selected.
  //
  // In 'const foo = 1, bar = 2',
  //   'foo = 1':          VariableDeclaration
  //   'foo = 1, bar = 2': VariableDeclarationList
  //   'const foo ...':    VariableStatemenet
  // VariableDeclaration has meaningful children (identifier = initializer), and VariableDeclarationList is a list of them.
  // So we can safely skip them to expand selction to parent VariableStatement.
  //
  // TODO: Skip only one Identifier in VariableStatement (otherwise Move to New File is impossible). Maybe option for it is better.
  ts.isVariableDeclaration(node) ||
  ts.isVariableDeclarationList(node) ||
  // 'object.foobar()' over 'object.foobar'.
  (ts.isCallExpression(node.parent) && node.parent.expression === node);

export async function findNearestCandidateNode(
  document: vscode.TextDocument,
  range: vscode.Range,
  filter?: ActionFilter
): Promise<CandidateNode | null> {
  const sourceFile = getSourceFile(document);
  const nodePath = traverseForShortestNodePathContainsRange(sourceFile, range);

  for (const node of [...nodePath].reverse()) {
    if (isExcludedForNearest(node)) continue;
    const candidateNode = await fetchCandidateNode(document.uri, node, sourceFile, filter);
    if (candidateNode) return candidateNode;
  }
  return null;
}

// NOTE: ParenthesizedExpresion itself is meaningless because it can contain only one Node.
// Respect it only when it is first (shortest) node in candidate.
// Note that wrapping with meaningless parentheses is popular in React development.
//   return (
//     <div>...</div>
//   )
const nodeFilterForExpression = (node: ts.Node, index: number) =>
  (index === 0 || !ts.isParenthesizedExpression(node)) && ts.isExpressionNode(node);

export async function fetchCandidateNodesForWholeExpression(
  document: vscode.TextDocument,
  range: vscode.Range,
  filter?: ActionFilter
): Promise<CandidateNode[]> {
  const sourceFile = getSourceFile(document);
  const nodePath = traverseForShortestNodePathContainsRange(sourceFile, range);
  const expressionNodes = [...nodePath].reverse().filter(nodeFilterForExpression);
  const candidateNodes = await Promise.all(
    expressionNodes.map(async node => {
      return await fetchCandidateNode(document.uri, node, sourceFile, filter);
    })
  );
  return candidateNodes.filter((c): c is CandidateNode => !!c);
}

export async function findSingleCandidateNodeOnRange(
  document: vscode.TextDocument,
  range: vscode.Range,
  filter?: ActionFilter
): Promise<CandidateNode | null> {
  const sourceFile = getSourceFile(document);
  const nodePath = traverseForShortestNodePathContainsRange(sourceFile, range);
  const node = nodePath[nodePath.length - 1];
  // Handle fo[o === b]ar
  if (node && isBothSideTokensOfNodeIntersectsRange(node, range, sourceFile)) {
    return await fetchCandidateNode(document.uri, node, sourceFile, filter);
  }
  // nodePath can be a parent of the intended node if space around the node is selected.
  // Handle [  foo === bar  ]
  const selectedChildren = node
    .getChildren(sourceFile)
    .filter(n => isBothSideTokensOfNodeIntersectsRange(n, range, sourceFile));
  if (selectedChildren.length === 1) {
    return await fetchCandidateNode(document.uri, selectedChildren[0], sourceFile, filter);
  }
  // NOTE: Noop on multiple nodes, as provider is better place to handle that.
  return null;
}

async function fetchCandidateNode(
  uri: vscode.Uri,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  filter: ActionFilter = {}
): Promise<CandidateNode | null> {
  const selection = selectionFromNode(node, sourceFile);
  const actions = await fetchCodeActions(uri, selection, filter);
  if (actions.length === 0) return null;
  const getText = () => node.getText(sourceFile);
  return { selection, actions, getText };
}

function traverseForShortestNodePathContainsRange(sourceFile: ts.SourceFile, range: vscode.Range) {
  let nodePath: ts.Node[] = [];
  const callback = (node: ts.Node) => {
    if (!isNodeContainsRange(node, range, sourceFile)) return;
    nodePath.push(node);
    ts.forEachChild(node, callback);
  };
  ts.forEachChild(sourceFile, callback);
  return nodePath;
}

function getSourceFile(document: vscode.TextDocument) {
  return ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, /* setParentNodes */ true);
}

function isNodeContainsRange(node: ts.Node, range: vscode.Range, sourceFile: ts.SourceFile) {
  const startPosition = getSourceFilePosition(range.start, sourceFile);
  const endPosition = getSourceFilePosition(range.end, sourceFile);
  return node.getStart(sourceFile) <= startPosition && endPosition <= node.getEnd();
}

function isBothSideTokensOfNodeIntersectsRange(node: ts.Node, range: vscode.Range, sourceFile: ts.SourceFile) {
  const startPosition = getSourceFilePosition(range.start, sourceFile);
  const endPosition = getSourceFilePosition(range.end, sourceFile);
  const firstToken = node.getFirstToken(sourceFile) || node;
  const lastToken = node.getLastToken(sourceFile) || node;
  return startPosition < firstToken.getEnd() && lastToken.getStart(sourceFile) < endPosition;
}

function selectionFromNode(node: ts.Node, sourceFile: ts.SourceFile) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return new vscode.Selection(
    new vscode.Position(start.line, start.character),
    new vscode.Position(end.line, end.character)
  );
}

function getSourceFilePosition(position: vscode.Position, sourceFile: ts.SourceFile) {
  return sourceFile.getPositionOfLineAndCharacter(position.line, position.character);
}

// NOTE: Actual parameter type is a range, but typescript refactoring checks rangeOrSelection instanceof vscode.Selection.
// https://github.com/microsoft/vscode/blob/a7122371aaa76237b155cd38c57e9d66a5f47637/extensions/typescript-language-features/src/features/refactor.ts#L215
// Current VSCode transform Select to Range, so there is no workaround for this.
// https://github.com/microsoft/vscode/blob/1c6047158b540dd5e38e75bf9793bc9527d26e4b/src/vs/workbench/api/common/extHostApiCommands.ts#L486
export async function fetchCodeActions(uri: vscode.Uri, selection: vscode.Selection, filter: ActionFilter) {
  const rawActions =
    (await vscode.commands.executeCommand<vscode.Command[]>(
      'vscode.executeCodeActionProvider',
      uri,
      selection,
      filter.kind
    )) || [];
  if (filter.preferred) {
    return rawActions.filter(action => action instanceof vscode.CodeAction && action.isPreferred);
  } else {
    return rawActions;
  }
}
