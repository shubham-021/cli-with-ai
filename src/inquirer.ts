import inquirer from "inquirer";
import { getModelsForProvider, Providers } from "./types.js";

export async function selectProviderandModel(){
    const {provider} = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select a provider from the list: ',
            choices: Object.values(Providers)
        }
    ]);

    const availableModels = getModelsForProvider(provider as Providers);

    const {model} = await inquirer.prompt([
        {
            type: 'list',
            name: 'model',
            message: `Select a ${provider} model from the list: `,
            choices: availableModels
        }
    ]);

    return {provider,model};
}