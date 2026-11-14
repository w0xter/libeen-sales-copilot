import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const run=(...args:string[])=>spawnSync(process.execPath,args,{cwd:process.cwd(),encoding:'utf8',env:{...process.env,OPENAI_API_KEY:'',OPENAI_MODEL:''}});
const root='datasets/f01/v1/';

describe('frozen F01 synthetic dataset (no provider calls)',()=>{
  it('passes structural provenance and freeze validation',()=>{
    const result=run('scripts/validate-f01-dataset.mjs');
    expect(result.status,result.stderr).toBe(0);
    const details=JSON.parse(result.stdout) as {valid:boolean;total:number;clusters:number;version:string};
    expect(details).toMatchObject({valid:true,total:352,clusters:88,version:'1.0.1'});
  });
  it('matches all locked content hashes',()=>{
    const manifest=JSON.parse(readFileSync(root+'FREEZE_MANIFEST.json','utf8')) as {splits:Record<string,{file:string;gitBlobSha1:string}>};
    for(const config of Object.values(manifest.splits)){
      const bytes=readFileSync(root+config.file);
      const sha=createHash('sha1').update(`blob ${bytes.length}`).update(Buffer.from([0])).update(bytes).digest('hex');
      expect(sha).toBe(config.gitBlobSha1);
    }
  });
  it('selects deterministic cluster-diverse samples with no credentials on dry-run',()=>{
    const args=['scripts/eval-openai.mjs','--dataset','f01','--split','development','--category','trust_real','--sample','4','--seed','42','--dry-run'];
    const first=run(...args),second=run(...args);
    expect(first.status,first.stderr).toBe(0);
    expect(second.status,second.stderr).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    expect(first.stdout).toContain('"requestCeiling": 8');
    expect(first.stdout).toContain('DRY RUN');
    expect(first.stdout).toContain('"independentSignoff": false');
  });
  it('rejects unconfirmed holdout access before inference',()=>{
    const result=run('scripts/eval-openai.mjs','--dataset','f01','--split','holdout','--dry-run');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--unlock-holdout');
  });
  it('allows an explicit holdout dry-run with no credentials',()=>{
    const result=run('scripts/eval-openai.mjs','--dataset','f01','--split','holdout','--category','optout','--sample','2','--unlock-holdout','--dry-run');
    expect(result.status,result.stderr).toBe(0);
    expect(result.stdout).toContain('DRY RUN');
  });
  it('rejects a selection that would exceed the per-process API request budget',()=>{
    const result=run('scripts/eval-openai.mjs','--dataset','f01','--split','development','--sample','11','--dry-run');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('budget');
  });
  it('requires end-to-end mode for staged corrections',()=>{
    const result=run('scripts/eval-openai.mjs','--dataset','f01','--split','development','--category','basis_correction','--sample','2','--mode','interpreter','--dry-run');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('end-to-end');
  });
});
