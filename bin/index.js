#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

const ignore = ['.next', '.husky', '.terraform.lock.hcl', '.terraform', '.git', '.DS_Store', 'node_modules', 'package-lock.json', 'coverage'];
const ignoreExtensions = ['png', 'svg', 'jpg', 'jpeg', 'bin'];

// Function to list all files recursively
function listFiles(dir, dumpContent = false, output = '', baseDir = '', depth = 0) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach((file, index) => {
        const fileNameParts = file.name.split('.');
        const ext = fileNameParts.length > 1 ? fileNameParts.slice(-2).join('.') : fileNameParts[fileNameParts.length - 1];
        
        if (ignore.includes(file.name) || ignoreExtensions.includes(ext)) {
            return;
        }
        
        const filePath = path.join(dir, file.name);
        const relativePath = path.join(baseDir, path.relative(dir, filePath));
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
