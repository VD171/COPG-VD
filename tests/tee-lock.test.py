#!/usr/bin/env python3
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
"""Simulate close-on-exec private FDs and test actual mutual exclusion. No device writes."""
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path


def main():
    repo = Path(__file__).resolve().parents[1]
    native = shutil.which('flock')
    if not native:
        raise RuntimeError('Test requires host flock')
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        helper = root / 'tee_lock.sh'
        shutil.copy(repo / 'module/tee/tee_lock.sh', helper)
        binary = root / 'bin'
        binary.mkdir()
        wrapper = binary / 'flock'
        wrapper.write_text('#!/bin/sh\nexec 8>&-\nexec 9>&-\nif [ "${FORCE_INVALID:-0}" = 1 ]; then echo "flock: Bad file descriptor" >&2; exit 1; fi\nexec "$REAL_FLOCK" "$@"\n')
        wrapper.chmod(0o755)
        env = dict(os.environ, PATH=str(binary) + ':' + os.environ['PATH'],
                   REAL_FLOCK=native, LC_ALL='C', HELPER=str(helper), LOCK=str(root / 'lock'),
                   READY=str(root / 'ready'), RELEASE=str(root / 'release'))
        old = subprocess.run(['sh', '-c', 'exec 9>"$LOCK"; flock -n 9'], env=env, capture_output=True, text=True)
        assert old.returncode != 0 and 'bad file descriptor' in old.stderr.lower()
        command = '. "$HELPER"; tee_lock_acquire "$LOCK" 0 || exit "$?"; echo acquired'
        good = subprocess.run(['sh', '-c', command], env=env, capture_output=True, text=True)
        assert good.returncode == 0 and 'acquired' in good.stdout, good.stderr
        holder = subprocess.Popen(['sh', '-c', '. "$HELPER"; tee_lock_acquire "$LOCK" 0 || exit "$?"; echo ready > "$READY"; while [ ! -f "$RELEASE" ]; do sleep 0.05; done'], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            deadline = time.monotonic() + 5
            while not (root / 'ready').exists():
                if holder.poll() is not None or time.monotonic() > deadline:
                    raise AssertionError('Lock holder failed to start')
                time.sleep(0.02)
            busy = subprocess.run(['sh', '-c', command], env=env, capture_output=True, text=True)
            assert busy.returncode == 1 and 'Busy:' in busy.stderr
        finally:
            (root / 'release').touch()
            try:
                holder.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                holder.kill()
                holder.communicate()
        again = subprocess.run(['sh', '-c', command], env=env, capture_output=True, text=True)
        assert again.returncode == 0, again.stderr
        bad = subprocess.run(['sh', '-c', command], env=dict(env, FORCE_INVALID='1'), capture_output=True, text=True)
        assert bad.returncode == 2 and 'Lock error' in bad.stderr and 'Busy:' not in bad.stderr
        assert not list(root.glob('lock.error.*'))
    print('PASS: old EBADF reproduced; FD-0 lock works; contention enforced; release verified; real errors are not Busy.')


if __name__ == '__main__':
    main()
