"""Homepage builds and nightly refreshes share the dated archive-count contract."""
import copy
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import build
import home_proof


ROOT = Path(__file__).resolve().parents[1]


def document():
    return dict(schema='home-proof/1', coverage_scope='archived_records',
                as_of='2026-09-12', generated_at='2026-09-13T02:00:00+00:00',
                creators=0, videos_tracked=0, tickers_with_evidence=0, source_documents=0,
                method='Retained archive counts; not current readable content.')


class HomeProofTests(unittest.TestCase):
    def test_zero_counts_and_dated_metadata_pass_unchanged(self):
        doc = document()
        original = copy.deepcopy(doc)
        self.assertIs(home_proof.validate(doc), doc)
        self.assertEqual(doc, original)
        with tempfile.TemporaryDirectory() as tmp, patch.object(build, 'PUBLIC', Path(tmp)):
            (Path(tmp)/'home-proof.json').write_text(json.dumps(doc))
            self.assertEqual(build.load_home_proof(), doc)

    def test_every_count_requires_an_exact_nonnegative_integer(self):
        for key in home_proof.COUNT_KEYS:
            for value in (True, False, '12', 1.5, -1, None):
                with self.subTest(key=key, value=value):
                    doc = document()
                    doc[key] = value
                    with self.assertRaises(ValueError):
                        home_proof.validate(doc)
            doc = document()
            del doc[key]
            with self.assertRaises(ValueError):
                home_proof.validate(doc)

    def test_dates_are_calendar_dates_and_are_not_restamped(self):
        for value in ('2026-02-30', '2025-02-29', '2026-13-01', '2026-9-12',
                      '20260912', '2026-W37-6', '2026-09-12T00:00:00Z', None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                home_proof.validate({**document(), 'as_of': value})
        doc = {**document(), 'as_of': '2024-02-29'}
        self.assertEqual(home_proof.validate(doc)['as_of'], '2024-02-29')

    def test_optional_generation_clock_must_include_a_valid_timezone(self):
        doc = document()
        del doc['generated_at']
        self.assertEqual(home_proof.validate(doc), doc)
        for value in ('2026-09-13T02:00:00Z', '2026-09-12T19:00:00.123-07:00'):
            self.assertEqual(home_proof.validate({**doc, 'generated_at': value})['generated_at'], value)
        for value in (None, 123, '2026-09-13', '2026-09-13T02:00:00',
                      '2026-02-30T02:00:00Z', '2026-09-13T25:00:00Z',
                      '2026-09-13T02:00:00+25:00', '2026-09-13T02:00:00+01:99',
                      '2026-09-13T02:00:00 garbage'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                home_proof.validate({**doc, 'generated_at': value})

    def test_schema_describes_archived_counts(self):
        for value in ([], None, {**document(), 'schema': 'other'},
                      {**document(), 'coverage_scope': 'currently_readable'}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                home_proof.validate(value)

    def test_invalid_temporary_export_keeps_both_files_then_valid_zero_replaces(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest, candidate = Path(tmp)/'home-proof.json', Path(tmp)/'home-proof.json.tmp'
            original = json.dumps({**document(), 'creators': 12}).encode()
            dest.write_bytes(original)
            for invalid in ('{invalid json', json.dumps({**document(), 'source_documents': False})):
                candidate.write_text(invalid)
                with self.assertRaises(ValueError):
                    home_proof.replace_validated(candidate, dest)
                self.assertEqual(dest.read_bytes(), original)
                self.assertEqual(candidate.read_text(), invalid)
            raw = json.dumps(document(), indent=2).encode()
            candidate.write_bytes(raw)
            home_proof.replace_validated(candidate, dest)
            self.assertEqual(dest.read_bytes(), raw)
            self.assertFalse(candidate.exists())

    def test_build_refuses_invalid_proof_without_modifying_it(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(build, 'PUBLIC', Path(tmp)):
            path = Path(tmp)/'home-proof.json'
            raw = json.dumps({**document(), 'videos_tracked': True})
            path.write_text(raw)
            with self.assertRaises(SystemExit):
                build.load_home_proof()
            self.assertEqual(path.read_text(), raw)

    def test_nightly_hook_rejects_invalid_export_and_accepts_zero_counts(self):
        # Execute only the actual export hook: no git, network, model or other notary stages.
        script = (ROOT/'scripts/push_track_record.sh').read_text()
        hook = script.split('# Landing-page coverage counts', 1)[1].split('# 3. commit only on diff', 1)[0]
        hook = '# Landing-page coverage counts'+hook
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'public').mkdir()
            (root/'backend/scripts').mkdir(parents=True)
            shutil.copyfile(ROOT/'home_proof.py', root/'home_proof.py')
            exporter = root/'backend/scripts/export_public_proof.py'
            target = root/'public/home-proof.json'
            original = json.dumps({**document(), 'creators': 12})
            target.write_text(original)
            env = {**os.environ, 'DUCKY_ROOT': str(root/'backend'), 'PY': sys.executable}
            for doc, expected in (({**document(), 'tickers_with_evidence': '0'}, 1), (document(), 0)):
                exporter.write_text('print('+repr(json.dumps(doc))+')\n')
                run = subprocess.run(['bash', '-c', 'set -euo pipefail\nQUOTE_FAILED=0\nlog(){ :; }\n'+hook+'\nexit "$QUOTE_FAILED"'],
                                     cwd=root, env=env, capture_output=True, text=True, timeout=10)
                self.assertEqual(run.returncode, expected, run.stderr)
                self.assertEqual(target.read_text(), original if expected else json.dumps(doc)+'\n')
                self.assertFalse((root/'public/home-proof.json.tmp').exists())


if __name__ == '__main__':
    unittest.main()
