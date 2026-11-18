#!/usr/bin/env node
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
 try { return nextResolve(specifier, context); }
 catch (error) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  throw error;
 }
} });
try {
 const { main } = await import('./runner/main.ts');
 const dir = await main(process.argv.slice(2));
 console.log(`Run saved: ${dir}`);
 const report = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8'));
 const errors = Object.values(report.report).reduce((count, arm) => count + arm.errors.length, 0);
 if (errors) { console.error(`Run completed with ${errors} error(s); see report.json and results.jsonl.`); process.exitCode = 1; }
} catch (error) { console.error(error); process.exitCode = 1; }
