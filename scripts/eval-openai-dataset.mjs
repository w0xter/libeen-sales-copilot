#!/usr/bin/env node
// F01 frozen synthetic dataset runner; delegated through eval:openai.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const help = `Usage:
pnpm eval:openai --dataset f01 --split development --category trust_real --sample 4 --dry-run
pnpm eval:openai --dataset f01 --split validation --sample 8 --seed 42
pnpm eval:openai --dataset f01 --split holdout --sample 5 --unlock-holdout
Options: --dataset f01 --split development|validation|holdout --category NAME|all
--sample N --seed N --repeat N --mode interpreter|end-to-end
--max-requests N --output PATH --allow-failures --unlock-holdout --dry-run --help
The dataset is frozen provisionally but lacks independent human annotation sign-off.
`;
const die=(error)=>{console.error(`Error: ${error}\n${help}`);process.exit(2);};
const opts={split:null,category:'all',sample:5,seed:42,repeat:1,mode:'end-to-end',maxRequests:20,output:'.eval-results',unlockHoldout:false,allowFailures:false,dryRun:false,dataset:'f01'};
const optNames=new Map([['--dataset','dataset'],['--split','split'],['--category','category'],['--sample','sample'],['--seed','seed'],['--repeat','repeat'],['--mode','mode'],['--max-requests','maxRequests'],['--output','output']]);
for(let i=2;i<process.argv.length;i++){
  const arg=process.argv[i];
  if(arg==='--help'){console.log(help);process.exit(0);}
  if(arg==='--dry-run'){opts.dryRun=true;continue;}
  if(arg==='--unlock-holdout'){opts.unlockHoldout=true;continue;}
  if(arg==='--allow-failures'){opts.allowFailures=true;continue;}
  const key=optNames.get(arg);
  if(!key||!process.argv[i+1]||process.argv[i+1].startsWith('--'))die(`Unknown or incomplete argument ${arg}`);
  const value=process.argv[++i];
  if(['sample','seed','repeat','maxRequests'].includes(key)){if(!/^\d+$/.test(value))die(`Invalid integer ${arg}`);opts[key]=Number(value);}else opts[key]=value;
}
if(opts.dataset!=='f01'||!['development','validation','holdout'].includes(opts.split))die('Specify --dataset f01 and a valid --split');
if(!['interpreter','end-to-end'].includes(opts.mode))die('Invalid mode');
if(!Number.isSafeInteger(opts.seed)||opts.seed<0||!Number.isSafeInteger(opts.sample)||opts.sample<1||opts.sample>352)die('Invalid sampling configuration');
if(!Number.isSafeInteger(opts.repeat)||opts.repeat<1||opts.repeat>10)die('Invalid repeat count');
if(!Number.isSafeInteger(opts.maxRequests)||opts.maxRequests<1||opts.maxRequests>20)die('Request budget must be between 1 and 20');
if(opts.split==='holdout'&&!opts.unlockHoldout)die('Holdout requires --unlock-holdout. Never use holdout results to tune implementation.');
const root=resolve('datasets/f01/v1');
const manifest=JSON.parse(readFileSync(join(root,'FREEZE_MANIFEST.json'),'utf8'));
if(manifest.version!=='1.0.1'||manifest.freezeType!=='content_hash_locked_provisional_annotations')die('Unknown/unfrozen manifest');
const raw=readFileSync(join(root,manifest.splits[opts.split].file));
const blob=createHash('sha1').update(`blob ${raw.length}`).update(Buffer.from([0])).update(raw).digest('hex');
if(blob!==manifest.splits[opts.split].gitBlobSha1)die('Frozen dataset file has changed. Create a new manifest/version.');
const input=raw.toString('utf8').trim().split(String.fromCharCode(10)).map(JSON.parse);
const eligible=input.filter(x=>opts.category==='all'||x.category===opts.category);
if(!eligible.length)die(`Unknown or empty category ${opts.category}`);
if(opts.sample>eligible.length)die(`--sample ${opts.sample} exceeds ${eligible.length} eligible cases`);
if(eligible.some(x=>x.datasetVersion!==manifest.version||x.reviewStatus!=='internally_audited_pending_external_review'))die('Version/provenance mismatch');
let seed=opts.seed>>>0;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const shuffle=items=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
const categories=shuffle([...new Set(eligible.map(x=>x.category))]);
const pools=new Map(categories.map(cat=>[cat,shuffle(eligible.filter(x=>x.category===cat))]));
const selected=[],usedIds=new Set(),usedClusters=new Set(),maxClusters=new Set(eligible.map(x=>x.clusterId)).size;
while(selected.length<opts.sample){
  let advanced=false;
  for(const category of categories){
    const pool=pools.get(category);
    const index=pool.findIndex(x=>!usedIds.has(x.id)&&(!usedClusters.has(x.clusterId)||usedClusters.size===maxClusters));
    if(index<0)continue;
    const [entry]=pool.splice(index,1);
    selected.push(entry);usedIds.add(entry.id);usedClusters.add(entry.clusterId);
    advanced=true;
    if(selected.length>=opts.sample)break;
  }
  if(!advanced)die('Sampling selection exhausted');
}
if(opts.mode==='interpreter'&&selected.some(x=>x.gold.transitions?.length))die('Corrections require --mode end-to-end to preserve case history');
const ceiling=selected.reduce((sum,x)=>sum+(x.gold.transitions?.length?4:2)*opts.repeat,0);
if(ceiling>opts.maxRequests)die(`Selected cases may require ${ceiling} API calls; budget is ${opts.maxRequests}. Reduce --sample/repeat.`);
console.log(JSON.stringify({version:manifest.version,split:opts.split,category:opts.category,seed:opts.seed,mode:opts.mode,selected:selected.map(x=>({id:x.id,category:x.category,cluster:x.clusterId})),repeat:opts.repeat,requestCeiling:ceiling,requestBudget:opts.maxRequests,labelStatus:manifest.labelStatus,independentSignoff:manifest.independentHumanSignOff},null,2));
if(opts.dryRun){console.log('DRY RUN: no OpenAI calls.');process.exit(0);}
for(const filename of ['.env.local','.env'])if(existsSync(filename))process.loadEnvFile(filename);
if(!process.env.OPENAI_MODEL?.trim()||!process.env.OPENAI_API_KEY?.trim())die('OPENAI_MODEL and OPENAI_API_KEY are required');
const vitest=resolve('node_modules/vitest/vitest.mjs');
if(!existsSync(vitest))die('Install dependencies first using pnpm install --frozen-lockfile');
const target=resolve(opts.output);
const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
const outputFile=extname(target)==='.json'?target:join(target,`f01-dataset-${opts.split}-${timestamp}.json`);
mkdirSync(dirname(outputFile),{recursive:true});
const configuration={datasetVersion:manifest.version,split:opts.split,recordIds:selected.map(x=>x.id),mode:opts.mode,repeat:opts.repeat,maxRequests:opts.maxRequests,seed:opts.seed,allowFailures:opts.allowFailures,manifestHash:blob};
const run=spawnSync(process.execPath,[vitest,'run','tests/evaluation/f01-dataset-cli.test.ts','--reporter=verbose'],{cwd:process.cwd(),env:{...process.env,AI_MODE:'openai',F01_DATASET_EVAL:'1',F01_DATASET_CONFIG:JSON.stringify(configuration),F01_EVAL_OUTPUT_FILE:outputFile},stdio:'inherit'});
if(run.error){console.error(`Runner process failed: ${run.error.code??'unknown'}`);process.exit(2);}
if(!existsSync(outputFile)){console.error('Evaluation did not produce report');process.exit(run.status||1);}
const report=JSON.parse(readFileSync(outputFile,'utf8'));
console.log(`F01 ${report.split} | model=${report.model} | requests=${report.requestCount}/${opts.maxRequests}`);
console.log(JSON.stringify({summary:report.summary,byCategory:report.byCategory},null,2));
console.log(`Report: ${outputFile}`);
process.exit(run.status||(!opts.allowFailures&&report.runs.some(x=>x.verdict!=='PASS')?1:0));
