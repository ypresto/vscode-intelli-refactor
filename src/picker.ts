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
  const initialSelection = editor.selection;

  const quickPick = vscode.window.createQuickPick<CandidatePickItem>();
  quickPick.placeholder = placeholder;
  quickPick.items = candidates.map<CandidatePickItem>(candidate => ({
    ...candidate,
    label: candidateToLabel(candidate)
  }));
  // TODO: Soft Undo selection?
  quickPick.onDidChangeActive(item => (editor.selection = item[0] ? item[0].selection : initialSelection));
  quickPick.onDidAccept(() => {
    quickPick.dispose(); // Skip onDidHide
    return onAccept(quickPick.activeItems[0]);
  });
  quickPick.onDidHide(() => {
    // Cancel
    editor.selection = initialSelection;
    return quickPick.dispose();
  });
  quickPick.show();
  return quickPick;
}

function candidateToLabel(candidate: CandidateNode): string {
  return candidate.getText().replace(/\s+/g, ' ');
}
