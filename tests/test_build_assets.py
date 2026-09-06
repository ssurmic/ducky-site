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

    def test_clean_deploy_keeps_previous_lazy_route_and_its_original_store(self):
        first = build.publish_app_modules()
        old_files = {p.relative_to(self.dist / "app-assets" / first).as_posix(): p.read_bytes()
                     for p in (self.dist / "app-assets" / first).rglob("*") if p.is_file()}
        # Clean deployment has no previous dist to copy. Git history is the source.
        shutil.rmtree(self.dist / "app-assets")
        source = self.dist / "js" / "app" / "views" / "profile.js"
        source.write_text(source.read_text() + "\n// changed profile\n")
        with patch.object(build, "committed_app_graphs", return_value=[old_files, old_files]):
            current = build.publish_app_modules(retain_history=True)
        self.assertNotEqual(current, first)
        self.assertEqual((self.dist / "app-assets" / first / "views" / "profile.js").read_bytes(), old_files["views/profile.js"])
        self.assertEqual((self.dist / "app-assets" / first / "store.js").read_bytes(), old_files["store.js"])
        import json
        manifest = json.loads((self.dist / "app-release.json").read_text())
        self.assertEqual(manifest, {"version": current, "retained": [current, first]})

    def test_history_restores_screenshot_release_without_rewriting_its_bytes(self):
        # This is the actual missing graph in the owner's 2026-09-06 screenshot.
        graphs = build.committed_app_graphs()
        matching = [graph for graph in graphs if build.app_graph_version(graph) == "77db404861dc58974d8a"]
        if not matching:
            self.skipTest("screenshot release has aged outside bounded git history")
        build.publish_app_modules(retain_history=True)
        self.assertEqual((self.dist / "app-assets/77db404861dc58974d8a/views/profile.js").read_bytes(), matching[0]["views/profile.js"])


if __name__ == "__main__":
    unittest.main()
