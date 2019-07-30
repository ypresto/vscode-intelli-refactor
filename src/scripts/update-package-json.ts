import { commandTypes } from '../commandType';
import * as fs from 'fs';
import * as path from 'path';

function toTitle(command: string) {
  return command
    .replace(/\.(.)/g, (...m) => ' ' + m[1].toUpperCase()) // replace every dot to ' Camel'
    .replace(/^.*? /, '') // remove extension name prefix
    .replace(/([^ ])([A-Z])/g, (...m) => `${m[1]} ${m[2]}`); // CamelCase to Camel Case
}

function run() {
  const commands = commandTypes.map(({ command }) => ({
    command,
    title: toTitle(command) + '...',
    category: 'Intelli Refactor'
  }));
  const keyWhen = 'editorHasCodeActionsProvider && editorTextFocus && !editorReadonly';
  const keybindings = commandTypes
    .filter(({ key }) => key)
    .map(({ command, key, mac }) => ({ command, key, mac, when: keyWhen }));

  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString());

  packageJson.activationEvents = commandTypes.map(({ command }) => 'onCommand:' + command);
  packageJson.contributes.commands = commands;
  packageJson.contributes.keybindings = keybindings;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

run();
