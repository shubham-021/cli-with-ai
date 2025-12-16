import { z } from "zod";

type ZodSchema = z.ZodTypeAny;

interface SchemaProperty {
    type: string;
    description?: string;
    enum?: string[];
    items?: SchemaProperty;
    properties?: Record<string, SchemaProperty>;
    required?: string[];
}

interface JSONSchema {
    type: 'object';
    properties: Record<string, SchemaProperty>;
    required: string[];
}

function getTypeName(schema: ZodSchema): string {
    return schema.def.type;
}

function isOptional(schema: ZodSchema): boolean {
    return getTypeName(schema) === 'optional';
}

function getDescription(schema: ZodSchema): string | undefined {
    const meta = (schema as any).meta?.();
    return meta?.description;
}

function unwrapSchema(schema: ZodSchema): ZodSchema {
    const typeName = getTypeName(schema);
    if (typeName === 'optional' || typeName === 'nullable' || typeName === 'nullish') {
        return (schema as any).unwrap();
    }
    return schema;
}

function convertProperty(schema: ZodSchema): SchemaProperty {
    const unwrapped = unwrapSchema(schema);
    const typeName = getTypeName(unwrapped);
    const description = getDescription(unwrapped) || getDescription(schema);
    const prop: SchemaProperty = { type: 'string' };

    switch (typeName) {
        case 'string':
            prop.type = 'string';
            break;
        case 'number':
            prop.type = 'number';
            break;
        case 'boolean':
            prop.type = 'boolean';
            break;
        case 'array':
            prop.type = 'array';
            const elementSchema = (unwrapped as any).unwrap();
            prop.items = convertProperty(elementSchema);
            break;
        case 'enum':
            prop.type = 'string';
            const enumSchema = unwrapped as any;
            if (enumSchema.options) {
                prop.enum = enumSchema.options;
            } else if (enumSchema.enum) {
                prop.enum = Object.values(enumSchema.enum);
            }
            break;
        case 'object':
            prop.type = 'object';
            const objectSchema = unwrapped as any;
            if (objectSchema.shape) {
                prop.properties = {};
                prop.required = [];
                for (const [key, value] of Object.entries(objectSchema.shape)) {
                    prop.properties[key] = convertProperty(value as ZodSchema);
                    if (!isOptional(value as ZodSchema)) {
                        prop.required.push(key);
                    }
                }
            }
            break;
        case 'record':
            prop.type = 'object';
            break;
        case 'any':
        case 'unknown':
            prop.type = 'object';
            break;
        default:
            prop.type = 'string';
    }
    if (description) {
        prop.description = description;
    }
    return prop;
}


function convertZodToBase(zodSchema: ZodSchema): JSONSchema {
    const objectSchema = zodSchema as any;
    const shape = objectSchema.shape;
    const properties: Record<string, SchemaProperty> = {};
    const required: string[] = [];
    if (shape) {
        for (const [key, value] of Object.entries(shape)) {
            properties[key] = convertProperty(value as ZodSchema);
            if (!isOptional(value as ZodSchema)) {
                required.push(key);
            }
        }
    }
    return {
        type: 'object',
        properties,
        required
    };
}

export function zodToOpenAI(zodSchema: ZodSchema): JSONSchema {
    return convertZodToBase(zodSchema);
}

export function zodToGemini(zodSchema: ZodSchema): JSONSchema {
    return convertZodToBase(zodSchema);
}

export function zodToClaude(zodSchema: ZodSchema): JSONSchema {
    return convertZodToBase(zodSchema);
}