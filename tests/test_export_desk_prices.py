import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('desk_export', Path(__file__).parents[1] / 'scripts/export_desk_prices.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def payload(ticker):
    return {'ticker': ticker, 'bars': [{'t':'2026-09-04','c':100}], 'last_d':'2026-09-04',
            'session_context':{'price_session':'2026-09-04','expected_session':'2026-09-04',
                               'status':'current','basis':'completed_regular_session','checked_at':'2026-09-08T17:00:00+00:00'}}


class PublicCloseExport(unittest.TestCase):
    def test_outage_keeps_last_good_and_dated_artifact_is_immutable(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'closes.json'
            def fetch(url):
                tk = url.rsplit('/',1)[1].split('.')[0]
                if tk=='SPY': raise OSError('provider unavailable')
                return payload(tk)
            p.write_text('last good')
            with self.assertRaises(OSError): module.export(p,current=True,fetch=fetch)
            self.assertEqual(p.read_text(),'last good')
            with self.assertRaises(ValueError): module.export(p,fetch=fetch)
            self.assertFalse(p.with_suffix('.json.tmp').exists())

    def test_current_projection_preserves_price_and_retrieval_clocks(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'closes.json'
            module.export(p,current=True,fetch=lambda u:payload(u.rsplit('/',1)[1].split('.')[0]))
            rows=json.loads(p.read_text())['quotes']
            self.assertEqual([r['ticker'] for r in rows],list(module.TICKERS))
            self.assertTrue(all(r['last_d']=='2026-09-04' and r['retrieved_at'] for r in rows))
            self.assertEqual(rows[0]['session_context']['checked_at'],'2026-09-08T17:00:00+00:00')

    def test_invalid_or_unfinished_daily_values_never_replace_current(self):
        for mutate in (
            lambda d:d['bars'][0].update(c=0),
            lambda d:d['bars'][0].update(c=True),
            lambda d:d['bars'][0].update(t='2026-02-30'),
            lambda d:d['bars'].append(d['bars'][0]),
            lambda d:d.update(ticker='WRONG'),
            lambda d:d['session_context'].update(status='invalid'),
            lambda d:d['session_context'].update(expected_session='2026-09-03'),
        ):
            d=payload('NVDA');mutate(d)
            with self.assertRaises((ValueError,TypeError)): module.validate(d,'NVDA')

if __name__=='__main__':unittest.main()
