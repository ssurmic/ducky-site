"""Validate dated archive counts shared by the homepage build and nightly export.

These counts describe retained records at ``as_of``. They do not certify current
readability, complete source coverage, or the freshness of individual records.
"""
from __future__ import annotations

import argparse
from datetime import date, datetime
import json
from pathlib import Path
import re
import sys


COUNT_KEYS = ('creators', 'videos_tracked', 'tickers_with_evidence', 'source_documents')
DATE = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2}')
TIMESTAMP = re.compile(
    r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}'
    r'(?::[0-9]{2}(?:\.[0-9]+)?)?(?:Z|[+-](?:[01][0-9]|2[0-3]):[0-5][0-9])'
)


def validate(doc: object) -> dict:
    if not isinstance(doc, dict):
        raise ValueError('home-proof must be an object')
    if doc.get('schema') != 'home-proof/1' or doc.get('coverage_scope') != 'archived_records':
        raise ValueError('home-proof requires its archive-count schema and coverage scope')
    for key in COUNT_KEYS:
        if type(doc.get(key)) is not int or doc[key] < 0:
            raise ValueError(f'home-proof {key} must be a nonnegative integer')
    as_of = doc.get('as_of')
    if not isinstance(as_of, str) or not DATE.fullmatch(as_of):
        raise ValueError('home-proof as_of must be a calendar ISO date')
    try:
        date.fromisoformat(as_of)
    except ValueError:
        raise ValueError('home-proof as_of must be a calendar ISO date') from None
    if 'generated_at' in doc:
        value = doc['generated_at']
        if not isinstance(value, str) or not TIMESTAMP.fullmatch(value):
            raise ValueError('home-proof generated_at must be an ISO timestamp with a timezone')
        try:
            stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
            if stamp.utcoffset() is None:
                raise ValueError
        except ValueError:
            raise ValueError('home-proof generated_at must be an ISO timestamp with a timezone') from None
    return doc


def load(path: Path) -> dict:
    return validate(json.loads(Path(path).read_text(encoding='utf-8')))


def replace_validated(candidate: Path, destination: Path) -> dict:
    """Validate the temporary export before atomically replacing the last-good file.

    Validation or replacement failure leaves both files intact. Dates and extra
    exporter metadata are preserved byte for byte; this does not restamp history.
    """
    candidate, destination = Path(candidate), Path(destination)
    doc = load(candidate)
    candidate.replace(destination)
    return doc


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('--replace', type=Path, metavar='DESTINATION')
    args = parser.parse_args(argv)
    try:
        if args.replace is None:
            load(args.candidate)
        else:
            replace_validated(args.candidate, args.replace)
    except (OSError, ValueError, UnicodeError) as exc:
        print(f'home_proof.py: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
