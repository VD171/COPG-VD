#!/usr/bin/env python3
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
"""Adapt build inputs to portable FD-0 locks without changing engine data."""
import ast
import sys
from pathlib import Path


def region(text, start, end, replacement):
    if text.count(start) != 1:
        raise RuntimeError('Lock opening anchor changed')
    begin = text.index(start)
    finish = text.index(end, begin)
    return text[:begin] + replacement + text[finish:]


def apply(root):
    manager = root / 'module/tee/tee_manager.sh'
    keybox = root / 'module/tee/tee_keybox.sh'
    features = root / 'tools/tee/update_features.py'
    if not (root / 'module/tee/tee_lock.sh').is_file():
        raise RuntimeError('Missing portable lock helper')
    m = region(manager.read_text(), 'exec 9>"$P/.tee.lock"', '\nT=$(mktemp',
        '. "$M/tee_lock.sh"\ntee_lock_acquire "$P/.tee.lock" 3 || exit "$?"')
    # Background engine and scheduler processes must not retain the operation lock.
    m = m.replace('exec 9>&-', 'exec 0</dev/null')
    k = region(keybox.read_text(), 'exec 9>"$P/.tee.lock"', '\nT=$(mktemp',
        '. "${0%/*}/tee_lock.sh"\ntee_lock_acquire "$P/.tee.lock" 5 || exit "$?"')
    f = region(features.read_text(), 'exec 8>"$D/.scheduler.lock"', '\nsleep 90',
        '. "$M/tee_lock.sh"\ntee_lock_acquire "$D/.scheduler.lock" 0 || exit "$?"')
    # Update both the old-text anchor and the replacement used by the feature builder.
    f = f.replace('exec 9>&-', 'exec 0</dev/null')
    ast.parse(f)
    for content in (m, k, f):
        if 'flock -n 9' in content or 'flock -n 8' in content:
            raise RuntimeError('Private-descriptor lock remains')
    manager.write_text(m)
    keybox.write_text(k)
    features.write_text(f)


if __name__ == '__main__':
    apply(Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve())
