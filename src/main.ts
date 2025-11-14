#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk"; 
import figlet from "figlet";
import ora from "ora";
import Conf from 'conf';
import LLMCore from "./core.js";

const program = new Command();
const config = new Conf({projectName: 'arka-cli'});

program
    .version("0.0.1")
    .description("your assistant at your step")

program.
    command('set-api')
    .description('Set api for your model')
    .argument('<string>','api')
    .action((api)=>{
        config.set('api',api);
        // console.log(config.get("api"));
    })

program.
    command('see-api')
    .action(()=>{
        const api = config.get("api");
        console.log( api ? api : "Undefined");
    })

program
    .command('calculate')
    .description('Run a given calculation')
    .argument('<number>','number to calculate')
    .option('--sum <value>','sum')
    .option('--diff <value>','difference')
    .option('--div <value>','divide')
    .option('--mul <value>','multiply')
    .option('--fac <value>','factorial')
    .action((number , options) => {
        if(options.sum){
            const spinner = ora({spinner:"dots8Bit"}).start();
            setTimeout(()=>{
                spinner.stop();
                console.log(chalk.bold(Number(number) + Number(options.sum)));
            },5000);
        }
    })

program
    .command('ask')
    .description('Ask your assistant any question')
    .argument('<query...>',"query you want to be answered")
    .action(async (allArgs)=>{
        const query = allArgs.join(' ');
        const spinner = ora({spinner:"dots8Bit"}).start();
        if(!config.get("api")){
            spinner.fail("Api key not found");
            process.exit(1);
        }else{
            try {
                // console.log(query);
                const api_key = config.get("api") as string | undefined;
                if(!api_key) throw new Error("API_KEY not found")
                const llm = new LLMCore(api_key);
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