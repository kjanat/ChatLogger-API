import { Document, SchemaDefinitionProperty, Types } from 'mongoose';

// Extend SchemaDefinition to include all the properties needed
declare module 'mongoose' {
  interface SchemaDefinitionType<T> {
    source?: SchemaDefinitionProperty<string>;
    name?: SchemaDefinitionProperty<string>;
    settings?: SchemaDefinitionProperty<Record<string, unknown>>;
    functionCall?: SchemaDefinitionProperty<Record<string, unknown>>;
    toolCalls?: SchemaDefinitionProperty<Record<string, unknown>[]>;
    role?: SchemaDefinitionProperty<string>;
    tags?: SchemaDefinitionProperty<string[]>;
    contactEmail?: SchemaDefinitionProperty<string>;
    description?: SchemaDefinitionProperty<string>;
    systemPrompt?: SchemaDefinitionProperty<string>;
    model?: SchemaDefinitionProperty<string>;
    promptTokens?: SchemaDefinitionProperty<number>;
    completionTokens?: SchemaDefinitionProperty<number>;
    latency?: SchemaDefinitionProperty<number>;
  }
}

// This file doesn't need to export anything directly 
