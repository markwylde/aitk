import path from 'node:path';
import fs from 'node:fs';
import { listModels, queryModel } from "./ai";
import listFiles from "./listFiles";
import selectModel from "./selectModel";
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import open from 'open';
import { diffLines } from 'diff';

interface FileResponse {
  fileName: string;
  prompt: string;
  response: string;
  originalContent: string;
  suggestedContent: string;
}

export default async function editFiles(directories: string[], editInstruction: string) {
  const allFiles: string[] = [];
  directories.forEach(directory => {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      console.error(`Error: "${directory}" is not a valid directory.`);
      return;
    }
    const files = listFiles(directory, false, '', path.basename(directory)).split('\n');
    allFiles.push(...files.filter(file => file.trim() !== ''));
  });

  console.log(chalk.cyan('The following files will be sent to the AI:'));
  allFiles.forEach(file => console.log(`- ${file}`));
  console.log('\n');

  const modelsResponse = await listModels();
  const modelChoices = modelsResponse.data.map(model => model.id);
  const selectedModel = await selectModel(modelChoices);

  const batchSize = 5;

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(allFiles.length, 0);

  let processedCount = 0;
  const fileResponses: FileResponse[] = [];

  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);

    await Promise.all(batch.map(async (file) => {
      const originalContent = fs.readFileSync(file, 'utf-8');
      const prompt = `
        Here's a file content:
        \`\`\`
        ${originalContent}
        \`\`\`
        ${editInstruction}.

        Your EXACT response will automatically replace the inputted file above, therefore it's
        absolutely critical you reply with only the change and no commentary or explanation.

        Only respond with the new file content in full, wrapped in triple backticks.
      `;

      try {
        const result = await queryModel({
          stream: false,
          model: selectedModel,
          messages: [{
            content: prompt,
            role: 'user'
          }]
        });

        const codeBlockRegex = /```(?:[\w]*\n)?([\s\S]*?)```/;
        const match = result.match(codeBlockRegex);

        let suggestedContent: string;
        if (match && match[1]) {
          suggestedContent = match[1].trim();
        } else {
          console.warn(`Warning: No code block found in the response for file ${file}`);
          suggestedContent = result.trim();
        }

        fs.writeFileSync(file, suggestedContent + '\n');

        fileResponses.push({
          fileName: file,
          prompt: prompt,
          response: result,
          originalContent: originalContent,
          suggestedContent: suggestedContent
        });
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }

      processedCount++;
      progressBar.update(processedCount);
    }));
  }

  progressBar.stop();
  console.log(chalk.green('All files processed successfully!'));

  // Generate and open HTML file
  generateAndOpenHtml(fileResponses);
}

function generateAndOpenHtml(fileResponses: FileResponse[]) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AI Responses</title>
      <style>
        body {
          display: flex;
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
        #sidebar {
          width: 250px;
          height: 100vh;
          overflow-y: auto;
          background-color: #f0f0f0;
          padding: 20px;
        }
        #content {
          flex-grow: 1;
          height: 100vh;
          overflow-y: auto;
          padding: 20px;
        }
        pre {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 5px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .tabs {
          display: flex;
          margin-bottom: 10px;
        }
        .tab {
          padding: 10px;
          cursor: pointer;
          background-color: #ddd;
          border: 1px solid #ccc;
          border-bottom: none;
          margin-right: 5px;
        }
        .tab.active {
          background-color: #f5f5f5;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
        .diff-added {
          background-color: #e6ffed;
        }
        .diff-removed {
          background-color: #ffeef0;
        }
      </style>
    </head>
    <body>
      <div id="sidebar">
        <h2>Files</h2>
        <ul>
          ${fileResponses.map(file => `<li><a href="#${encodeURIComponent(file.fileName)}">${file.fileName}</a></li>`).join('')}
        </ul>
      </div>
      <div id="content">
        ${fileResponses.map((file, index) => `
          <h2 id="${encodeURIComponent(file.fileName)}">${file.fileName}</h2>
          <div class="tabs">
            <div class="tab" onclick="showTab(${index}, 'prompt')">Prompt</div>
            <div class="tab active" onclick="showTab(${index}, 'response')">Response</div>
            <div class="tab" onclick="showTab(${index}, 'original')">Original File</div>
            <div class="tab" onclick="showTab(${index}, 'suggested')">Suggested File</div>
            <div class="tab" onclick="showTab(${index}, 'diff')">Diff</div>
          </div>
          <div class="tab-content" id="prompt-${index}">
            <pre>${file.prompt}</pre>
          </div>
          <div class="tab-content active" id="response-${index}">
            <pre>${file.response}</pre>
          </div>
          <div class="tab-content" id="original-${index}">
            <pre>${file.originalContent}</pre>
          </div>
          <div class="tab-content" id="suggested-${index}">
            <pre>${file.suggestedContent}</pre>
          </div>
          <div class="tab-content" id="diff-${index}">
            <pre>${generateDiff(file.originalContent, file.suggestedContent)}</pre>
          </div>
        `).join('')}
      </div>
      <script>
        function showTab(fileIndex, tabName) {
          const tabs = document.querySelectorAll(\`[onclick^="showTab(\${fileIndex},"]\`);
          const contents = document.querySelectorAll(\`[id$="-\${fileIndex}"]\`);

          tabs.forEach(tab => tab.classList.remove('active'));
          contents.forEach(content => content.classList.remove('active'));

          document.querySelector(\`[onclick="showTab(\${fileIndex}, '\${tabName}')"]\`).classList.add('active');
          document.getElementById(\`\${tabName}-\${fileIndex}\`).classList.add('active');
        }
      </script>
    </body>
    </html>
  `;

  const outputPath = path.join(process.cwd(), 'ai_responses.html');
  fs.writeFileSync(outputPath, html);
  console.log(chalk.blue(`HTML file generated: ${outputPath}`));

  // Open the HTML file in the default browser
  open(outputPath);
}

function generateDiff(originalContent: string, suggestedContent: string): string {
  const diff = diffLines(originalContent, suggestedContent);
  return diff.map(part => {
    const color = part.added ? 'diff-added' : part.removed ? 'diff-removed' : '';
    return `<span class="${color}">${part.value}</span>`;
  }).join('');
}
