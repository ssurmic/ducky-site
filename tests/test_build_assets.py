"""Exercise the built module graph, where the production OAuth regression occurred."""
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urljoin, urlsplit

import build


class AppReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dist = Path(self.tmp.name)
        shutil.copytree(build.PUBLIC / "js" / "app", self.dist / "js" / "app")
        patcher = patch.object(build, "DIST", self.dist)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_entire_graph_resolves_inside_one_snapshot(self):
        version = build.publish_app_modules()
        prefix = f"/app-assets/{version}/"
        shell = build.version_assets('<script src="/js/app/main.js"></script>', "oldsha", version)
        self.assertIn(f'src="{prefix}main.js"', shell)
        queue, seen = [prefix + "main.js"], set()
        while queue:
            url = queue.pop()
            if url in seen:
                continue
            seen.add(url)
            self.assertTrue(url.startswith(prefix), url)
            self.assertEqual(urlsplit(url).query, "")
            path = self.dist / url.lstrip("/")
            self.assertTrue(path.is_file(), url)
            queue.extend(urljoin(url, match.group(2)) for match in build.IMPORT_RE.finditer(path.read_text()))
        self.assertIn(prefix + "views/google.js", seen)
        self.assertEqual([url for url in seen if url.endswith("/store.js")], [prefix + "store.js"])
        # Legacy query URLs can be cached independently without reaching this graph.
        build.version_module_imports("oldsha")
        self.assertNotIn("?v=", (self.dist / prefix.lstrip("/") / "auth.js").read_text())

    def test_dependency_edit_changes_path_without_mutating_prior_release(self):
        first = build.publish_app_modules()
        old_auth = self.dist / "app-assets" / first / "auth.js"
        before = old_auth.read_bytes()
        source = self.dist / "js" / "app" / "auth.js"
        source.write_text(source.read_text() + "\n// next release\n")
        second = build.publish_app_modules()
        self.assertNotEqual(first, second)
        self.assertEqual(old_auth.read_bytes(), before)
        for version in (first, second):
            shell = build.version_assets('<script src="/js/app/main.js"></script>', "same-git-sha", version)
            self.assertIn(f"/app-assets/{version}/main.js", shell)

    def test_same_bytes_reproduce_path_and_other_assets_keep_version(self):
        first = build.publish_app_modules()
        shutil.rmtree(self.dist / "app-assets")
        self.assertEqual(build.publish_app_modules(), first)
        shell = build.version_assets('<script src="/config.js"></script><link href="/css/app.css">', "testsha", first)
        self.assertIn('/config.js?v=testsha', shell)
        self.assertIn('/css/app.css?v=testsha', shell)


if __name__ == "__main__":
    unittest.main()
