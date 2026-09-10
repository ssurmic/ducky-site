"""Production opt-in stays explicit and can always be overridden off."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import build


class ResearchBriefConfigTests(unittest.TestCase):
    def test_absent_and_non_boolean_values_are_disabled(self):
        for config in ({}, {'research_brief_preview': False}, {'research_brief_preview': 'true'}, {'research_brief_preview': 1}):
            self.assertIs(build.research_brief_enabled(config), False)
        self.assertIs(build.research_brief_enabled({'research_brief_preview': True}), True)

    def test_cli_override_can_disable_configured_release(self):
        self.assertIs(build.research_brief_enabled({'research_brief_preview': True}, False), False)
        self.assertIs(build.research_brief_enabled({}, True), True)

    def test_configured_release_emits_the_same_switch_as_navigation(self):
        cfg = build.load_config(None)
        for override in (None, False, True):
            cfg['research_brief_preview'] = build.research_brief_enabled(build.load_config(None), override)
            with tempfile.TemporaryDirectory() as tmp, patch.object(build, 'DIST', Path(tmp)):
                build.write_config_js(cfg, 'test')
                content = (Path(tmp) / 'config.js').read_text()
                value, _ = json.JSONDecoder().raw_decode(content.split('Object.freeze(', 1)[1])
                self.assertIs(value['RESEARCH_BRIEF_ENABLED'], cfg['research_brief_preview'])


if __name__ == '__main__':
    unittest.main()
