"""GA4 activation and rollback must change HTML, config and CSP together."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import build


class AnalyticsConfigTests(unittest.TestCase):
    def test_enabled_and_disabled_shells_match_both_languages(self):
        env, tables = build.make_env(), build.load_i18n()
        for measurement in ('', 'G-TEST12345'):
            cfg = {**build.load_config(None), 'ga4_measurement_id': measurement}
            for lang in ('en', 'zh'):
                for page in ('privacy', 'app'):
                    ctx = build.build_context(cfg, tables, lang, page, page + '/index.html', 'test', build.load_liquidity(), build.load_track_n())
                    html = env.get_template(page + '.html').render(**ctx)
                    self.assertEqual('src="/js/analytics.js"' in html, bool(measurement))
                    self.assertEqual('id="analytics-choice"' in html, bool(measurement))
                    if measurement:
                        self.assertIn(tables[lang]['analytics.allow'], html)
                        self.assertIn(tables[lang]['analytics.decline'], html)
                    if page == 'privacy':
                        self.assertEqual('id="analytics"' in html, bool(measurement))
            headers = env.get_template('_headers.tpl').render(cfg=cfg)
            self.assertEqual('https://www.googletagmanager.com' in headers, bool(measurement))
            self.assertNotIn('unsafe-eval', headers)
            with tempfile.TemporaryDirectory() as tmp, patch.object(build, 'DIST', Path(tmp)):
                build.write_config_js(cfg, 'test')
                data, _ = json.JSONDecoder().raw_decode((Path(tmp) / 'config.js').read_text().split('Object.freeze(', 1)[1])
                self.assertEqual(data['GA4_MEASUREMENT_ID'], measurement)
                self.assertEqual(data['GA4_ORIGIN'], 'https://duckybot.app')

    def test_malformed_measurement_ids_fail_the_build(self):
        cfg = build.load_config(None)
        for value in ('GTM-123', 'G-123&other=value', '<script>'):
            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / 'config.json'
                path.write_text(json.dumps({**cfg, 'ga4_measurement_id': value}))
                with patch.object(build, 'CONFIG', path), self.assertRaises(SystemExit):
                    build.load_config(None)


if __name__ == '__main__':
    unittest.main()
