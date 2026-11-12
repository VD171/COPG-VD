#!/usr/bin/env python3
# Copyright (C) 2026 wfire06100
# SPDX-License-Identifier: Apache-2.0
import json
import shutil
import subprocess
import sys
import tarfile
import zipfile
from pathlib import Path

EN = {
 'tee_title':'TEE', 'tee_policy':'COPG-VD controls boot properties and security patches.',
 'tee_refresh':'Refresh status', 'tee_keybox':'Keybox', 'tee_personal':'Personal keybox (protected)',
 'tee_auto_update':'Automatic updates', 'tee_endpoint':'Mirror base URL (BASE/key returns base64 XML)',
 'tee_network':'Updates run after boot and every six hours. Prefer a trusted HTTPS mirror; HTTP is unauthenticated. XML structure checks do not prove validity or non-revocation.',
 'tee_configure':'Save update settings', 'tee_update':'Update now', 'tee_import':'Import personal keybox',
 'tee_modes':'Auto: no suffix. Generate: !. Hack: ?. Preserve [keybox.xml] headers. New entries inherit the last section.',
 'tee_add':'Add or update application', 'tee_load':'Load targets', 'tee_save':'Save targets', 'tee_logs':'Show logs',
 'tee_reset':'Reset generated keys on next reboot', 'tee_reset_confirm':'Reset generated keys on the next reboot? Apps may lose access. A backup will be kept.',
 'tee_done':'Done', 'tee_invalid':'Invalid input or file too large',
 'ui_about_callout':'This WebUI runs locally. Optional profile and keybox updates use the network.'
}
FR = {
 'tee_title':'TEE', 'tee_policy':'COPG-VD gère les propriétés de démarrage et les correctifs de sécurité.',
 'tee_refresh':'Actualiser l’état', 'tee_keybox':'Keybox', 'tee_personal':'Keybox personnelle protégée',
 'tee_auto_update':'Mises à jour automatiques', 'tee_endpoint':'URL de base du miroir (BASE/key renvoie du XML en base64)',
 'tee_network':'Mise à jour après démarrage puis toutes les six heures. Privilégiez un miroir HTTPS fiable : HTTP n’est pas authentifié. Le contrôle XML ne garantit ni validité ni non-révocation.',
 'tee_configure':'Enregistrer les réglages', 'tee_update':'Mettre à jour maintenant', 'tee_import':'Importer une keybox personnelle',
 'tee_modes':'Auto : sans suffixe. Generate : !. Hack : ?. Conservez les en-têtes [keybox.xml]. Les nouvelles entrées dépendent de la dernière section.',
 'tee_add':'Ajouter ou modifier l’application', 'tee_load':'Charger les cibles', 'tee_save':'Enregistrer les cibles', 'tee_logs':'Afficher les journaux',
 'tee_reset':'Réinitialiser les clés au prochain démarrage', 'tee_reset_confirm':'Réinitialiser les clés au prochain démarrage ? Les applications peuvent perdre leur accès. Une sauvegarde sera conservée.',
 'tee_done':'Terminé', 'tee_invalid':'Entrée invalide ou fichier trop volumineux',
 'ui_about_callout':'Cette WebUI fonctionne localement. Les mises à jour optionnelles de profils et de keybox utilisent le réseau.'
}
EN.update({'tee_picker_open':'Choose applications','tee_filter_user':'User apps','tee_filter_system':'System apps','tee_filter_all':'All','tee_picker_more':'Show more','tee_picker_loading':'Loading installed applications…','tee_picker_mode':'Mode','tee_picker_help':'Tap to enable or disable a target. Hold an app or use Mode to choose Auto, Generate or Hack. Save applies changes; closing discards them.'})
FR.update({'tee_picker_open':'Choisir les applications','tee_filter_user':'Utilisateur','tee_filter_system':'Système','tee_filter_all':'Toutes','tee_picker_more':'Afficher la suite','tee_picker_loading':'Chargement des applications…','tee_picker_mode':'Mode','tee_picker_help':'Appuyez pour cocher ou décocher une cible. Maintenez une application ou utilisez Mode pour choisir Auto, Generate ou Hack. Enregistrer applique les changements ; fermer les annule.'})

def once(path, old, new):
 s=path.read_text()
 if s.count(old)!=1: raise RuntimeError('Unexpected integration anchor: '+str(path))
 path.write_text(s.replace(old,new,1))

def patch(upstream):
 p=upstream/'app/src/main/java/org/matrix/TEESimulator/util/AndroidDeviceUtils.kt'
 anchor='        getProperty(propertyName, expectedSize)?.let {'
 prefix='        // TOPG: preserve existing boot identity before consulting live properties.\n        readFromFile(propertyName, expectedSize)?.let {\n            recordSource("persistent-file")\n            return it\n        }\n'
 once(p,anchor,prefix+anchor)

