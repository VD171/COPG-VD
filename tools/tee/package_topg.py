#!/usr/bin/env python3
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
"""Stamp one module version, validate the flashable ZIP, and expose the raw artifact."""
import hashlib
import io
import json
import os
import re
import shlex
import sys
import zipfile
from pathlib import Path


def props(text):
    result = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, sep, value = line.partition('=')
        if not sep or key in result:
            raise ValueError('Malformed or duplicate module property: ' + key)
        result[key] = value
    return result


def package(root, staged, run, attempt, engine_sha, source_sha):
    base = props((root / 'module/module.prop').read_text())
    if not re.fullmatch(r'v\d+\.\d+\.\d+', base['version']):
        raise ValueError('Base version must have format vMAJOR.MINOR.PATCH')
    if run < 1 or not 1 <= attempt <= 99:
        raise ValueError('Invalid build number or attempt')
    code = int(base['versionCode']) + run * 100 + attempt
    if not 0 < code <= 2147483647:
        raise ValueError('versionCode out of range')
    for sha in (engine_sha, source_sha):
        if not re.fullmatch('[0-9a-f]{40}', sha):
            raise ValueError('Invalid source revision')
    version = base['version'] + '-b' + str(run) + '.' + str(attempt)
    current = props((staged / 'module.prop').read_text())
    if current['id'] != 'COPG-VD':
        raise ValueError('Module ID must remain COPG-VD')
    current.update(name='TOPG', version=version, versionCode=str(code))
    current.pop('updateJson', None)
    (staged / 'module.prop').write_text(''.join(k + '=' + v + '\n' for k, v in current.items()))
    # No stale upstream update metadata is shipped without a TOPG release channel.
    (staged / 'update.json').unlink(missing_ok=True)
    with zipfile.ZipFile(staged / 'tee/engine.zip') as engine:
        engine_version = props(engine.read('module.prop').decode())['version']
        required_engine = ['classes.dex', 'daemon']
        for abi in ('arm64-v8a', 'armeabi-v7a', 'x86_64'):
            required_engine += ['lib/' + abi + '/' + n for n in ('libTEESimulator.so', 'libcertgen.so', 'libinject.so', 'libsupervisor.so')]
            required_engine += ['bin/resetprop-' + abi]
        for name in required_engine:
            if not engine.read(name):
                raise ValueError('Empty engine member: ' + name)
        if not engine.read('classes.dex').startswith(b'dex\n'):
            raise ValueError('Missing compiled engine DEX')
        for name in required_engine:
            if name.endswith('.so') and not engine.read(name).startswith(b'\x7fELF'):
                raise ValueError('Invalid native engine library: ' + name)
    info = {'name': 'TOPG', 'version': version, 'versionCode': code,
            'baseVersion': base['version'], 'sourceCommit': source_sha,
            'engine': {'name': 'TEESimulator-RS', 'version': engine_version, 'sourceCommit': engine_sha}}
    encoded = json.dumps(info, indent=2) + '\n'
    (staged / 'build-info.json').write_text(encoded)
    (staged / 'webroot/build-info.json').write_text(encoded)
    config_path = staged / 'webroot/config.json'
    config = json.loads(config_path.read_text())
    config.update(title='TOPG', version=version, versionCode=code)
    config['contentSecurityPolicy'] = config['contentSecurityPolicy'].replace("img-src 'self' data:;", "img-src 'self' data: ksu:;")
    config_path.write_text(json.dumps(config, indent=2) + '\n')
    index = staged / 'webroot/index.html'
    html, count = re.subn(r'(<span\b[^>]*\bid="version-text"[^>]*>)[^<]*(</span>)', lambda m: m[1] + version + m[2], index.read_text())
    if count != 1:
        raise ValueError('Expected exactly one WebUI version label')
    index.write_text(html)
    customize = staged / 'customize.sh'
    text = customize.read_text().replace('COPG-VD Module Version', 'TOPG Module Version')
    anchor = '\nprint_module_version\n'
    if text.count(anchor) != 1:
        raise ValueError('Installation banner anchor changed')
    banner = '\nui_print ' + shlex.quote(' - TOPG ' + version) + '\n'
    banner += 'ui_print ' + shlex.quote(' - ' + current['description']) + '\n'
    banner += 'ui_print ' + shlex.quote(' - TEE engine: TEESimulator-RS ' + engine_version) + '\n'
    customize.write_text(text.replace(anchor, banner + anchor, 1))
    required = ['module.prop', 'customize.sh', 'service.sh', 'META-INF/com/google/android/update-binary',
                'tee/tee_manager.sh', 'tee/tee_scheduler.sh', 'tee/engine.zip',
                'webroot/index.html', 'webroot/tee/tee.js', 'webroot/tee/tee_apps.js',
                'build-info.json', 'webroot/build-info.json']
    for abi in ('arm64-v8a', 'armeabi-v7a', 'x86_64'):
        name = 'zygisk/' + abi + '.so'
        required.append(name)
        if not (staged / name).read_bytes().startswith(b'\x7fELF'):
            raise ValueError('Invalid COPG library: ' + name)
    for name in required:
        if not (staged / name).is_file() or not (staged / name).stat().st_size:
            raise ValueError('Missing module member: ' + name)
    output = staged.parent / ('TOPG-' + version + '.zip')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(staged.rglob('*')):
            if path.is_file():
                archive.write(path, path.relative_to(staged).as_posix())
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise ValueError('ZIP CRC check failed')
        if not set(required).issubset(archive.namelist()):
            raise ValueError('Module files are not at ZIP root')
        packaged = props(archive.read('module.prop').decode())
        web = json.loads(archive.read('webroot/config.json'))
        for metadata in (json.loads(archive.read('build-info.json')), json.loads(archive.read('webroot/build-info.json')), web):
            if metadata['version'] != packaged['version'] or str(metadata['versionCode']) != packaged['versionCode']:
                raise ValueError('Version metadata mismatch')
    (staged.parent / 'TOPG-integrated.zip').unlink(missing_ok=True)
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    return output, version, code, digest


if __name__ == '__main__':
    output, version, code, digest = package(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve(),
        int(os.environ['GITHUB_RUN_NUMBER']), int(os.environ.get('GITHUB_RUN_ATTEMPT', '1')),
        os.environ['ENGINE_SHA'], os.environ['GITHUB_SHA'])
    with open(os.environ['GITHUB_OUTPUT'], 'a') as stream:
        stream.write('zip_path=' + str(output) + '\nversion=' + version + '\nversion_code=' + str(code) + '\nsha256=' + digest + '\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as stream:
        stream.write('## TOPG ' + version + '\n\nVersion code: ' + str(code) + '\n\nDirect flashable ZIP: `' + output.name + '`\n\nSHA-256: `' + digest + '`\n\nPackage structure validated; real-device installation is not certified by this check.\n')
