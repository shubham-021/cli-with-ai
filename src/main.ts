#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import ora from "ora";
import Conf from 'conf';
import LLMCore from "./core.js";
import { getInputPrompt_In, getListPrompt_In } from "./inquirer.js";
import { Config, getModelsForProvider } from "./types.js";
import { Providers } from "./providers/index.js";
import { delete_curr_STMemory } from "./memory/memory.js";

const program = new Command();
const config = new Conf({ projectName: 'arka-cli' });

program
    .version("0.0.1")
    .description("Your ai assistant in your cli")
    .addHelpText('after', `
        Getting Started:
          1. Configure your provider and model: arka configure -n <config_name>
          2. Set your API key: arka -n <config_name> set-api --api <api_key>
          3. Set you API key for tavily: arka -n <config_name> set-api --search <api_key>
          4. Start asking questions: arka ask "your question"
        
        Example:
          $ arka configure
          $ arka set-api --api <api_key>
          $ arka set-api --search <api_key>
          $ arka ask Who won the recent fifa worldcup and why is ronaldo crying
    `);

program
    .command('set-api')
    .description('Set api for your model and search agent')
    .option('-n <value>', 'name')
    .option('--api <value>', 'api')
    .option('--search <value>', 'search_api')
    .action((options) => {

        const { n, api, search } = options;

        if (!n) {
            console.log(chalk.yellow.bold("Provide config name using -n flag"));
            process.exit(1);
        }

        const set_config = config.get(n) as Config;
        if (!set_config || set_config == undefined) {
            console.log(chalk.bold.red("No config exists with this name.\n"));
            console.log(chalk.bold.red("Are you sure , you have configured your cli before ?"));
            process.exit(1);
        }

        if (search) {
            config.set(`${n}.search_api`, search);
            console.log(chalk.greenBright("Api set for search agent"));
        }

        const provider = set_config.provider;
        const model = set_config.model;

        if (api) {
            config.set(`${n}.api`, api);
            console.log(chalk.greenBright(`Api set for ${n} : ${provider} - ${model}`));
        };
    })

program
    .command("delete-config")
    .option("-n <value>", "name")
    .action(async (options) => {
        const { n } = options;
        if (!n) {
            console.log(chalk.yellow.bold("Provide config name using -n flag"));
            process.exit(1);
        }
        config.delete(n);
    })

program
    .command('see-api')
    .action(() => {
        const default_config = config.get("default") as string;
        const api_obj = config.get(default_config) as Config;
        const api = api_obj?.api
        const search_api = api_obj?.search_api;
        console.log(api ? chalk.bold.green("Api: ", api, "\n") : chalk.bold.red("Api not set\n"), search_api ? chalk.bold.green("Search_api: ", search_api) : chalk.bold.red("Search api not set"));
    })


program
    .command('ask')
    .description('Ask your assistant any question')
    .argument('<query...>', "query you want to be answered")
    .action(async (allArgs) => {
        const query = allArgs.join(' ');
        const spinner = ora({ spinner: "dots8Bit" }).start();
        const default_config = config.get("default") as string;
        if (!default_config) {
            console.log(chalk.redBright.bold("You have not configured your cli yet"));
            process.exit(1);
        }
        const set_config = config.get(default_config) as Config;
        // console.log(JSON.stringify(set_config));
        if (!set_config) {
            spinner.fail("You haven't configured your provider and model yet");
            process.exit(1);
        } else {
            const search_api = set_config.search_api;
            const api = set_config.api;

            if (!api && !search_api) {
                spinner.fail("Api not found, Please set api for llm provider and search agent");
                process.exit(1);
            }

            if (!api) {
                spinner.fail("Api not found, Please set api for your provider");
                process.exit(1);
            }

            if (!search_api) {
                spinner.fail("Search api not found, Please set api for your search agent");
                process.exit(1);
            }

            try {
                const llm = new LLMCore(set_config.provider, set_config.model, api, search_api);
                spinner.stop();
                // console.log(chalk.cyan.bold("\n🤖: ", res));
                process.stdout.write(chalk.cyan.bold("\n🤖: "));
                for await (const chunk of llm.chat(query)) {
                    process.stdout.write(chalk.cyan(chunk));
                }
                process.stdout.write("\n");
            } catch (error) {
                spinner.fail('Failed to get response');
                console.error(chalk.red((error as Error).message));
                process.exit(1);
            }
        }
    })

program
    .command('switch')
    .option('-n <value>')
    .action((options) => {
        const { n } = options;
        if (!n) {
            console.log(chalk.yellowBright.bold("Provide the name of the config using -n flag"));
            process.exit(1);
        }

        const _config = config.get(n);
        if (!_config) {
            console.log(chalk.redBright.bold("No config exist with this name"));
            process.exit(1);
        }

        const default_config = config.get("default");

        if (default_config === n) {
            console.log(chalk.yellowBright.bold(`Config ${n} is already set as default`));
            process.exit(1);
        }

        config.set("default", n);
        console.log(chalk.greenBright.bold(`Config ${n} is set as default`));
    })

