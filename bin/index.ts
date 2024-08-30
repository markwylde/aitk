#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import minimist from 'minimist';
import chalk from 'chalk';

import listTypesAndFunctions from '../src/listTypesAndFunctions';
import listFiles from '../src/listFiles';
import { queryModel, listModels } from '../src/ai';
import editFiles from '../src/editFiles';
import selectModel from '../src/selectModel';

const argv = minimist(process.argv.slice(2));

const helpMessage = `
Usage: aitk [command] [options] [directory1] [directory2] ...

Commands:
  cat     Dump all file contents into a text file
  ls      Show a recursive directory tree of all files
  types   List all types and function signatures for TypeScript and JavaScript files
  ask     Ask a question to an AI model
  edit    Apply AI-powered edits to files in the current directory
  help    Show this help message

Options:
  --help  Show help message

Examples:
  aitk ask "Who are you?"
  aitk cat ./src
  aitk ls ./src ./tests
  aitk types ./src
  aitk edit "Refactor the main function to use async/await"
`;

async function main() {
  if (argv.help || argv._.includes('help') || argv._.length === 0) {
    console.log(helpMessage);
    return;
  }

  const command = argv._[0];
  const args = argv._.slice(1);
  const directories = argv._.slice(1);
  if (directories.length === 0) {
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
    case 'edit':
      if (args.length === 0) {
        console.error('Please provide an edit instruction after the "edit" command.');
        return;
      }
      const editInstruction = args.join(' ');
      const currentDirectory = process.cwd();
      await editFiles([currentDirectory], editInstruction);
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
