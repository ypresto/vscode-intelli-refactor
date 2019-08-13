export interface CommandType {
  command: string;
  kind: string | null;
  preferred?: boolean;
  noPrompt?: boolean;
  key?: string;
  mac?: string;
  typeExpression?: boolean;
}

// Keys are overriding VSCode default.
export const nearestCommandTypes: CommandType[] = [
  { command: 'intelli-refactor.quickFix', kind: null, key: 'ctrl+.', mac: 'cmd+.' },
  { command: 'intelli-refactor.refactor', kind: 'refactor', key: 'ctrl+shift+r' },
  { command: 'intelli-refactor.move', kind: 'refactor.move', key: 'f6' },
  { command: 'intelli-refactor.rewrite', kind: 'refactor.rewrite' } // Provider is already implemented or not...???
];

// Keys are from IntelliJ / Android Studio.
// https://developer.android.com/studio/intro/keyboard-shortcuts
export const expressionCommandTypes: CommandType[] = [
  { command: 'intelli-refactor.extract', kind: 'refactor.extract' },
  {
    command: 'intelli-refactor.extract.localVariable',
    kind: 'refactor.extract.constant',
    // Assuming this returns local scope.
    // See https://github.com/microsoft/vscode-docs/blob/master/docs/editor/refactoring.md#keybindings-for-code-actions
    preferred: true,
    noPrompt: true,
    key: 'ctrl+alt+v',
    mac: 'cmd+alt+v'
  },
  {
    command: 'intelli-refactor.extract.constant',
    kind: 'refactor.extract.constant',
    noPrompt: true,
    key: 'ctrl+alt+c',
    mac: 'cmd+alt+c'
  },
  {
    command: 'intelli-refactor.extract.function',
    kind: 'refactor.extract.function',
    noPrompt: true,
    key: 'ctrl+alt+m',
    mac: 'cmd+alt+m'
  },
  {
    command: 'intelli-refactor.extract.type',
    kind: 'refactor.extract.type',
    noPrompt: true,
    key: 'ctrl+shift+alt+a',
    mac: 'cmd+shift+alt+a',
    typeExpression: true
  },
  {
    command: 'intelli-refactor.inline',
    kind: 'refactor.extract.inline',
    noPrompt: true,
    key: 'ctrl+alt+n',
    mac: 'cmd+alt+n'
  }
];

export const commandTypes = [...nearestCommandTypes, ...expressionCommandTypes];
