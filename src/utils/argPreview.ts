export function getArgPreview(toolName: string, args: Record<string, any>): string {
    const key = args.query || args.path || args.command || args.url || args.filename || '';

    if (!key) return '';

    const preview = String(key).length > 40 ? String(key).slice(0, 40) + '...' : String(key);
    return `: ${preview}`;
}