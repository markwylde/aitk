import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import fs from 'node:fs';
import path from 'node:path';

const ignore = [
  '.git',
  'data',
  'dist',
  'node_modules',
  '.DS_Store',
  'package-lock.json',
  '.env'
];

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

type Tool = {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
  };
  handler: (input: any) => string;
};

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string | { type: string; [key: string]: any }[];
};

type AiContextOptions = {
  onChunk?: (chunk: any) => void;
  tools: Tool[];
  initialMessages?: Message[];
  systemPrompt?: string;
  model?: string;
};

function createClaudeContext(options: AiContextOptions) {
  const { onChunk, tools, initialMessages = [], systemPrompt } = options;
  let allMessages: Message[] = [...initialMessages];

  return {
    async send(prompt: string) {
      const toolsForApi = tools.map(({ name, description, input_schema }) => ({
        name,
        description,
        input_schema,
      }));

      let messages: Message[] = [...allMessages, { role: "user", content: prompt }];
      allMessages.push({ role: "user", content: prompt });
      let finalResponse = '';

      while (true) {
        try {
          const response = await anthropic.messages.create({
            system: systemPrompt,
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 4096,
            messages: messages,
            tools: toolsForApi,
            tool_choice: { type: 'auto' }
          });

          onChunk?.(response);

          const toolUses = response.content.filter(content => content.type === 'tool_use');

          if (toolUses.length > 0) {
            const toolResults = [];

            for (const toolUse of toolUses) {
              const tool = tools.find(t => t.name === toolUse.name);

              if (tool) {
                const toolResult = tool.handler(toolUse.input);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: toolResult
                });
              }
            }

            messages.push({ role: "assistant", content: response.content });
            allMessages.push({ role: "assistant", content: response.content });
            messages.push({
              role: "user",
              content: toolResults
            });
            allMessages.push({
              role: "user",
              content: toolResults
            });
          } else {
            finalResponse = response.content.map(m => m.type === 'text' ? m.text : JSON.stringify(m)).join('\n');
            allMessages.push({ role: "assistant", content: response.content });
            break;
          }
        } catch (error) {
          console.error('Error during API call:', error);
          throw error;
        }
      }

      return finalResponse;
    },

    getMessages() {
      return allMessages;
    },
  };
}

function createOpenRouterContext(options: AiContextOptions) {
  const { onChunk, initialMessages = [], systemPrompt, model } = options;
  let allMessages: Message[] = [...initialMessages];

  if (systemPrompt) {
    allMessages.unshift({ role: 'system', content: systemPrompt });
  }

  return {
    async send(prompt: string) {
      allMessages.push({ role: 'user', content: prompt });

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": `${process.env.YOUR_SITE_URL}`,
            "X-Title": `${process.env.YOUR_SITE_NAME}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model || "meta-llama/llama-3.1-8b-instruct",
            messages: allMessages.map(msg => ({
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            }))
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (onChunk) {
          onChunk(data);
        }

        const assistantReply = data.choices[0].message.content;
        allMessages.push({ role: 'assistant', content: assistantReply });

        return assistantReply;
      } catch (error) {
        console.error('Error during API call:', error);
        throw error;
      }
    },

    getMessages() {
      return allMessages;
    },
  };
}

function listFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !ignore.includes(path.basename(file))) {
      results = results.concat(listFilesRecursively(file));
    } else if (!ignore.includes(path.basename(file))) {
      results.push(file);
    }
  });

  return results;
}

// Usage example
const llama = createOpenRouterContext({
  model: 'meta-llama/llama-3.1-8b-instruct',
  systemPrompt: "You are an AI assistant that takes some existing code, applies some requested changes exactly as stated, and outputs the completed new file.",
  initialMessages: [],
  tools: []
});

const claude = createClaudeContext({
  initialMessages: [],
  systemPrompt: "You are an automated machine that is tasked with completing a developers job. Always read a file before you edit it. When you are ready, just tell the user what files to change, along with code snippets of what to change.",
  // onChunk: a => console.log(JSON.stringify(a, null, 2)),
  tools: [
    {
      name: 'listFiles',
      description: 'list every file recursively in the project directory',
      input_schema: {
        "type": "object",
        "properties": {},
      },
      handler: () => {
        const files = listFilesRecursively(process.cwd());
        return JSON.stringify(files);
      }
    },
    {
      name: 'readFiles',
      description: 'read the contents of multiple files',
      input_schema: {
        type: 'object',
        properties: {
          filepaths: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: "an array of file paths to read"
          }
        },
      },
      handler: (input) => {
        const fileContents = input.filepaths.map(filepath => {
          const content = fs.readFileSync(filepath, 'utf-8');
          return `
            ## ${filepath}
            \`\`\`text
            ${content}
            \`\`\`
          `;
        }).join('\n\n');
        return fileContents;
      }
    },
    {
      name: 'readFile',
      description: 'read the contents of a file',
      input_schema: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: "the path to the file you want to read"
          }
        },
      },
      handler: (input) => {
        const content = fs.readFileSync(input.filepath, 'utf-8');
        return JSON.stringify(`
          ## ${input.filepath}
          \`\`\`text
          ${content}
          \`\`\`
        `);
      }
    }
  ]
});

const parseJsonFromAi = text => {
  const match = text.match(/`{3}.*?\n([\s\S]*?)\n`{3}/);

  if (match) {
    return JSON.parse(jsonrepair(match[1]));
  }
  return JSON.parse(jsonrepair(text));
}

export async function develop (context, prompt) {
  if (!prompt) {
    console.error('Please provide a prompt after the "develop" command.');
    return;
  }

  try {
    const reply = await claude.send(prompt);
    console.log(reply);

    const second = await llama.send([
      '---',
      'The user is trying to do the following:',
      reply,
      '---',
      'Claude has suggested the following:',
      reply,
      '---',
      'Can you give me a list of files that Claude would like us to change.',
      'Reply with only a single codeblock with an array of strings.',
      'e.g.:',
      '["file1.ts", "folder1/file2.ts"]'
    ].join('\n\n'));

    const files = parseJsonFromAi(second);
    files.forEach(async file => {
      const third = await llama.send([
        `Lets change just one file at a time. Only change the ${file}. Leave all other files and change requests alone.`,
        `Respond with only one codeblock, and nothing around it, for the ${file}`,
        `Here is the current existing content for "${file}":`,
        '```',
        await fs.promises.readFile(file, 'utf-8').catch(() => 'file does not exist yet'),
        '```',
        '',
        'Apply the changes to this file, as per Claudes recommendation above, and respond with the full file in a single codeblock'
      ].join('\n\n'));
      console.log('******S:', file, '*****');
      console.log(third);
      console.log('******E:', file, '*****');

      // Ensure directory exists
      fs.mkdirSync(path.dirname(file), { recursive: true });

      // Write the changes to the file
      fs.writeFileSync(file, third.replace(/^```[\s\S]*?\n([\s\S]*?)\n```$/m, '$1').trim());
    });
  } finally {
    console.log(JSON.stringify(claude.getMessages(), null, 2));
    console.log(JSON.stringify(llama.getMessages(), null, 2));
  }
}