program
    .command('configure')
    .description('Configure AI provider and model')
    .option("-n <value>", "name")
    .option("-m", "model")
    .option("-p", "provider")
    .action(async (options) => {
        const { n, m, p } = options;

        if (m) {
            let conf_name = n ?? "default";
            // console.log(conf_name);
            if (conf_name === "default") conf_name = config.get(conf_name);
            const _config = config.get(conf_name) as Config;
            // console.log(_config);
            // console.log(_config?.provider)
            if (!_config || !_config.provider) {
                console.log(chalk.red.bold("This is only valid if you had any config before."));
                process.exit(1);
            }
            const provider = _config.provider;
            const availableModels = getModelsForProvider(provider);
            const choice = await getListPrompt_In([...availableModels, "exit"], `Select a ${provider} model from the list: `);

            if (choice === "exit") return;

            config.set(`${n}.model`, choice);
            process.exit(1);
        }

        if (p) {
            const conf_name = (!!n) ? n : "default";
            const _config = config.get(conf_name) as Config;
            if (!_config) {
                console.log(chalk.red.bold("This is only valid if you had any config before."));
                process.exit(1);
            }

            const providerList = [...Object.values(Providers), "exit"];
            const provider = await getListPrompt_In(providerList, "Select a provider from the list: ");

            if (provider === "exit") return;

            const availableModels = getModelsForProvider(provider as Providers);
            const model = await getListPrompt_In([...availableModels, "exit"], `Select a ${provider} model from the list: `);

            if (model === "exit") return;

            config.set(`${n}.provider`, provider);
            config.set(`${n}.model`, model);
            process.exit(1);
        }

        if (!n) {
            console.log(chalk.yellowBright.bold("Provide a name for your config using the -n flag"));
            process.exit(1);
        }

        if (config.has(n)) {
            console.log(chalk.yellowBright.bold("Config with this name already exists."));
            process.exit(1);
        }

        const providerList = [...Object.values(Providers), "exit"];
        const provider = await getListPrompt_In(providerList, "Select a provider from the list: ");

        if (provider === "exit") return;

        const availableModels = getModelsForProvider(provider as Providers);
        const model = await getListPrompt_In([...availableModels, "exit"], `Select a ${provider} model from the list: `);

        if (model === "exit") return;

        config.set(n, { provider, model, api: "", search_api: "" })
        config.set("default", n);
        console.log(chalk.greenBright(`Selected: ${provider} - ${model} \n`));
        console.log(chalk.yellowBright.bold("Set your api key by running the command <set-api> \n"));
    })

program
    .command("see-config")
    .action(async () => {
        const all_config = config.store;
        const config_names = Object.keys(all_config).filter((name) => name !== "default");
        config_names.push("exit");
        const config_s = await getListPrompt_In(config_names, "Select from the list: ");

        if (config_s === "exit") process.exit(1);

        const get_config = config.get(config_s) as Config;

        const payload = {
            "config": config_s,
            "provider": get_config?.provider,
            "model": get_config?.model,
            "api": get_config?.api
        };

        console.log(chalk.cyan.bold(JSON.stringify(payload)));
        process.exit(1);
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

async function interactiveShell() {
    console.log(chalk.cyan(figlet.textSync("Arka", { horizontalLayout: "full", verticalLayout: "full", width: 180 })));
    console.log(chalk.yellow("\nEntering interactive mode. Type 'q' or 'quit' to exit, or 'help' for commands."));

    const handleAsk = async (query: string) => {
        const spinner = ora({ spinner: "dots8Bit" }).start();
        const default_config = config.get("default") as string;
        if (!default_config) {
            console.log(chalk.redBright.bold("You have not configured your cli yet"));
            return;
        }
        const set_config = config.get(default_config) as Config;
        // console.log(JSON.stringify(set_config));
        if (!set_config) {
            spinner.fail("You haven't configured your provider and model yet");
            return;
        } else {
            const search_api = set_config.search_api;
            const api = set_config.api;

            if (!api && !search_api) {
                spinner.fail("Api not found, Please set api for llm provider and search agent");
                return;
            }

            if (!api) {
                spinner.fail("Api not found, Please set api for your provider");
                return;
            }

            if (!search_api) {
                spinner.fail("Search api not found, Please set api for your search agent");
                return;
            }

            try {
                const llm = new LLMCore(set_config.provider, set_config.model, api, search_api);
                spinner.stop();
                // const res = await llm.router(query);
                process.stdout.write('🤖: ');
                for await (const chunk of llm.chat(query)) {
                    process.stdout.write(chunk);
                };
                process.stdout.write('\n');
                // console.log(chalk.cyan.bold("\n🤖: ", res));
                // for await (const chunk of stream) {
                //     process.stdout.write(chunk);
                // }
                console.log("\n");
            } catch (error) {
                spinner.fail('Failed to get response');
                console.error(chalk.red((error as Error).message));
            }
        }
    };

    while (true) {
        try {
            const command = await getInputPrompt_In();
            const input = command.trim();

            if (input.toLowerCase() === 'q' || input.toLowerCase() === 'quit') {
                console.log(chalk.green("Exiting interactive mode. GoodBye!"));
                break;
            }

            if (input.toLowerCase() === 'help') {
                console.log(chalk.yellow(`
                    Available commands:
                      - Your Question: Just type your question and press Enter (e.g., Who won the recent World Cup?)
                      - q or quit: Exit the interactive shell.
                      - ctrl+c: Also exits the shell.
                      
                    To use configuration commands like \`configure\` or \`set-api\`, you must run them from your regular terminal:
                      $ arka configure -n myconfig
                      $ arka set-api --api <key>
                `));

                continue;
            }

            if (input.length > 0) {
                await handleAsk(input);
            }
        } catch (error) {
            if ((error as any).isTtyError) {
                console.error(chalk.red("Prompt error: Cannot run interactive shell in this terminal environment."));
            } else {
                console.error(chalk.red("An error occurred in the interactive shell: "), (error as Error).message);
            };
            break;
        }
    }
}

process.on('exit', delete_curr_STMemory);

process.on('SIGHUP', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

if (!process.argv.slice(2).length) {
    // console.log(chalk.cyan(figlet.textSync("Arka",{horizontalLayout:"full",verticalLayout:"full",width:180})));
    // program.outputHelp();
    interactiveShell();
} else {
    program.parse(process.argv);
}