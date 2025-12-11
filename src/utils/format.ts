import chalk from 'chalk';

export function formatToolArgs(toolName: string, args: Record<string, any>): string {
    switch (toolName) {
        case 'execute_command':
            return `\n  ${chalk.bgGray.white(' COMMAND ')} ${chalk.cyan(args.command)}`;

        case 'web_search':
            return `\n  ${chalk.bgBlue.white(' SEARCH ')} ${chalk.yellow(args.query)}`;

        case 'read_file':
            return `\n  ${chalk.bgGreen.black(' READ ')} ${chalk.green(args.path)}`;

        case 'write_file':
        case 'create_file':
            return `\n  ${chalk.bgMagenta.white(' WRITE ')} ${chalk.magenta(args.path)}`;

        case 'delete_file_dir':
            return `\n  ${chalk.bgRed.white(' DELETE ')} ${chalk.red(args.path)}`;

        case 'make_dir':
            return `\n  ${chalk.bgYellow.black(' MKDIR ')} ${chalk.yellow(args.path)}`;

        case 'http_request':
            return `\n  ${chalk.bgCyan.black(' HTTP ')} ${chalk.cyan(args.method ?? 'GET')} ${args.url}`;

        default:
            const summary = Object.entries(args)
                .map(([k, v]) => `${chalk.dim(k)}: ${chalk.white(String(v).slice(0, 50))}`)
                .join(', ');
            return `\n  ${summary}`;
    }
}

export function formatApprovalPrompt(toolName: string, args: Record<string, any>): string {
    const header = chalk.bold.yellow(`\n⚡ Tool Request: ${toolName}`);
    const body = formatToolArgs(toolName, args);
    return `${header}${body}\n`;
}