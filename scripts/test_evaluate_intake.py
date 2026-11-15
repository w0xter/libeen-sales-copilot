#!/usr/bin/env python3
"""Contract tests of the benchmark runner (not tests of the live model)."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import threading
import unittest
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCRIPT = Path(__file__).resolve().with_name('evaluate_intake.py')
DATASET = Path(__file__).resolve().parents[1] / 'evaluation' / 'libeen_ai_lead_intake_eval_v1.zip'
spec = importlib.util.spec_from_file_location('evaluate_intake', SCRIPT)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

with zipfile.ZipFile(DATASET) as z:
    CASES = [json.loads(x) for x in z.read('cases.jsonl').decode().splitlines()]
    GOLDS = [json.loads(x) for x in z.read('gold.jsonl').decode().splitlines()]
    GOLD_BY_CONV = {case['conversation']: gold for case, gold in zip(CASES, GOLDS)}

class Handler(BaseHTTPRequestHandler):
    requests = []
    fail_status = None
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(n).decode())
        self.requests.append(body)
        if self.fail_status:
            self.send_response(self.fail_status); self.send_header('Content-Type', 'application/json'); self.end_headers()
            self.wfile.write(b'{"error":"missing_server_configuration"}')
            return
        gold = GOLD_BY_CONV[body['conversation']]
        fields = gold['expectedExtraction']
        issue_list = []
        for i, item in enumerate(gold['expectedIssues']):
            issue = {'id': f'issue-{i+1}', 'category': item['type'], 'description': item['description'], 'review': 'human' if item['type'] in ('inaccessible','sensitive') else 'clarification'}
            for key in ('field', 'messageId'):
                if item[key] is not None:
                    issue[key] = item[key]
            issue_list.append(issue)
        intervention = gold['expectedIntervention']
        expected_type = intervention['type']
        if expected_type == 'clarification':
            next_question = {'kind': 'question', 'field': intervention['target'], 'question': intervention['example'] or '¿Puedes aclararlo?', 'reason': 'test', 'issueId': 'issue-1'}
        elif expected_type == 'human_review':
            next_question = {'kind': 'human_review', 'label': 'Revisión del asesor', 'reason': 'test', 'issueId': 'issue-1'}
        else:
            next_question = {'kind': 'none', 'label': 'Sin preguntas pendientes prioritarias'}
        result = {'messages': [], 'extraction': {'ok':True,'fields': fields, 'discarded':0}, 'issues': {'ok':True, 'issues':issue_list, 'incomplete':False}, 'intervention': next_question, 'discarded':0}
        payload = json.dumps(result, ensure_ascii=False).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(payload))); self.end_headers()
        self.wfile.write(payload)
    def log_message(self, *args): pass

class RunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/api/intake'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join(timeout=2)

    def test_dry_run_without_server(self):
        p = subprocess.run([sys.executable, str(SCRIPT), '--dataset', str(DATASET), '--dry-run'], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn('32 snapshots', p.stdout)

    def test_real_runner_against_contract_stub_and_resume(self):
        Handler.fail_status = None
        Handler.requests.clear()
        with tempfile.TemporaryDirectory() as tmp:
            cmd = [sys.executable, str(SCRIPT), '--dataset', str(DATASET), '--url', self.url, '--output', tmp, '--delay', '0', '--limit', '4']
            p = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr + p.stdout)
            summary = json.loads((Path(tmp)/'summary.json').read_text())
            self.assertEqual((summary['succeeded'], summary['failed']), (4, 0))
            self.assertEqual(summary['matchedInterventionKinds'], 4)
            self.assertEqual(summary['provenanceViolations'], 0)
            self.assertEqual(len(Handler.requests), 4)
            self.assertEqual(set(Handler.requests[0]), {'conversation'})  # gold never transmitted
            self.assertTrue((Path(tmp)/'report.md').exists())
            p2 = subprocess.run(cmd + ['--resume'], capture_output=True, text=True)
            self.assertEqual(p2.returncode, 0, p2.stderr + p2.stdout)
            self.assertEqual(len(Handler.requests), 4)

    def test_missing_server_key_stops(self):
        Handler.fail_status = 503
        with tempfile.TemporaryDirectory() as tmp:
            p = subprocess.run([sys.executable, str(SCRIPT), '--dataset', str(DATASET), '--url', self.url, '--output', tmp, '--delay', '0'], capture_output=True, text=True)
            self.assertEqual(p.returncode, 1)
            summary = json.loads((Path(tmp)/'summary.json').read_text())
            self.assertEqual(summary['total'], 1)
            self.assertEqual(summary['failed'], 1)
        Handler.fail_status = None

    def test_source_violations_are_reported(self):
        case = CASES[0]; gold = GOLDS[0]
        candidate = dict(gold['expectedExtraction']['income'][0])
        candidate['quote'] = 'No tenemos préstamos ni cuotas pendientes.'
        fields = {field: [] for field in runner.FIELDS}
        fields['income'] = [candidate]
        raw = {'extraction': {'ok': True, 'fields':fields}, 'issues': {'ok':True, 'issues':[]}, 'intervention': {'kind':'none'}}
        c = runner.check_result(case, gold, {'ok':True, 'response':raw})
        self.assertFalse(c['structuralPass'])
        self.assertTrue(c['extraction']['provenanceViolations'])

if __name__ == '__main__':
    unittest.main()
