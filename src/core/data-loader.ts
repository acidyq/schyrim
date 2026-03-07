// ============================================================
// Schyrim Core — Data Loader & JSON Schema Validation
// Loads all JSON content and validates against schemas
// ============================================================

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import AjvModule, { type ValidateFunction } from 'ajv';
const Ajv = AjvModule.default ?? AjvModule;

export interface DataLoaderOptions {
    contentDir: string;
    schemaDir: string;
    strict?: boolean;     // fail on first error vs collect all errors
}

export interface LoadResult<T> {
    data: T[];
    errors: ValidationError[];
    filesLoaded: number;
}

export interface ValidationError {
    file: string;
    field?: string;
    message: string;
    value?: unknown;
}

/**
 * Data Loader: loads JSON content files and validates them against JSON Schemas.
 * Invalid content produces clear error messages.
 * The game refuses to start if any content is invalid (in strict mode).
 */
export class DataLoader {
    private ajv: InstanceType<typeof Ajv>;
    private validators: Map<string, ValidateFunction> = new Map();
    private contentDir: string;
    private schemaDir: string;

    constructor(options: DataLoaderOptions) {
        this.contentDir = options.contentDir;
        this.schemaDir = options.schemaDir;
        // strict option reserved for future error-on-first-violation mode
        this.ajv = new Ajv({ allErrors: true, verbose: true });
    }

    /**
     * Load a JSON Schema from file and compile it for validation.
     */
    loadSchema(schemaName: string): ValidateFunction {
        if (this.validators.has(schemaName)) {
            return this.validators.get(schemaName)!;
        }

        const schemaPath = join(this.schemaDir, schemaName);
        if (!existsSync(schemaPath)) {
            throw new SchyrimDataError(`Schema file not found: ${schemaPath}`);
        }

        const schemaJson = JSON.parse(readFileSync(schemaPath, 'utf-8'));
        const validate = this.ajv.compile(schemaJson);
        this.validators.set(schemaName, validate);
        return validate;
    }

    /**
     * Load all JSON files from a content subdirectory and validate against a schema.
     */
    loadContentDir<T>(subDir: string, schemaName: string): LoadResult<T> {
        const dirPath = join(this.contentDir, subDir);
        const result: LoadResult<T> = { data: [], errors: [], filesLoaded: 0 };

        if (!existsSync(dirPath)) {
            return result; // empty directory is OK — no content yet
        }

        const validate = this.loadSchema(schemaName);
        const files = readdirSync(dirPath).filter(f => f.endsWith('.json'));

        for (const file of files) {
            const filePath = join(dirPath, file);
            try {
                const raw = readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(raw);

                // Handle both single objects and arrays
                const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

                for (const item of items) {
                    if (validate(item)) {
                        result.data.push(item as T);
                    } else {
                        const errors = validate.errors ?? [];
                        for (const err of errors) {
                            result.errors.push({
                                file: basename(filePath),
                                field: err.instancePath || '/',
                                message: err.message ?? 'Unknown validation error',
                                value: err.data,
                            });
                        }
                    }
                }

                result.filesLoaded++;
            } catch (err) {
                result.errors.push({
                    file: basename(filePath),
                    message: err instanceof Error ? err.message : 'Unknown error reading file',
                });
            }
        }

        return result;
    }

    /**
     * Load a single JSON file and validate against a schema.
     */
    loadFile<T>(filePath: string, schemaName: string): { data: T | null; errors: ValidationError[] } {
        const errors: ValidationError[] = [];

        if (!existsSync(filePath)) {
            errors.push({ file: filePath, message: 'File not found' });
            return { data: null, errors };
        }

        try {
            const raw = readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            const validate = this.loadSchema(schemaName);

            if (validate(parsed)) {
                return { data: parsed as T, errors };
            } else {
                for (const err of validate.errors ?? []) {
                    errors.push({
                        file: basename(filePath),
                        field: err.instancePath || '/',
                        message: err.message ?? 'Validation error',
                        value: err.data,
                    });
                }
                return { data: null, errors };
            }
        } catch (err) {
            errors.push({
                file: basename(filePath),
                message: err instanceof Error ? err.message : 'Unknown error',
            });
            return { data: null, errors };
        }
    }

    /**
     * Load a raw JSON file without schema validation.
     */
    loadRawJson<T>(filePath: string): T {
        if (!existsSync(filePath)) {
            throw new SchyrimDataError(`File not found: ${filePath}`);
        }
        return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
    }

    /**
     * Validate all content directories. Returns true if all valid.
     */
    validateAll(contentMap: Record<string, string>): { valid: boolean; errors: ValidationError[] } {
        const allErrors: ValidationError[] = [];

        for (const [subDir, schemaName] of Object.entries(contentMap)) {
            const result = this.loadContentDir(subDir, schemaName);
            allErrors.push(...result.errors);
        }

        return { valid: allErrors.length === 0, errors: allErrors };
    }

    /**
     * Format validation errors for CLI display.
     */
    static formatErrors(errors: ValidationError[]): string {
        if (errors.length === 0) return 'No errors.';

        return errors.map(err => {
            const field = err.field ? ` → ${err.field}` : '';
            return `  ✗ ${err.file}${field}: ${err.message}`;
        }).join('\n');
    }
}

/** Custom error class for data loading errors */
export class SchyrimDataError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SchyrimDataError';
    }
}
