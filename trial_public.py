"""Exclude current research from both the public checkout and deployment output."""
import json
from pathlib import Path

CURRENT_FILES = ('calendar.json', 'week-ahead.json', 'desk-prices.json', 'kol-feed.json')
# Reviewed public surface at the release baseline. New JSON needs an explicit
# classification; merely choosing a new filename must not bypass the gate.
PUBLIC_JSON = frozenset({
    'market-sessions.json', 'feed.json', 'radar-history.json', 'ideas.json',
    'track-record.json', 'seasonality.json', 'oversold-research.json',
    'media/ducky-demo-cases-2026-09-07.json', 'examples/video-summary.json',
    'examples/desk-prices-2026-09-07.json', 'receipts/liquidity-2026.json',
    'glossary.json',
})


def sanitize(directory):
    directory = Path(directory)
    unknown = [str(path.relative_to(directory)) for path in directory.rglob('*.json')
               if str(path.relative_to(directory)) not in PUBLIC_JSON | set(CURRENT_FILES)]
    if unknown:
        raise ValueError('Unclassified public JSON: ' + ', '.join(sorted(unknown)))
    from public_access import sanitize_public_payloads
    sanitize_public_payloads(directory)
    for name in CURRENT_FILES:
        path = directory / name
        # An explicit unavailable envelope also prevents old clients from treating it as facts.
        if path.exists():
            path.write_text(json.dumps({'status': 'subscription_required', 'public_example': False}) + '\n')
    # Never ship a whole current price replica as a fallback download.
    for path in directory.rglob('*.db'):
        path.unlink()


if __name__ == '__main__':
    import sys
    config = json.loads(Path('site.config.json').read_text())
    if config.get('trial_access'):
        sanitize(sys.argv[1] if len(sys.argv) > 1 else 'public')
