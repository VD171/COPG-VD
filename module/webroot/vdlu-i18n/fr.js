/* Widget VDLU - traduction française. À charger AVANT vdlu.js et à passer dans init. Les clés manquantes utilisent la valeur anglaise par défaut (fusion partielle acceptée).
 *   <script src="i18n/fr.js"></script>
 *   VDLU.init({ ..., i18n: window.VDLU_I18N_FR });
 */
window.VDLU_I18N_FR = {
  ph_diff: 'Analyse', ph_fetch: 'Téléchargement', ph_apply: 'Application', ph_delete: 'Suppression', ph_commit: 'Vérification',
  st_PLANNED: 'Planifié', st_FETCHING: 'Téléchargement', st_FETCHED: 'Téléchargé', st_APPLYING: 'Application',
  st_APPLIED_LIVE: 'Appliqué (à chaud)', st_PENDING_REBOOT: 'Redémarrage requis', st_DONE: 'Terminé', st_ERROR: 'Erreur',
  processing: 'Traitement', updating: 'Mise à jour', close: 'Fermer', ok: 'OK', cancel: 'Annuler',
  bannerReboot: 'Redémarrez pour activer la nouvelle', so: '.so',
  appliedV: 'appliqué', updated: 'Mis à jour', allVerified: 'tout vérifié',
  appliedLive: 'appliqué (à chaud)', appliedShort: 'Appliqué', needRebootSo: 'nécessite un redémarrage pour activer la <code>.so</code>',
  error: 'Erreur', engineFail: 'échec du moteur', retry: 'Réessayer',
  cancelled: 'Annulé', applied: 'appliqués', resumable: 'reprenable', resume: 'Reprendre',
  starting: 'Démarrage…', startFail: 'Échec du démarrage',
  cancelling: 'Annulation…', cancellingSub: 'arrêt au prochain point sûr',
  resuming: 'Reprise…', resumeFail: 'Échec de la reprise',
  noResponse: 'Aucune réponse', noResponseSub: 'le moteur n\'a pas démarré ou s\'est terminé sans journal',
  checkBtn: 'Rechercher des mises à jour', updateNow: 'Mettre à jour', automation: 'Automatisation',
  onOpen: 'À l\'ouverture de la WebUI', onOpenSub: 'Exécute VDLU en arrière-plan (applique à chaud, prépare la <code>.so</code> pour le redémarrage).',
  onReboot: 'Au redémarrage', onRebootSub: 'En pre-zygote, applique tout, y compris la <code>.so</code>, sans redémarrage supplémentaire.',
  bootRetryEvery: 'Réessai au démarrage toutes les (s)', bootRetryUpTo: 'Réessai au démarrage jusqu\'à (min)', bootRetryHint: 'Si l\'appareil démarre hors ligne, continuer à réessayer la récupération du manifeste. 0 min = désactivé.',
  source: 'Source', saveSource: 'Enregistrer la source', savedDot: 'Enregistré.',
  netPolicy: 'Réseau', netAny: 'Wi-Fi + mobile', netWifi: 'Wi-Fi uniquement', netMobile: 'Mobile uniquement',
  savedToast: 'enregistré', saveFail: 'échec de l\'enregistrement', sourceSaved: 'source enregistrée',
  bootstrapping: 'Préparation du programme de mise à jour…', bootstrapSub: 'téléchargement unique du récupérateur', bootstrapFail: 'Impossible de préparer le programme de mise à jour',
  searching: 'Recherche…', upToDate: 'À jour', nothingNew: 'rien de nouveau',
  ahead: 'Plus récent que le flux', aheadSub: 'votre version est plus récente que la mise à jour publiée', deferred: 'Téléchargement différé', deferredSub: 'en attente du réseau autorisé - reprend à la prochaine vérification',
  updateAvail: 'Mise à jour disponible', install: 'installer', fileOne: 'fichier', fileMany: 'fichiers',
  requiresReboot: 'nécessite un redémarrage', checkFail: 'Échec de la vérification', ksuUnavailable: 'API KSU indisponible',
  pendingUpdate: 'Mise à jour en attente', notNow: 'Pas maintenant', srcPlaceholder: 'https://…/&lt;module&gt;'
};
