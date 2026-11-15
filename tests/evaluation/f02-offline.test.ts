import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it.each(['--dry-run','--simulate'])('%s sends no HTTP with network methods intercepted', mode => {
  const dir = mkdtempSync(join(tmpdir(),'f02-guard-'));
  const marker = join(dir,'marker'), guard = join(dir,'guard.cjs');
  writeFileSync(guard, `const fs=require('fs');fs.appendFileSync(${JSON.stringify(marker)},'loaded\\n');\nconst deny=()=>{fs.appendFileSync(${JSON.stringify(marker)},'NETWORK\\n');throw Error('network forbidden')};\nfor(const m of ['http','https']){const x=require(m);x.request=deny;x.get=deny;}\nglobal.fetch=deny;\nconst net=require('net');const original=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){const a=args[0];if(typeof a==='number'||(a && typeof a==='object' && ('port' in a || 'host' in a)))return deny();return original.apply(this,args)};`);
  try {
    const child=spawnSync(process.execPath,['scripts/eval-multipass.mjs',mode,'--case','B01'],{encoding:'utf8',env:{PATH:process.env.PATH??'',NODE_ENV:'test',NODE_OPTIONS:`--require=${guard}`}});
    expect(child.status,child.stderr).toBe(0);
    const lines=readFileSync(marker,'utf8');
    expect(lines).toContain('loaded');
    expect(lines).not.toContain('NETWORK');
    if(mode==='--simulate') expect(lines.trim().split('\n').length).toBeGreaterThanOrEqual(2);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
