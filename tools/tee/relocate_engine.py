#!/usr/bin/env python3
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0

import argparse
import json
import subprocess
from pathlib import Path

REVISION = 'd8099e29e38af7750dd9e3563cc4a38db9aa96bb'
REPLACEMENTS = (
    ('/data/adb/modules/tricky_store', '/data/adb/modules/COPG-VD/tee'),
    ('/data/adb/tricky_store', '/data/adb/COPG-VD/tee'),
)

def relocate(root):
    root = root.resolve(strict=True)
    actual = subprocess.check_output(
        ['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True
    ).strip()
    if actual != REVISION:
        raise RuntimeError('Unexpected upstream revision: ' + actual)
    dirty = subprocess.check_output(
        ['git', '-C', str(root), 'status', '--porcelain'], text=True
    )
    if dirty:
        raise RuntimeError('Upstream checkout must be clean')
    files = subprocess.check_output(
        ['git', '-C', str(root), 'ls-files', '-z']
    ).decode().split('\0')
    edits = []
    counts = {old: 0 for old, _ in REPLACEMENTS}
    for name in filter(None, files):
        path = root / name
        if path.is_symlink() or not path.is_file():
            continue
        raw = path.read_bytes()
        if b'\0' in raw:
            continue
        try:
            original = raw.decode('utf-8')
        except UnicodeDecodeError:
            continue
        updated = original
        for old, new in REPLACEMENTS:
            counts[old] += updated.count(old)
            updated = updated.replace(old, new)
        if updated != original:
            edits.append((path, updated))
    if not all(counts.values()):
        raise RuntimeError('Expected upstream path anchors are missing')
    for path, updated in edits:
        path.write_bytes(updated.encode('utf-8'))
    manifest = {
        'repository': 'wfire06100/TEESimulator-RS',
        'revision': REVISION,
        'replacements': dict(REPLACEMENTS),
        'occurrences': counts,
        'files': [str(path.relative_to(root)) for path, _ in edits],
        'limitations': [
            'Path relocation only; TOPG runtime integration is not complete.',
            'Boot-policy adapter, migration and WebUI integration remain required.',
            'No device validation is implied by a successful build.'
        ],
    }
    (root / 'topg-relocation.json').write_text(
        json.dumps(manifest, indent=2) + '\n', encoding='utf-8'
    )

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Relocate a pinned TEE source checkout')
    parser.add_argument('checkout', type=Path)
    relocate(parser.parse_args().checkout)