def assemble(root,engine,upstream,out):
 if out.exists(): raise RuntimeError('Output directory must not exist')
 shutil.copytree(root/'module',out)
 tee=out/'tee'; web=out/'webroot'
 shutil.copy(engine,tee/'engine.zip')
 with zipfile.ZipFile(engine) as z:
  for src,dst in [('keybox.xml','default-keybox.xml'),('target.txt','default-target.txt')]: (tee/dst).write_bytes(z.read(src))
  policy=z.read('sepolicy.rule').decode()
 for name in ('LICENSE','NOTICE','topg-relocation.json'): shutil.copy(upstream/name,tee/name)
 def source_filter(info):
  return None if any(p in {'.git','.gradle','build','out','target','jniLibs'} for p in Path(info.name).parts) else info
 with tarfile.open(tee/'engine-source.tar.gz','w:gz') as tar:
  tar.add(upstream,arcname='TEESimulator-RS',filter=source_filter)
  tar.add(root/'tools/tee',arcname='TOPG-build-adapter')
  tar.add(root/'module/tee',arcname='TOPG-runtime-adapter')
  tar.add(root/'module/webroot/tee',arcname='TOPG-WebUI-adapter')
 once(out/'customize.sh','check_conflict_modules\ncheck_config_file','# TOPG uses isolated TEE conflict handling and PIF warnings.\ncheck_config_file')
 hook='\nMODPATH="$MODPATH" API="$API" ARCH="$ARCH" sh "$MODPATH/tee/tee_manager.sh" install || abort "TOPG TEE installation failed"\n'
 once(out/'customize.sh','check_config_file\nmigrate_version_keys','check_config_file\nmigrate_version_keys'+hook)
 service=out/'service.sh'; s=service.read_text()
 if '/data/adb/tricky_store' not in s: raise RuntimeError('Missing security-patch anchor')
 service.write_text(s.replace('/data/adb/tricky_store','/data/adb/COPG-VD/tee').replace('u:object_r:trickystore_data_file:s0','u:object_r:adb_data_file:s0')+'\nsh "$MODDIR/tee/tee_manager.sh" boot >> /data/adb/COPG-VD/tee-boot.log 2>&1\n')
 with (out/'sepolicy.rule').open('a') as f: f.write('\n# TEESimulator-RS component\n'+policy+'\nallow keystore adb_data_file dir { search getattr open read write add_name remove_name }\nallow keystore system_file dir search\n')
 once(web/'index.html','</body>','<script src="tee/tee.js" defer></script>\n</body>')
 html=(web/'index.html').read_text().replace('<title>COPG-VD</title>','<title>TOPG</title>').replace('>COPG-VD <span','>TOPG <span')
 html=html.replace('</body>','<script src="tee/tee_picker.js" defer></script>\n</body>')
 (web/'index.html').write_text(html)
 with (web/'lang/en.js').open('a') as f: f.write('\nObject.assign(window.__I18N_EN, '+json.dumps(EN,ensure_ascii=False)+');\n')
 for lang,extra in [('en',EN),('fr',FR)]:
  p=web/'lang'/(lang+'.json'); d=json.loads(p.read_text()); d.update(extra); p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 # Other existing languages deliberately use the established English fallback.
 for p in (web/'lang').glob('*.json'):
  if p.stem in ('en','fr'): continue
  d=json.loads(p.read_text()); d['ui_about_callout']=EN['ui_about_callout']; p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 prop=out/'module.prop'; fields={'name':'TOPG','author':'wfire06100; COPG-VD: AlirezaParsi & VD171; TEESimulator contributors','description':'COPG-VD with isolated TEESimulator-RS integration'}
 prop.write_text('\n'.join(k+'='+fields.get(k,v) for line in prop.read_text().splitlines() if '=' in line for k,v in [line.split('=',1)] if k!='updateJson')+'\n')
 note=(root/'module/tee/README.md').read_text()
 (web/'README.md').write_text('# TOPG\n\n'+note+'\n## Original COPG-VD documentation\n\n'+(root/'README.md').read_text())
 shutil.copy(root/'LICENSE',web/'LICENSE')
 with (web/'THIRD-PARTY.md').open('a') as f: f.write('\n## TOPG TEE integration\n\n'+note)
 (out/'zygisk').mkdir(exist_ok=True)
 for abi in ('arm64-v8a','armeabi-v7a','x86_64'): shutil.copy(root/'zygisk/build'/abi/'libspoof.so',out/'zygisk'/(abi+'.so'))
 for p in out.rglob('*.sh'): subprocess.run(['sh','-n',str(p)],check=True)
 for name in ('tee.js','tee_layout.js','tee_apps.js','tee_picker.js'): subprocess.run(['node','--check',str(web/'tee'/name)],check=True)
 subprocess.run(['node',str(root/'tests/tee-layout-detachment.test.cjs')],check=True)
 subprocess.run(['node',str(root/'tests/tee-picker-targets.test.cjs'),str(web/'tee/tee_picker.js')],check=True)
 for p in [*out.glob('*.sh'),tee/'tee_manager.sh',out/'META-INF/com/google/android/update-binary']: p.chmod(0o755)
 shutil.make_archive(str(out.parent/'TOPG-integrated'),'zip',out)

if __name__=='__main__':
 if len(sys.argv)==3 and sys.argv[1]=='patch': patch(Path(sys.argv[2]).resolve())
 elif len(sys.argv)==6 and sys.argv[1]=='assemble': assemble(*(Path(x).resolve() for x in sys.argv[2:]))
 else: raise SystemExit('Usage: assemble_topg.py patch UPSTREAM | assemble ROOT_ENGINE_ZIP UPSTREAM OUTPUT')
