import * as vscode from 'vscode';
import { CandidateNode } from './candidateNode';

export interface CandidatePickItem extends vscode.QuickPickItem, CandidateNode {}

export function showNodePicker({
  editor,
  candidates,
  placeholder,
  onAccept
}: {
  editor: vscode.TextEditor;
  candidates: CandidateNode[];
  placeholder?: string;
  onAccept: (candidate: CandidateNode) => void;
}): vscode.Disposable {
  let accepted = false;
  const initialSelection = editor.selection;

  const maybeSoftUndo = async () => {
    if (!editor.selection.isEqual(initialSelection)) {
      await vscode.commands.executeCommand('cursorUndo');
    }
  };

  const quickPick = vscode.window.createQuickPick<CandidatePickItem>();
  quickPick.placeholder = placeholder;
  quickPick.items = candidates.map<CandidatePickItem>(candidate => ({
    ...candidate,
    label: candidateToLabel(candidate)
  }));
  quickPick.onDidChangeActive(async item => {
    await maybeSoftUndo();
    editor.selection = item[0] ? item[0].selection : initialSelection;
  });
  quickPick.onDidAccept(() => {
    accepted = true;
    quickPick.dispose();
    onAccept(quickPick.activeItems[0]);
  });
  quickPick.onDidHide(async () => {
    if (accepted) return;
    // Cancel
    console.log('onDidHide');
    await maybeSoftUndo();
    quickPick.dispose();
  });
  quickPick.show();
  return quickPick;
}

function candidateToLabel(candidate: CandidateNode): string {
  return candidate.getText().replace(/\s+/g, ' ');
}
