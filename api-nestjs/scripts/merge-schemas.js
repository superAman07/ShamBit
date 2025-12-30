#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PRISMA_DIR = path.join(__dirname, '../prisma');
const MAIN_SCHEMA = path.join(PRISMA_DIR, 'schema.prisma');
const OUTPUT_SCHEMA = path.join(PRISMA_DIR, 'schema-merged.prisma');

// Read all schema files
const schemaFiles = fs.readdirSync(PRISMA_DIR)
  .filter(file => file.startsWith('schema') && file.endsWith('.prisma') && file !== 'schema.prisma')
  .sort();

console.log('Found schema files:', schemaFiles);

// Read main schema
let mainSchema = fs.readFileSync(MAIN_SCHEMA, 'utf8');

// Extract generator and datasource from main schema
const generatorMatch = mainSchema.match(/generator\s+client\s*{[^}]*}/s);
const datasourceMatch = mainSchema.match(/datasource\s+db\s*{[^}]*}/s);

if (!generatorMatch || !datasourceMatch) {
  console.error('Could not find generator or datasource in main schema');
  process.exit(1);
}

// Start with generator and datasource
let mergedSchema = generatorMatch[0] + '\n\n' + datasourceMatch[0] + '\n\n';

// Add enums and models from main schema (skip generator/datasource)
const mainContent = mainSchema
  .replace(/generator\s+client\s*{[^}]*}/s, '')
  .replace(/datasource\s+db\s*{[^}]*}/s, '')
  .trim();

if (mainContent) {
  mergedSchema += '// ================================\n';
  mergedSchema += '// MAIN SCHEMA CONTENT\n';
  mergedSchema += '// ================================\n\n';
  mergedSchema += mainContent + '\n\n';
}

// Merge additional schema files
for (const file of schemaFiles) {
  const filePath = path.join(PRISMA_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Remove any generator/datasource blocks from additional files
  const cleanContent = content
    .replace(/generator\s+\w+\s*{[^}]*}/gs, '')
    .replace(/datasource\s+\w+\s*{[^}]*}/gs, '')
    .trim();
  
  if (cleanContent) {
    mergedSchema += `// ================================\n`;
    mergedSchema += `// FROM: ${file}\n`;
    mergedSchema += `// ================================\n\n`;
    mergedSchema += cleanContent + '\n\n';
  }
}

// Write merged schema
fs.writeFileSync(OUTPUT_SCHEMA, mergedSchema);
console.log(`Merged schema written to: ${OUTPUT_SCHEMA}`);
console.log('Please review the merged schema and replace schema.prisma if everything looks correct.');