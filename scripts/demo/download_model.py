"""Fetch one pinned official model snapshot, verifying file sizes and LFS hashes."""
import hashlib
import json
from pathlib import Path
import sys
import urllib.request

manifest = json.loads(Path(sys.argv[1]).read_text())
root = Path(sys.argv[2])
assert sum(f['size'] for f in manifest['files']) < 4_600_000_000
root.mkdir(parents=True, exist_ok=True)
for row in manifest['files']:
    relative = Path(row['rfilename'])
    assert not relative.is_absolute() and '..' not in relative.parts
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        temporary = target.with_suffix(target.suffix + '.part')
        url = f"https://huggingface.co/{manifest['repo_id']}/resolve/{manifest['revision']}/{relative.as_posix()}"
        with urllib.request.urlopen(url, timeout=180) as response, temporary.open('wb') as handle:
            count = 0
            while chunk := response.read(1024 * 1024):
                count += len(chunk)
                if count > row['size']:
                    raise ValueError('Remote size exceeds pinned manifest')
                handle.write(chunk)
        assert temporary.stat().st_size == row['size']
        temporary.rename(target)
    assert target.stat().st_size == row['size']
    if row.get('lfs'):
        digest = hashlib.file_digest(target.open('rb'), 'sha256').hexdigest()
        assert digest == row['lfs']['sha256']
    print(relative, row['size'], 'verified', flush=True)
(root / 'download-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
