import chalk from "chalk";
import { listModels, queryModel } from "./ai";
import selectModel from "./selectModel";

export async function ask (question) {
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
}
