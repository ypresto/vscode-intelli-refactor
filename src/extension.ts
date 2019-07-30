import * as vscode from 'vscode';
import {
  findNearestCandidateNode,
  fetchCandidateNodesForWholeExpression,
  CandidateNode,
  ActionFilter,
  findSingleCandidateNodeOnRange
} from './candidateNode';
import { showNodePicker } from './picker';
import { nearestCommandTypes, expressionCommandTypes, CommandType } from './commandType';

let extContext: vscode.ExtensionContext | null = null;

export function activate(context: vscode.ExtensionContext) {
  for (const nearestCommand of nearestCommandTypes) {
    context.subscriptions.push(
      vscode.commands.registerCommand(nearestCommand.command, () => nearestNodeAction(nearestCommand))
    );
  }
  for (const expressionCommand of expressionCommandTypes) {
    context.subscriptions.push(
      vscode.commands.registerCommand(expressionCommand.command, () => expressionAwareAction(expressionCommand))
    );
  }
  extContext = context;
}

async function nearestNodeAction(commandType: CommandType) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const { document, selection } = editor;

  if (!selection.isEmpty) {
    // Respect user selection.
    return selectedRangeAction(editor, selection, commandType);
  }

  const candidate = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: 'Loading code actions' },
    () => findNearestCandidateNode(document, selection, filterFromCommandType(commandType))
  );

  return executeCodeActionCommand(editor, candidate ? candidate.selection : null, commandType);
}

async function expressionAwareAction(commandType: CommandType) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const { document, selection } = editor;

  if (!selection.isEmpty) {
    return selectedRangeAction(editor, selection, commandType);
  }

  // TODO: Prioritize preferred action?
  const candidates = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: 'Loading code actions' },
    () => fetchCandidateNodesForWholeExpression(document, selection, filterFromCommandType(commandType))
  );

  const callback = (candidate: CandidateNode) => executeCodeActionCommand(editor, candidate.selection, commandType);

  if (candidates.length === 0) return executeCodeActionCommand(editor, null, commandType);
  if (candidates.length === 1) return callback(candidates[0]);

  const picker = showNodePicker({ editor, candidates, onAccept: callback });
  extContext!.subscriptions.push(picker);
}

// Respect user selection.
async function selectedRangeAction(editor: vscode.TextEditor, selection: vscode.Selection, commandType: CommandType) {
  const candidate = await findSingleCandidateNodeOnRange(
    editor.document,
    selection,
    filterFromCommandType(commandType)
  );
  return executeCodeActionCommand(editor, candidate ? candidate.selection : null, commandType);
}

async function executeCodeActionCommand(
  editor: vscode.TextEditor,
  selection: vscode.Selection | null,
  commandType: CommandType
) {
  if (vscode.window.activeTextEditor != editor) return;

  if (selection) {
    editor.selection = selection;
  }

  const { kind, preferred, noPrompt } = commandType;
  if (!kind) {
    await vscode.commands.executeCommand('editor.action.quickFix');
  } else {
    await vscode.commands.executeCommand('editor.action.codeAction', {
      kind,
      preferred,
      apply: noPrompt ? 'ifSingle' : 'never'
    });
  }
}

function filterFromCommandType(commandType: CommandType): ActionFilter {
  return {
    kind: commandType.kind ? vscode.CodeActionKind.Empty.append(commandType.kind) : undefined,
    preferred: commandType.preferred
  };
}

export function deactivate() {
  extContext = null;
}
