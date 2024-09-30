# aitk (the ai toolkit)

AI Toolkit is a command-line utility for listing and dumping file contents in a directory structure, designed to assist with AI-related tasks. It now includes functionality to extract types and function signatures from TypeScript and JavaScript files, as well as AI-powered features for asking questions and editing files.

## Installation

To install the AI Toolkit globally, run:

```bash
npm install -g @markwylde/aitk
```

## Usage

```bash
aitk [command] [options] [directory1] [directory2] ...
```

## Configuration
If you want to use the litellm ai features, you will need to ensure the following environment
variables are set either in a near `.env` file, or in your shell environment:

```bash
export LITELLM_API_URL="http://localhost:4000"
export LITELLM_AUTH_TOKEN="your auth token"
```

### Commands

- `cat`: Dump all file contents into a text file
- `ls`: Show a recursive directory tree of all files
- `types`: List all types and function signatures for TypeScript and JavaScript files
- `ask`: Ask a question to an AI model
- `prompt`: Ask an AI model to generate a prompt for changing your code
- `edit`: Apply AI-powered edits to files in the current directory
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

4. Extract types and function signatures from TypeScript and JavaScript files:
   ```bash
   aitk types /path/to/directory
   ```

5. Ask a question to an AI model:
   ```bash
   aitk ask "Who are you?"
   ```

6. Apply AI-powered edits to files in the current directory:
   ```bash
   aitk edit "Refactor the main function to use async/await"
   ```

7. Show help message:
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
- Extracts and lists types and function signatures from TypeScript and JavaScript files
- AI-powered question answering
- AI-powered file editing with diff view and HTML report generation

## Ignore Rules

You can create a `.aitkignore` file in any directory to specify ignore rules. Additionally, a global `~/.aitkignore` file can be used for system-wide ignore rules. The syntax is similar to `.gitignore` files.

Example `.aitkignore` file:
```
node_modules
*.log
build/
```

This will ignore the `node_modules` directory, all files with the `.log` extension, and the `build` directory.

## Type and Function Extraction

The `types` command extracts and displays:
- Function declarations (including export status)
- Method declarations
- Arrow functions
- Interface declarations
- Type alias declarations
- Class declarations (including methods and properties)

This feature is particularly useful for quickly understanding the structure and API of TypeScript and JavaScript projects.

## AI-Powered Features

### Ask Command
The `ask` command allows you to ask questions to an AI model. It will prompt you to select a model from the available options and then provide an answer to your question.

### Edit Command
The `edit` command applies AI-powered edits to files in the current directory. It generates an HTML report with diffs between the original and suggested content, which opens automatically in your default browser.
