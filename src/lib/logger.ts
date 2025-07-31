export class Logger {
    private toolName: string;

    constructor(toolName: string) {
        this.toolName = toolName;
    }

    private format(level: string, message: string, data?: unknown): string {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.toolName}] ${level}: ${message}`;

        if (data !== undefined) {
            return `${prefix} ${JSON.stringify(data)}`;
        }
        return prefix;
    }

    debug(message: string, data?: unknown): void {
        console.debug(this.format('DEBUG', message, data));
    }

    info(message: string, data?: unknown): void {
        console.info(this.format('INFO', message, data));
    }

    warn(message: string, data?: unknown): void {
        console.warn(this.format('WARN', message, data));
    }

    error(message: string, error?: unknown): void {
        if (error instanceof Error) {
            console.error(this.format('ERROR', message), error);
        } else {
            console.error(this.format('ERROR', message, error));
        }
    }
}
