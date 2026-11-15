import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fixture } from './f02-fixtures';
import annotations from './f02-r07a-annotations.v1.json';
import additional from './f02-r07b0-additional.v1.json';
import packet from '../../docs/evaluation/r07b0/reviewer/casos.v1.json';
import key from '../../docs/evaluation/r07b0/coordinator/clave.v1.json';

it('independently checks exact messages, occurrences, mappings and blind field allowlist', () => {
  const rows = readFileSync('datasets/f01/v1/development.jsonl','utf8').trim().split('\n').map(s=>JSON.parse(s));
  expect(packet.cases).toHaveLength(51);
  expect(key.mapping).toHaveLength(51);
  expect(new Set(packet.cases.map(x=>x.id)).size).toBe(51);
  expect(new Set(key.mapping.map(x=>x.id)).size).toBe(51);
  expect(key.mapping.filter(x=>x.partition==='diagnostic_r07a')).toHaveLength(34);
  expect(key.mapping.filter(x=>x.partition==='additional_r07b0')).toHaveLength(17);
  const checked = new Set<string>();
  for (const c of packet.cases) {
    expect(Object.keys(c).sort()).toEqual(['category','id','messages','target_message']);
    const k=key.mapping.find(x=>x.id===c.id)!;
    expect(k).toBeDefined();
    expect(c.category).toBe(k.source_category);
    let original: {role:string;content:{type:string;text?:string};messageId:string}[];
    if(k.partition==='additional_r07b0') {
      const item=additional.cases.find(x=>x.id===k.source_id)!;
      original=item.messages.map((m,i)=>({role:m.role,content:{type:'text',text:m.text},messageId:`m${i+1}`}));
    } else {
      const a=annotations.annotations.find(x=>x.id===k.source_id && x.occurrence===k.source_occurrence && x.category===k.source_category)!;
      expect(a).toBeDefined();
      const identity = `${a.id}/${a.occurrence}/${a.category}`;
      expect(checked.has(identity)).toBe(false); checked.add(identity);
      if(a.source==='synthetic_r07a') original=[{role:'customer',content:{type:'text',text:a.quote},messageId:a.occurrence}];
      else if(a.id==='B08'||a.id==='B10') original=fixture(a.id).messages;
      else original=rows.find(r=>r.id===a.id).messages;
      expect(original.find(m=>m.messageId===a.occurrence)?.content.text).toContain(a.quote);
    }
    expect(c.messages).toHaveLength(original.length);
    original.forEach((m,i)=>{
      const visible=c.messages[i];
      expect(Object.keys(visible).sort()).toEqual(['content','id','role']);
      expect(visible.id).toBe(`M${i+1}`);
      expect(visible.role).toBe(m.role);
      expect(visible.content.type).toBe(m.content.type);
      if(m.content.type==='text') {
        expect(Object.keys(visible.content).sort()).toEqual(['text','type']);
        expect(visible.content.text).toBe(m.content.text);
      }
      else expect(Object.keys(visible.content)).toEqual(['type']);
    });
    expect(c.target_message).toBe(`M${original.findIndex(m=>m.messageId===k.source_occurrence)+1}`);
  }
  expect(checked.size).toBe(34);
});
