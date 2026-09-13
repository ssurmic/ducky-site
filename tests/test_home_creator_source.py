"""The offline creator formatter must never turn its private staging input into a site asset."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    'build_home_creators', Path(__file__).resolve().parents[1] / 'scripts/build_home_creators.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PrivateCreatorSourceTest(unittest.TestCase):
    def test_external_selected_source_returns_a_receipt_without_price_fetching(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'site'
            root.mkdir()
            source = Path(directory) / 'selected.json'
            content = json.dumps({'kols': [], 'points': []}).encode()
            source.write_bytes(content)
            with patch.object(MODULE, 'ROOT', root):
                doc, digest = MODULE.source_document(source)
            self.assertEqual(doc, {'kols': [], 'points': []})
            self.assertEqual(digest, hashlib.sha256(content).hexdigest())

    def test_repository_files_and_symlinks_cannot_be_private_source_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'site'
            root.mkdir()
            inside = root / 'archive.json'
            outside = Path(directory) / 'selected.json'
            for path in (inside, outside):
                path.write_text('{"kols":[],"points":[]}')
            inward = Path(directory) / 'inward.json'
            inward.symlink_to(inside)
            outward = root / 'outward.json'
            outward.symlink_to(outside)
            with patch.object(MODULE, 'ROOT', root):
                for path in (inside, inward, outward):
                    with self.subTest(path=path), self.assertRaisesRegex(ValueError, 'outside'):
                        MODULE.source_document(path)

    def test_an_unstructured_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'selected.json'
            source.write_text('[]')
            with self.assertRaisesRegex(ValueError, 'kols and points'):
                MODULE.source_document(source)


if __name__ == '__main__':
    unittest.main()
