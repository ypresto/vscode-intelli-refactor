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
      vscode.commands.registerCommand(
        nearestCommand.command,
        preHandler(nearestCommand, editor => nearestNodeAction(editor, nearestCommand))
      )
    );
  }
  for (const expressionCommand of expressionCommandTypes) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        expressionCommand.command,
        preHandler(expressionCommand, editor => expressionAwareAction(editor, expressionCommand))
      )
    );
  }
  extContext = context;
}

const TS_JS_LANG_IDS = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'];

function preHandler(commandType: CommandType, callback: (editor: vscode.TextEditor) => any) {
  return () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const { document, selection } = editor;

    if (!TS_JS_LANG_IDS.includes(document.languageId)) {
      // Path-through
      return executeCodeActionCommand(editor, null, commandType);
    }

    if (!selection.isEmpty) {
      // Respect user selection.
      return selectedRangeAction(editor, commandType);
    }

    return callback(editor);
  };
}

async function nearestNodeAction(editor: vscode.TextEditor, commandType: CommandType) {
  const candidate = await withLoading(() =>
    findNearestCandidateNode(editor.document, editor.selection, filterFromCommandType(commandType))
  );

  return executeCodeActionCommand(editor, candidate ? candidate.selection : null, commandType);
}

async function expressionAwareAction(editor: vscode.TextEditor, commandType: CommandType) {
  // TODO: Prioritize preferred action?
  const candidates = await withLoading(() =>
    fetchCandidateNodesForWholeExpression(
      editor.document,
      editor.selection,
      filterFromCommandType(commandType),
      commandType.typeExpression
    )
  );

  const callback = (candidate: CandidateNode) => executeCodeActionCommand(editor, candidate.selection, commandType);

  if (candidates.length === 0) return executeCodeActionCommand(editor, null, commandType);
  if (candidates.length === 1) return callback(candidates[0]);

  const picker = showNodePicker({
    editor,
    candidates,
    placeholder: commandType.typeExpression ? 'Types' : 'Expressions',
    onAccept: callback
  });
  extContext!.subscriptions.push(picker);
}

// Respect user selection.
async function selectedRangeAction(editor: vscode.TextEditor, commandType: CommandType) {
  const candidate = await withLoading(() =>
    findSingleCandidateNodeOnRange(editor.document, editor.selection, filterFromCommandType(commandType))
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
  const config = vscode.workspace.getConfiguration('intelli-refactor');
  return {
    kind: commandType.kind ? vscode.CodeActionKind.Empty.append(commandType.kind) : undefined,
    preferred: commandType.preferred,
    useCompatSelection: config.get('useCompatSelection', false)
  };
}

function withLoading<T>(callback: () => Promise<T>) {
  return vscode.window.withProgress<T>(
    { location: vscode.ProgressLocation.Window, title: 'Loading Code Actions...' },
    callback
  );
}

export function deactivate() {
  extContext = null;
}
