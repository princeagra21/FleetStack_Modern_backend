import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

interface CsvTransportOptions extends winston.transports.FileTransportOptions {
    csvDir?: string;
    csvHeaders?: string[];
}

export class CsvTransport extends winston.transports.File {
    private csvDir: string;
    private csvHeaders: string[];
    private currentDate: string = '';
    private currentFilePath: string = '';

    constructor(options: CsvTransportOptions = {}) {
        super({ ...options, filename: 'temp.csv' });

        this.csvDir = options.csvDir || 'api_logs';
        this.csvHeaders = options.csvHeaders || [
            'timestamp',
            'level',
            'message',
            'method',
            'url',
            'statusCode',
            'duration',
            'ip',
            'userAgent',
            'userId',
            'requestSize',
            'responseSize',
            'requestBody',
            'responseBody',
            'error',
            'context',
            'type'
        ];

        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.csvDir)) {
            fs.mkdirSync(this.csvDir, { recursive: true });
        }
    }

    private getLogFileName(date: Date = new Date()): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        return `${day}_${month}_${year}.csv`;
    }

    private getLogFilePath(date: Date = new Date()): string {
        return path.join(this.csvDir, this.getLogFileName(date));
    }

    private async ensureFileExists(filePath: string): Promise<void> {
        if (!fs.existsSync(filePath)) {
            const csvHeader = this.csvHeaders.join(',') + '\n';
            await fs.promises.writeFile(filePath, csvHeader, 'utf8');
        }
    }

    private escapeCSVValue(value: any): string {
        if (value === null || value === undefined) {
            return '';
        }

        let stringValue = String(value);

        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
            stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
        }

        return stringValue;
    }

    private truncateString(str: string, maxLength: number = 1000): string {
        if (!str || str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength) + '...';
    }

    private formatLogEntry(info: any): string {
        const values = this.csvHeaders.map(header => {
            let value = info[header];

            if (header === 'requestBody' || header === 'responseBody') {
                value = this.truncateString(String(value || ''), 1000);
            } else if (header === 'userAgent') {
                value = this.truncateString(String(value || ''), 200);
            } else if (header === 'timestamp') {
                value = info.timestamp || new Date().toISOString();
            } else if (header === 'message') {
                value = info.message || '';
            } else if (header === 'level') {
                value = info.level || 'info';
            }

            return this.escapeCSVValue(value);
        });

        return values.join(',') + '\n';
    }

    log(info: any, callback: () => void): void {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // Only log HTTP requests to CSV
        if (info.type !== 'http_request') {
            callback();
            return;
        }

        const now = new Date();
        const todayStr = now.toDateString();
        const filePath = this.getLogFilePath(now);

        // Check if we need to rotate to a new file
        if (this.currentDate !== todayStr) {
            this.currentDate = todayStr;
            this.currentFilePath = filePath;
        }

        this.ensureFileExists(filePath)
            .then(() => {
                const csvLine = this.formatLogEntry(info);
                return fs.promises.appendFile(filePath, csvLine, 'utf8');
            })
            .catch(error => {
                console.error('Failed to write CSV log:', error);
            })
            .finally(() => {
                callback();
            });
    }
}

export default CsvTransport;
