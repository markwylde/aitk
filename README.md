# AI Toolkit (aitk)

AI Toolkit is a command-line utility for listing and dumping file contents in a directory structure, designed to assist with AI-related tasks.

## Installation

To install the AI Toolkit globally, run:

```bash
npm install -g @markwylde/ai-toolkit
```

## Usage

```bash
aitk [command] [directory1] [directory2] ...
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
   aitk cat /path/to/directory
   ```

3. List files in multiple directories:
   ```bash
   aitk ls /path/to/dir1 /path/to/dir2
   ```

4. Show help message:
   ```bash
   aitk help
   ```

## Features

- Recursively lists files in a directory
- Supports multiple directory inputs
- Uses .aitkignore files for custom ignoring rules
- Supports a global ~/.aitkignore file for system-wide ignore rules
- Dumps file contents with file paths as headers
- Displays directory structure with tree-like formatting

## Ignore Rules

You can create a `.aitkignore` file in any directory to specify ignore rules. Additionally, a global `~/.aitkignore` file can be used for system-wide ignore rules. The syntax is similar to `.gitignore` files.

Example `.aitkignore` file:
```
node_modules
*.log
build/
```

This will ignore the `node_modules` directory, all files with the `.log` extension, and the `build` directory.
