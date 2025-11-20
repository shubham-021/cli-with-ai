import inquirer from "inquirer";
import { getModelsForProvider, Providers } from "./types.js";

export async function selectProviderandModel(){
    const providerList = [...Object.values(Providers),"exit"];
    const {provider} = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select a provider from the list: ',
            choices: providerList
        }
    ]);

    if(provider === "exit") process.exit(1);

    const availableModels = getModelsForProvider(provider as Providers);
    availableModels.push("exit");

    const {model} = await inquirer.prompt([
        {
            type: 'list',
            name: 'model',
            message: `Select a ${provider} model from the list: `,
            choices: availableModels
        }
    ]);

    if(model === "exit") process.exit(1);

    return {provider,model};
}

export async function selectModel(provider:string){
    const availableModels = getModelsForProvider(provider as Providers);
    availableModels.push("exit");

    const {model} = await inquirer.prompt([
        {
            type: 'list',
            name: 'model',
            message: `Select a ${provider} model from the list: `,
            choices: availableModels
        }
    ]);

    if(model === "exit") process.exit(1);

    return model;
}

export async function selectConfig(configList:string[]){
    const {config_s} = await inquirer.prompt([
        {
            type: 'list',
            name: 'config_s',
            message: `Select from the list: `,
            choices: configList
        }
    ]);

    return config_s;
}