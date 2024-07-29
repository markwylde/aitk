# AI Toolkit (aitk)

AI Toolkit is a command-line utility for listing and dumping file contents in a directory structure, designed to assist with AI-related tasks.

## Installation

To install the AI Toolkit globally, run:

```bash
npm install -g @markwylde/ai-toolkit
```

## Usage

```bash
aitk [command] [directory]
```

### Commands

- `cat`: Dump all file contents into a text file
- `ls`: Show a recursive directory tree of all files
- `help`: Show the help message

### Options

- `--help`: Show help message

## Examples

1. List all files in the current directory:
   ```bash
   aitk ls
   ```

2. Dump contents of all files in a specific directory:
   ```bash
   aitk cat
   ```

3. Show help message:
   ```bash
   aitk help
   ```

## Features

- Recursively lists files in a directory
- Ignores specified files and directories (e.g., `.git`, `node_modules`)
- Ignores files with specific extensions (e.g., `png`, `svg`, `jpg`)
- Dumps file contents with file paths as headers
