#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import minimist from 'minimist';
import inquirer from 'inquirer';
import chalk from 'chalk';

import listTypesAndFunctions from '../src/listTypesAndFunctions';
import listFiles from '../src/listFiles';
import { queryModel, listModels } from '../src/ai';

const argv = minimist(process.argv.slice(2));

const helpMessage = `
Usage: aitk [command] [options] [directory1] [directory2] ...

Commands:
  cat     Dump all file contents into a text file
  ls      Show a recursive directory tree of all files
  types   List all types and function signatures for TypeScript and JavaScript files
  ask     Ask a question to an AI model
  help    Show this help message

Options:
  --help  Show help message

Examples:
  aitk ask "Who are you?"
  aitk cat ./src
  aitk ls ./src ./tests
  aitk types ./src
`;

async function selectModel(models: string[]): Promise<string> {
  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Select a model:',
      choices: models,
    },
  ]);
  return model;
}

async function main() {
  if (argv.help || argv._.includes('help') || argv._.length === 0) {
    console.log(helpMessage);
    return;
  }

  const command = argv._[0];
  const directories = argv._.slice(1);

  if (directories.length === 0 && command !== 'ask') {
    directories.push(process.cwd());
  }

  let output = '';

  switch (command) {
    case 'cat':
    case 'ls':
      directories.forEach(directory => {
        if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
          console.error(`Error: "${directory}" is not a valid directory.`);
          return;
        }
        const baseName = path.basename(directory);
        output += listFiles(directory, command === 'cat', '', baseName);
      });
      console.log(output);
      if (command === 'cat') {
        console.log('File contents dumped to output.txt');
      }
      break;
      case 'ask':
        const question = argv._.slice(1).join(' ');
        if (!question) {
          console.error('Please provide a question after the "ask" command.');
          return;
        }
        const modelsResponse = await listModels();
        const modelChoices = modelsResponse.data.map(model => model.id);
        const selectedModel = await selectModel(modelChoices);

        console.log(chalk.green('[question]:'), question);
        process.stdout.write(chalk.cyan('[answer]:') + ' ');
        await queryModel({
          stream: true,
          model: selectedModel,
          messages: [{
            content: question,
            role: 'user'
          }]
        });
        console.log();
        break;
    case 'types':
      directories.forEach(directory => {
        if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
          console.error(`Error: "${directory}" is not a valid directory.`);
          return;
        }
        output += listTypesAndFunctions(directory);
      });
      console.log(output);
      break;
    default:
      console.log('Invalid command. Use "aitk help" for usage information.');
  }
}

main();
