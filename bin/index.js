#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import os from 'os';
import ignore from 'ignore';

// Read the global ~/.aitkignore file once at the start
const homeAitkignorePath = path.join(os.homedir(), '.aitkignore');
let globalIgnoreRules = [];
try {
  if (fs.existsSync(homeAitkignorePath)) {
    globalIgnoreRules = fs.readFileSync(homeAitkignorePath, 'utf8').split('\n').filter(line => line.trim() !== '');
  }
} catch (err) {
  console.error(`Error reading global .aitkignore file: ${err.message}`);
}

// Function to find the closest .aitkignore file
function findClosestAitkignore(dir) {
  let currentDir = dir;
  while (currentDir !== path.parse(currentDir).root) {
    const aitkignorePath = path.join(currentDir, '.aitkignore');
    if (fs.existsSync(aitkignorePath)) {
      return aitkignorePath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

// Function to read and parse .aitkignore files
function parseAitkignore(aitkignorePath) {
  if (!aitkignorePath) return [];
  try {
    return fs.readFileSync(aitkignorePath, 'utf8').split('\n').filter(line => line.trim() !== '');
  } catch (err) {
    console.error(`Error reading .aitkignore file: ${err.message}`);
    return [];
  }
}

// Function to list all files recursively
function listFiles(dir, dumpContent = false, output = '', baseDir = '', depth = 0) {
  const closestAitkignore = findClosestAitkignore(dir);

  const ignoreRules = [
    ...parseAitkignore(closestAitkignore),
    ...globalIgnoreRules
  ];

  const ig = ignore().add(ignoreRules);

  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach((file, index) => {
    const filePath = path.join(dir, file.name);
    const relativePath = path.relative(process.cwd(), filePath);

    if (ig.ignores(relativePath)) {
      return;
    }

    const isLast = index === files.length - 1;
    const prefix = depth === 0 ? '' : '  '.repeat(depth - 1) + (isLast ? '└─ ' : '├─ ');

    if (file.isDirectory()) {
      if (!dumpContent) {
        output += `${prefix}${file.name}/\n`;
      }
      output = listFiles(filePath, dumpContent, output, relativePath, depth + 1);
    } else {
      if (dumpContent) {
        output += `# ${relativePath}\n`;
      } else {
        output += `${prefix}${file.name}\n`;
      }
      if (dumpContent) {
        output += "```\n";
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          output += content + "\n";
        } catch (err) {
          output += `Error reading file: ${err.message}\n`;
        }
        output += "```\n\n";
      }
    }
  });
  return output;
}

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Help message
const helpMessage = `
Usage: aitk [command] [directory1] [directory2] ...

Commands:
  cat     Dump all file contents into a text file
  ls      Show a recursive directory tree of all files
  help    Show this help message

Options:
  --help  Show help message
`;

// Main function
function main() {
  if (argv.help || argv._.includes('help') || argv._.length === 0) {
    console.log(helpMessage);
    return;
  }

  const command = argv._[0];
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
      if (command === 'cat') {
        console.log('File contents dumped to output.txt');
      }
      break;
    default:
      console.log('Invalid command. Use "aitk help" for usage information.');
  }
}

main();
