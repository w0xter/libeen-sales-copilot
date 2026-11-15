#!/usr/bin/env python3
"""Build the R07b-0 review packet and coordinator key; no model calls."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ANNOTATIONS = ROOT / 'tests/evaluation/f02-r07a-annotations.v1.json'
ADDITIONAL = ROOT / 'tests/evaluation/f02-r07b0-additional.v1.json'
DATASET = ROOT / 'datasets/f01/v1/development.jsonl'
FIXTURES = ROOT / 'src/fixtures/index.ts'
DEST = ROOT / 'docs/evaluation/r07b0'
VERSION = 'r07b0-v1'

def read(path):
    return path.read_text(encoding='utf-8')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def opaque(source):
    return 'Q-' + hashlib.sha256((VERSION + ':' + source).encode()).hexdigest()[:12].upper()

def fixture(case):
    # Read the original text declarations, not the historical expected outcomes.
    src = read(FIXTURES)
    name = 'rosa' if case == 'B08' else 'javier'
    pattern = r"text\('" + name + r"',\s*(\d+),\s*'(customer|advisor)',\s*'([^']*)'\)"
    messages = [{'source_id':f'{name}-m{n}','role':role,'type':'text','text':text}
                for n, role, text in re.findall(pattern, src)]
    if case == 'B10':
        messages.append({'source_id':'javier-m4','role':'customer','type':'audio_unavailable'})
        additions = re.findall(r"addition\('javier-opt-out',\s*'javier',\s*'([^']*)'\)", src)
        if len(additions) != 1:
            raise ValueError('B10 addition must be unique')
        messages.append({'source_id':'javier-opt-out-addition','role':'customer','type':'text','text':additions[0]})
    return sorted(messages, key=lambda m: 6 if m['source_id'].endswith('addition') else int(m['source_id'].rsplit('m', 1)[1]))

def normalized(messages):
    return [{'id':f'M{i+1}', 'role':m['role'], 'content': ({'type':'text','text':m['text']} if m['type'] == 'text' else {'type':'audio_unavailable'})} for i,m in enumerate(messages)]

def main():
    annotation_doc = json.loads(read(ANNOTATIONS))
    new_doc = json.loads(read(ADDITIONAL))
    dataset = {d['id']:d for d in map(json.loads, read(DATASET).splitlines())}
    packet, key = [], []
    for a in annotation_doc['annotations']:
        if a['source'] == 'synthetic_r07a':
            messages = [{'source_id':a['occurrence'],'role':'customer','type':'text','text':a['quote']}]
        elif a['id'] in ('B08','B10'):
            messages = fixture(a['id'])
        else:
            messages = [{'source_id':m['messageId'],'role':m['role'],'type':m['content']['type'],**({'text':m['content']['text']} if m['content']['type']=='text' else {})} for m in dataset[a['id']]['messages']]
        target = [i for i,m in enumerate(messages) if m['source_id']==a['occurrence']]
        if len(target) != 1 or a['quote'] not in messages[target[0]].get('text',''):
            raise ValueError('Missing occurrence or literal quote: ' + a['id'])
        identity = 'diagnostic:' + a['id'] + ':' + a['occurrence'] + ':' + a['category']
        qid = opaque(identity)
        packet.append({'id':qid,'category':a['category'],'target_message':f'M{target[0]+1}','messages':normalized(messages)})
        key.append({'id':qid,'partition':'diagnostic_r07a','source_id':a['id'],'source_occurrence':a['occurrence'],'source_category':a['category']})
    for c in new_doc['cases']:
        messages = [{'source_id':f'm{i+1}','role':m['role'],'type':'text','text':m['text']} for i,m in enumerate(c['messages'])]
        qid = opaque('additional:' + c['id'])
        packet.append({'id':qid,'category':c['category'],'target_message':f'M{len(messages)}','messages':normalized(messages)})
        key.append({'id':qid,'partition':'additional_r07b0','source_id':c['id'],'source_occurrence':messages[-1]['source_id'],'source_category':c['category'],'family':c['family']})
    packet.sort(key=lambda p:p['id'])
    key.sort(key=lambda p:p['id'])
    if len({p['id'] for p in packet}) != len(packet):
        raise ValueError('Opaque ID collision')
    dependencies = {str(p.relative_to(ROOT)):sha(p) for p in (ANNOTATIONS,ADDITIONAL,DATASET,FIXTURES)}
    outputs = [(DEST/'reviewer/casos.v1.json',{'version':VERSION,'cases':packet}),
               (DEST/'coordinator/clave.v1.json',{'version':VERSION,'source_sha256':dependencies,'mapping':key})]
    for path, data in outputs:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Generated {len(packet)} cases: {len(annotation_doc["annotations"])} diagnostic, {len(new_doc["cases"])} additional')

if __name__ == '__main__':
    main()
