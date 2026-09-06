#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const specPath = process.argv[2] || path.join(__dirname, '..', 'openapi.json');

if (!fs.existsSync(specPath)) {
  console.error(
    `OpenAPI spec not found at ${specPath}. Run npm run generate:openapi first.`,
  );
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const issues = [];

function pushIssue(category, message) {
  issues.push({ category, message });
}

function isBareObjectSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  if (schema.$ref) {
    return false;
  }

  const type = schema.type;
  if (!type || type === 'object') {
    const hasProperties =
      schema.properties && Object.keys(schema.properties).length > 0;
    const hasAdditional =
      schema.additionalProperties === true ||
      (schema.additionalProperties &&
        typeof schema.additionalProperties === 'object');
    return !hasProperties && !hasAdditional;
  }

  return false;
}

function walkSchemas(schema, location, visit) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  visit(schema, location);

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      walkSchemas(value, `${location}.properties.${key}`, visit);
    }
  }

  if (schema.items) {
    walkSchemas(schema.items, `${location}.items`, visit);
  }

  if (schema.allOf) {
    schema.allOf.forEach((item, index) => {
      walkSchemas(item, `${location}.allOf[${index}]`, visit);
    });
  }

  if (schema.oneOf) {
    schema.oneOf.forEach((item, index) => {
      walkSchemas(item, `${location}.oneOf[${index}]`, visit);
    });
  }

  if (schema.anyOf) {
    schema.anyOf.forEach((item, index) => {
      walkSchemas(item, `${location}.anyOf[${index}]`, visit);
    });
  }
}

for (const [schemaName, schema] of Object.entries(
  spec.components?.schemas || {},
)) {
  walkSchemas(schema, `components.schemas.${schemaName}`, (node, location) => {
    if (node.nullable === true && isBareObjectSchema(node)) {
      pushIssue(
        'nullable-scalar',
        `${location}: nullable property lacks explicit scalar type`,
      );
    }
  });
}

for (const [route, methods] of Object.entries(spec.paths || {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!operation || typeof operation !== 'object') {
      continue;
    }

    const opId = operation.operationId || `${method.toUpperCase()} ${route}`;

    if (!operation.summary) {
      pushIssue('empty-summary', `${opId}: missing summary`);
    }

    for (const status of ['200', '201']) {
      const response = operation.responses?.[status];
      if (!response) {
        continue;
      }

      const jsonSchema = response.content?.['application/json']?.schema;
      const textSchema = response.content?.['text/plain']?.schema;
      if (!jsonSchema && !textSchema) {
        if (!response.content) {
          continue;
        }
        pushIssue(
          'missing-response-schema',
          `${opId}: ${status} response missing application/json schema`,
        );
        continue;
      }

      const description = `${response.description || ''} ${operation.description || ''}`.toLowerCase();
      const mentionsNull =
        description.includes('null') ||
        description.includes('`null`') ||
        description.includes('or null');

      if (mentionsNull && jsonSchema.nullable !== true) {
        const hasNullableOneOf =
          Array.isArray(jsonSchema.oneOf) &&
          jsonSchema.oneOf.some((part) => part?.type === 'null');

        if (!hasNullableOneOf) {
          pushIssue(
            'nullable-prose-mismatch',
            `${opId}: description mentions null but response schema is not nullable`,
          );
        }
      }
    }
  }
}

if (issues.length > 0) {
  console.error(`OpenAPI audit failed with ${issues.length} issue(s):\n`);
  for (const issue of issues) {
    console.error(`- [${issue.category}] ${issue.message}`);
  }
  process.exit(1);
}

console.log(`OpenAPI audit passed (${specPath}).`);
