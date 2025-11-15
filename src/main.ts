#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk"; 
import figlet from "figlet";
import ora, { spinners } from "ora";
import Conf from 'conf';
import LLMCore from "./core.js";
import { selectProviderandModel } from "./inquirer.js";
import { Config } from "./types.js";
import inquirer from "inquirer";

const program = new Command();
const config = new Conf({projectName: 'arka-cli'});

program
    .version("0.0.1")
    .description("Your ai assistant in your cli")

program
    .command('set-api')
    .description('Set api for your model')
    .argument('<api>')
    .action((api)=>{
        const set_config = config.get("config") as Config;
        if(!set_config || set_config == undefined){
            console.log(chalk.bold.red("Configure your model and provider first"));
            process.exit(1);
        }
        config.set("config.api",api);
        const provider = set_config.provider;
        const model = set_config.model;

        console.log(chalk.greenBright(`Api set for ${provider} - ${model}`));
    })

program
    .command('delete-api')
    .action((api)=>{
        config.delete('api');
        // console.log(config.get("api"));
    })

program 
    .command("delete-config")
    .action(async ()=>{
       config.delete("config");
    })

program
    .command('set-search-api')
    .description('Set api for your search model')
    .argument('<api>')
    .action((api)=>{
        config.set('search-api',api);
    })

program.
    command('see-api')
    .action(()=>{
        const api = config.get("api");
        console.log( api ? api : "Undefined");
    })


program
    .command('ask')
    .description('Ask your assistant any question')
    .argument('<query...>',"query you want to be answered")
    .action(async (allArgs)=>{
        const query = allArgs.join(' ');
        const spinner = ora({spinner:"dots8Bit"}).start();
        const set_config = config.get("config") as Config;
        // console.log(JSON.stringify(set_config));
        if(!set_config){
            spinner.fail("You haven't configured your provider and model yet");
            process.exit(1);
        }else{
            try {
                const search_api_key = config.get("search-api") as string | undefined;

                if(!set_config.api || set_config.api === ""){
                    spinner.fail("Api not found , Please set api for your provider");
                    process.exit(1);
                }

                const llm = new LLMCore(set_config.provider,set_config.model,set_config.api);
                if(search_api_key) llm.set_current_search(search_api_key);
                const res = await llm.query(query);
                spinner.stop();
                console.log(chalk.cyan.bold("\n🤖: ",res));
                // for await (const chunk of stream) {
                //     process.stdout.write(chunk);
                // }
                console.log("\n");
            } catch (error) {
                spinner.fail('Failed to get response');
                console.error(chalk.red((error as Error).message));
                process.exit(1);
            }
        }
    })

program
    .command('configure')
    .description('Configure AI provider and model')
    .action(async() => {
        const {provider , model} = await selectProviderandModel();
        config.set("config",{provider,model,api:""})
        console.log(chalk.greenBright(`Selected: ${provider} - ${model} \n`));
        console.log(chalk.yellowBright.bold("Set your api key by running the command <set-api> \n"));
    })

// process.argv returns an array containing all the command-line arguments passed when the Node.js process was launched.
// The array always has at least two elements by default.
// [
//     '/usr/local/bin/node',           // process.argv[0]
//     '/path/to/your/app.js',          // process.argv[1]
//     'calculate',                      // process.argv[2]
//     '--sum',                          // process.argv[3]
//     '5'                              // process.argv[4]
// ]

if (!process.argv.slice(2).length) {
    console.log(chalk.cyan(figlet.textSync("Arka",{horizontalLayout:"full",verticalLayout:"full",width:180})));
    program.outputHelp();
}

program.parse(process.argv);