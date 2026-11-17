#!/usr/bin/env node
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
 try { return nextResolve(specifier, context); }
 catch (error) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  throw error;
 }
} });
try {
 const { main } = await import('./runner/main.ts');
 console.log(`Run saved: ${await main(process.argv.slice(2))}`);
} catch (error) { console.error(error); process.exitCode = 1; }
