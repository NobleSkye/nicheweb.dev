#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

const root = process.cwd();
const registryPath = path.join(root, 'registry.json');

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    domain: { type: 'string', const: 'nicheweb.dev' },
    records: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          subdomain: {
            type: 'string',
            pattern: '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
          },
          type: { type: 'string', enum: ['A', 'AAAA', 'CNAME', 'TXT'] },
          value: { type: 'string', minLength: 1 },
          ttl: { type: 'integer', minimum: 60, default: 3600 },
          owner: { type: 'string', minLength: 3 }
        },
        required: ['subdomain', 'type', 'value', 'owner']
      }
    }
  },
  required: ['domain', 'records']
};

function main() {
  if (!fs.existsSync(registryPath)) {
    console.error('registry.json not found.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  const ajv = new Ajv({ useDefaults: true, allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    console.error('Validation failed:');
    for (const err of validate.errors) {
      console.error(`- ${err.instancePath} ${err.message}`);
    }
    process.exit(1);
  }
  console.log('registry.json is valid');
}

main();
