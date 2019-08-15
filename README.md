# vscode-intelli-refactor README

💡⚡️ Smartly select range for refactoring under cursor. Imports superb `Alt+Enter` experience of IntelliJ / Android Studio into VSCode! 🚀

## Features

### Nearest Quick Fix

Automatically expands selection to the region where at least one code action is available, in contrast to `Command+.` (or `Ctrl+.` in Windows) does not show refactoring actions unless selecting a whole expression by hand.

![intelli-quickfix](https://user-images.githubusercontent.com/400558/63030530-702c7880-beed-11e9-9474-14fc97404eaa.gif)

### Refactor Shortcuts, Expression Selector

IntelliJ offers shortcut keys for individual refactor actions e.g. extract variable or function.
Picker will be shown to select target Expression under cursor.

![intelli-extract](https://user-images.githubusercontent.com/400558/63030551-7589c300-beed-11e9-8ab4-e10c0182a7e0.gif)

## Default Keybindings

| Win              | Mac                                      | Action                                      | Type       |
| ---------------- | ---------------------------------------- | ------------------------------------------- | ---------- |
| Alt+Enter        | Alt+Enter                                | Quick Fix                                   | Nearest    |
| Ctrl+Shift+Alt+T | Ctrl+Shift+Alt+T<br>(Ctrl+T in IntelliJ) | Refactor This                               | Nearest    |
| F6               | F6                                       | Move                                        | Nearest    |
| Ctrl+Alt+V       | Command+Alt+V                            | Extract Local Variable                      | Expression |
| Ctrl+Alt+C       | Command+Alt+C                            | Extract Constant (including Local Variable) | Expression |
| Ctrl+Alt+M       | Command+Alt+M                            | Extract Method                              | Expression |
| Ctrl+Shift+Alt+A | Command+Shift+Alt+A                      | Extract Type Alias                          | Expression |

## Requirements

Supported minimum VSCode version is `1.38` (including insider).
Older versions have bug around retrieving code actions, which is fixed in [microsoft/vscode#77999](https://github.com/microsoft/vscode/pull/77999).

## Extension Settings

- `intelli-refactor.useCompatSelection`: Enable this if you are using old refactor extension and getting unexpected `No code actions available` message after selection expanded. See [microsoft/vscode#49024](https://github.com/microsoft/vscode/issues/49024) for detail. Selection will blink while loading actions.

## Known Issues

Currently only TypeScript/JavaScript is supported.

## Notices

Icon is based on [vscode's lightbulb icon](https://github.com/microsoft/vscode/blob/2bceb25547ab539f565d68b6dfcef96e32da455f/src/vs/editor/contrib/codeAction/lightbulb-dark.svg).
