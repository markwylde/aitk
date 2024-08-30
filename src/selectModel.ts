import inquirer from "inquirer";

export default async function selectModel(models: string[]): Promise<string> {
  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Select a model:',
      choices: models,
    },
  ]);
  return model;
}
