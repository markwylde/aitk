import chalk from "chalk";
import { listModels, queryModel } from "./ai";
import selectModel from "./selectModel";
import listFiles from "./listFiles";
import path from "path";
import { jsonrepair } from "jsonrepair";
import fs from "fs";
import clipboard from 'clipboardy';

// extract code from markdown json block:
// example:
// ```json
// console.log(1)
// ```
const extractJsonBlock = (text) => {
  const match = text.match(/`{3}json\n(.*)\n`{3}/s);
  if (match) {
    return JSON.parse(jsonrepair(match[1]));
  }
  return JSON.parse(jsonrepair(text));
}

export async function prompt (context, question) {
  if (!question) {
    console.error('Please provide a question after the "ask" command.');
    return;
  }

  const { command } = context;

  const modelsResponse = await listModels();
  const modelChoices = modelsResponse.data.map(model => model.id);
  const selectedModel = await selectModel(modelChoices);

  // List all the projects files:
  let input = `
Later on, you are going to implement the following change for the user:
${question}

But first, you need to know about the current project.

Here is my current list of files. Please reply with a single code block, and no commentary, with a JSON array, of the full file names you would like me to send to you so you can action this request.
  `;

  const directories = [process.cwd()];
  directories.forEach(directory => {
    const baseName = path.basename(directory);
    input += listFiles(directory, command === 'cat', '', baseName);
  });

  // Query the AI
  console.log(chalk.green('[question]:\n'), input);
  process.stdout.write(chalk.cyan('[answer]:') + ' ');
  const filesToSendRaw = await queryModel({
    stream: true,
    model: selectedModel,
    messages: [{
      content: input,
      role: 'user'
    }]
  });

  const filesToSend = extractJsonBlock(filesToSendRaw);

  console.log('Here is your prompt');
  console.log('-------------------');
  console.log('');

  let output = '';
  filesToSend.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    output += `file: ${file}`
    output += `\n`
    output += 'content:'
    output += `\n`
    output += fileContent
    output += `\n`
  });

  output += question;

  console.log(output);

  console.log('-------------------');

  clipboard.writeSync(output);

  console.log('Your prompt has been copied to your clipboard.');
}
