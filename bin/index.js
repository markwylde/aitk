#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

const ignore = ['.terraform.lock.hcl', '.terraform', '.git', '.DS_Store', 'node_modules', 'package-lock.json', 'coverage'];
const ignoreExtensions = ['png', 'svg', 'jpg', 'jpeg', 'bin'];

// Function to list all files recursively
function listFiles(dir, dumpContent = false, output = '', baseDir = dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach(file => {
      const ext = file.name.split('.').at(-1);
      if (ignore.includes(file.name) || ignoreExtensions.includes(ext)) {
          return;
      }
      const filePath = path.join(dir, file.name);
      const relativePath = path.relative(baseDir, filePath);
      if (file.isDirectory()) {
          output = listFiles(filePath, dumpContent, output, baseDir);
      } else {
          if (dumpContent) {
            output += `# ${relativePath}\n`;
          } else {
            output += `- ${relativePath}\n`;
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
Usage: aitk [command] [directory]

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
    const directory = argv._[1] || process.cwd();

    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        console.error(`Error: "${directory}" is not a valid directory.`);
        return;
    }

    let output = '';

    switch (command) {
        case 'cat':
            output = listFiles(directory, true);
            console.log(output);
            console.log('File contents dumped to output.txt');
            break;
        case 'ls':
            output = listFiles(directory, false);
            console.log(output);
            break;
        default:
            console.log('Invalid command. Use "aitk help" for usage information.');
    }
}

main();
