/*
 * ======================================================================
 *  COPG-VD  ::  global device spoofer
 *  Spoof your device fingerprint and build - Zygisk, KernelSU/APatch/Magisk.
 *
 *  Copyright (C) 2026  AlirezaParsi & VD171
 *  SPDX-License-Identifier: Apache-2.0
 *  Fork by VD171.
 *
 *  Licensed under the Apache License, Version 2.0; you may obtain a copy at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Site           : https://vd171.ru
 *  Site           : https://vd.priv8.ru
 *  Source         : https://github.com/VD171/COPG-VD
 *  GitHub         : @VD171 https://github.com/VD171
 *  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
 *  XDA thread     : https://xdaforums.com/t/COPG-VD.4807698/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Channel        : @Priv8_VD https://t.me/Priv8_VD
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 */
let configKeyOrder = [];
let currentConfig = {};
let editingDevice = null;
let logcatRunning = false;
let activeOutput = null;
let logcatOutput = null;
let navFromPop = false;

const CONFIG_FILE = "/data/adb/COPG-VD.json";
const MODULE_ID = 'COPG-VD';
const androidToSdkMapping = {
    '10': 29, '10.0': 29,
    '11': 30, '11.0': 30,
    '12': 31, '12.0': 31,
    '12L': 32, '12.1': 32,
    '13': 33, '13.0': 33,
    '14': 34, '14.0': 34,
    '15': 35, '15.0': 35,
    '16': 36, '16.0': 36
};

const sdkToAndroidMapping = (function() {
    const map = {};
    for (const [android, sdk] of Object.entries(androidToSdkMapping)) {
        map[sdk] = android.split('.')[0];
    }
    return map;
})();

window.onerror = function (message, source, lineno, colno, error) {
    const div = document.createElement('pre');
    div.style.position = 'fixed';
    div.style.bottom = '0';
    div.style.left = '0';
    div.style.right = '0';
    div.style.background = '#300';
    div.style.color = '#fff';
    div.style.zIndex = '9999';
    div.textContent = message + "\n" + source + ":" + lineno;
    document.body.appendChild(div);
};

const templates = {
    deviceCard: (data) => {
        const template = document.getElementById('device-card-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.device-card');
        
        card.dataset.key = data.key;
        card.style.animationDelay = `${data.delay}s`;
        card.querySelector('.device-name').textContent = data.deviceName;
        card.querySelector('.edit-btn').dataset.device = data.key;
        card.querySelector('.device-details').innerHTML = `Model: ${escapeHtml(data.model)}<br>
                                                           Brand: ${escapeHtml(data.brand)}<br>
                                                           Product: ${escapeHtml(data.product)}<br>
                                                           Manufacturer: ${escapeHtml(data.manufacturer)}<br>
                                                           Fingerprint: ${escapeHtml(data.fingerprint)}<br>
                                                           Board: ${escapeHtml(data.board)}<br>
                                                           Bootloader: ${escapeHtml(data.bootloader)}<br>
                                                           Hardware: ${escapeHtml(data.hardware)}<br>
                                                           ID: ${escapeHtml(data.id)}<br>
                                                           Display: ${escapeHtml(data.display)}<br>
                                                           HOST: ${escapeHtml(data.host)}<br>
                                                           Incremental: ${escapeHtml(data.incremental)}<br>
                                                           Timestamp: ${escapeHtml(data.timestamp)}<br>
                                                           Preview SDK: ${escapeHtml(data.preview_sdk)}<br>
                                                           SDK Full: ${escapeHtml(data.sdk_full)}<br>
                                                           Codename: ${escapeHtml(data.codename)}<br>
                                                           User: ${escapeHtml(data.user)}<br>
                                                           SDK Fingerprint: ${escapeHtml(data.sdk_fingerprint)}<br>
                                                           Security Patch: ${escapeHtml(data.security_patch)}`;
        
        return card;
    },

    directoryCard: (data) => {
        const template = document.getElementById('directory-card-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.directory-card');
        
        card.dataset.path = data.path;
        card.querySelector('.app-name').textContent = data.dirName;
        
        return card;
    },
    
    fileCard: (data) => {
        const template = document.getElementById('file-card-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.app-card');
        
        card.dataset.file = data.fileName;
        card.dataset.path = data.filePath;
        card.querySelector('.app-name').textContent = data.fileName;
        
        return card;
    }
};

function shq(value) {
    return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

async function execCommand(command) {
    return new Promise((resolve, reject) => {
        const callbackName = `exec_callback_${Date.now()}`;
        window[callbackName] = (errno, stdout, stderr) => {
            delete window[callbackName];
            if (errno === 0) {
                resolve(stdout || "");
            } else {
                // Surface the script's own reason (its `status:` line on stdout, or stderr)
                // instead of a bare exit code, so error reports are actionable everywhere.
                const sout = (stdout || "").trim();
                const line = sout.split("\n").map((s) => s.trim()).find((s) => s.startsWith("status:"));
                const detail = line ? line.replace(/^status:\s*/, "") : ((stderr || "").trim() || sout);
                reject(detail || `Command failed with error code ${errno}`);
            }
        };
        
        if (typeof ksu !== 'undefined' && ksu.exec) {
            ksu.exec(command, "{}", callbackName);
        } else {
            reject("KSU API not available");
        }
    });
}

function setupInfoPopup() {
    const versionText = document.getElementById('version-text');
    versionText.addEventListener('click', () => {
        showPopup('info-popup');
        loadMarkdownContent();
        
        setTimeout(() => {
            setInfoTabHeights();
            document.querySelectorAll('.info-tab-content').forEach(tab => {
                if (tab.id === 'info-about') {
                    tab.scrollTop = 0;
                } else {
                    const markdownContainer = tab.querySelector('.markdown-container');
                    if (markdownContainer) {
                        markdownContainer.scrollTop = 0;
                    }
                }
            });
        }, 100);
    });

    document.querySelector('.close-info-btn').addEventListener('click', () => {
        closePopup('info-popup');
    });
    
    document.querySelectorAll('.info-tab-nav .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            activateInfoTab(tabId);
        });
    });
    
    const infoPopup = document.getElementById('info-popup');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const displayStyle = infoPopup.style.display;
                if (displayStyle === 'flex') {
                    setTimeout(() => {
                        setInfoTabHeights();
                    }, 50);
                }
            }
        });
    });
    observer.observe(infoPopup, { attributes: true });
}

function setInfoTabHeights() {
    const tabContainer = document.querySelector('.info-tab-container');
    if (!tabContainer) return;
    
    const containerHeight = tabContainer.clientHeight;
    document.querySelectorAll('.info-tab-content').forEach(tab => {
        tab.style.height = containerHeight + 'px';
        if (tab.id === 'info-about') {
            tab.style.overflowY = 'auto';
            tab.style.overflowX = 'hidden';
        } else {
            const markdownContainer = tab.querySelector('.markdown-container');
            if (markdownContainer) {
                markdownContainer.style.height = '100%';
                markdownContainer.style.overflowY = 'auto';
                markdownContainer.style.overflowX = 'auto';
            }
        }
    });
}

function activateInfoTab(tabId) {
    document.querySelectorAll('.info-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.info-tab-nav .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTab = document.getElementById(tabId);
    const activeBtn = document.querySelector(`.info-tab-nav .tab-btn[data-tab="${tabId}"]`);
    
    if (activeTab && activeBtn) {
        activeTab.classList.add('active');
        activeBtn.classList.add('active');
        
        setTimeout(() => {
            setInfoTabHeights();
            if (tabId === 'info-about') {
                activeTab.scrollTop = 0;
            } else {
                const markdownContainer = activeTab.querySelector('.markdown-container');
                if (markdownContainer) {
                    markdownContainer.scrollTop = 0;
                    markdownContainer.scrollLeft = 0;
                }
            }
        }, 50);
    }
}

function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, iframe, object, embed, link, meta, base, form, style')
       .forEach(node => node.remove());
    doc.querySelectorAll('*').forEach(node => {
        for (const attr of Array.from(node.attributes)) {
            const name = attr.name.toLowerCase();
            const value = attr.value.replace(/\s+/g, '').toLowerCase();
            if (name.startsWith('on') || (['href', 'src', 'xlink:href'].includes(name) &&
                (value.startsWith('javascript:') || value.startsWith('data:text/html')))) {
                node.removeAttribute(attr.name);
            }
        }
    });
    return doc.body.innerHTML;
}

async function loadMarkdownContent() {
    const contents = {
        'license-content': 'LICENSE',
        'readme-content': 'README.md'
    };
    
    setTimeout(() => {
        setInfoTabHeights();
    }, 200);
    
    for (const [id, url] of Object.entries(contents)) {
        const container = document.getElementById(id);
        if (!container || container.dataset.loaded) continue;

        try {
            container.innerHTML = '<div style="text-align:center; padding:16px; color:var(--text-secondary);">Loading...</div>';
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            let text = await response.text();
            text = text.replace(/<center>([\s\S]*?)<\/center>/g, (match, content) => {
                const cleanedContent = content.replace(/^\s+/gm, '');
                return `<div class="centered-text">${cleanedContent}</div>`;
            });
            
            text = text.replace(/<div align="center">([\s\S]*?)<\/div>/g, (match, content) => {
                const cleanedContent = content.replace(/^\s+/gm, '');
                return `<div class="centered-text">${cleanedContent}</div>`;
            });
            
            text = text.replace(/<p align="center">([\s\S]*?)<\/p>/g, (match, content) => {
                const cleanedContent = content.replace(/^\s+/gm, '');
                return `<p class="centered-text">${cleanedContent}</p>`;
            });
            
            text = text.replace(/ style="text-align: ?center;?"/g, ' class="centered-text"');
            text = text.replace(/```mermaid\n([\s\S]*?)\n```/g, '```\n$1\n```');
            
            let html = marked.parse(text);
            html = processCallouts(html);
            container.innerHTML = sanitizeHtml(html);
            container.dataset.loaded = 'true';
            
            const centeredElements = container.querySelectorAll('.centered-text, center, [align="center"], [style*="text-align: center"], [style*="text-align:center"]');
            centeredElements.forEach(el => {
                const processTextNodes = (element) => {
                    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
                    let textNode;
                    while (textNode = walker.nextNode()) {
                        if (textNode.textContent.trim()) {
                            textNode.textContent = textNode.textContent.replace(/^\s+/gm, '');
                        }
                    }
                };
                
                processTextNodes(el);
                el.classList.add('centered-text');
                el.style.maxWidth = '100%';
                el.style.overflowX = 'hidden';
                el.style.wordWrap = 'break-word';
                el.style.wordBreak = 'break-word';
                el.style.textAlign = 'center';
                el.style.width = '100%';
                el.style.boxSizing = 'border-box';
                el.style.display = 'block';
                el.style.whiteSpace = 'normal';
                el.style.marginLeft = 'auto';
                el.style.marginRight = 'auto';
                el.style.paddingLeft = '0';
                el.style.paddingRight = '0';
            });
            
            const preElements = container.querySelectorAll('pre');
            preElements.forEach(pre => {
                const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT, null, false);
                let textNode;
                while (textNode = walker.nextNode()) {
                    if (textNode.textContent.trim()) {
                        textNode.textContent = textNode.textContent.replace(/^\s+/gm, '');
                    }
                }
            });
            
            const images = container.querySelectorAll('img');
            images.forEach(img => {
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.borderRadius = '8px';
                img.style.boxShadow = '0 2px 8px var(--shadow)';
            });
            
            const centeredImages = container.querySelectorAll('.centered-text img, center img, [align="center"] img');
            centeredImages.forEach(img => {
                img.style.display = 'block';
                img.style.margin = '16px auto';
            });
            
            const tables = container.querySelectorAll('table');
            tables.forEach(table => {
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.style.display = 'block';
                table.style.overflowX = 'auto';
                table.style.whiteSpace = 'nowrap';
            });
            
            container.querySelectorAll('a').forEach(link => {
                link.style.cursor = 'pointer';
                link.onclick = (e) => {
                    e.preventDefault();
                    openLink(link.href);
                };
            });
        } catch (err) {
            container.innerHTML = `<div style="color:var(--error); padding:16px;">Failed to load: ${escapeHtml(err.message)}</div>`;
        }
    }
    
    setTimeout(() => {
        setInfoTabHeights();
    }, 300);
}

function processCallouts(html) {
    const calloutMap = {
        'TIP': { icon: 'lightbulb', color: '#10B981', title: 'Tip' },
        'NOTE': { icon: 'note', color: '#3B82F6', title: 'Note' },
        'WARNING': { icon: 'warning', color: '#F59E0B', title: 'Warning' },
        'IMPORTANT': { icon: 'exclamation', color: '#EF4444', title: 'Important' },
        'CAUTION': { icon: 'alert', color: '#DC2626', title: 'Caution' }
    };

    const iconSvg = {
        lightbulb: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21h6m-3-2v2m0-6c-2.8 0-5-2.2-5-5 0-1.7.8-3.2 2-4.2.4-1.3 1.6-2.2 3-2.2s2.6.9 3 2.2c1.2 1 2 2.5 2 4.2 0 2.8-2.2 5-5 5z"></path></svg>',
        note: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        exclamation: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };
    
    html = html.replace(
        /\[!([A-Z]+)\](?:\s*<br>)?\s*(?:<p>)?([\s\S]*?)(?:<\/p>)?/g,
        (match, type, content) => {
            const config = calloutMap[type.toUpperCase()] || calloutMap.NOTE;
            content = content
                .replace(/<blockquote>\s*<p>/g, '')
                .replace(/<\/p>\s*<\/blockquote>/g, '')
                .replace(/&gt;/g, '>')
                .trim();

            return `
                <div class="callout callout-${type.toLowerCase()}" style="border-left-color: ${config.color};">
                    <div class="callout-header">
                        ${iconSvg[config.icon]}
                        <strong>${config.title}</strong>
                    </div>
                    <div class="callout-body">
                        ${content}
                    </div>
                </div>
            `.trim();
        }
    );
    
    html = html.replace(/<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g, '<blockquote><p>$1</p></blockquote>');
    return html;
}

function openLink(url) {
    let parsed;
    try {
        parsed = new URL(url);
    } catch (error) {
        appendToOutput(t('msg_097', {"url": url}), 'warning');
        return;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:' && parsed.protocol !== 'mailto:') {
        appendToOutput(t('msg_096', {"parsed.protocol": parsed.protocol}), 'warning');
        return;
    }
    execCommand(`am start -a android.intent.action.VIEW -d ${shq(parsed.href)}`).catch(() => {
        window.open(parsed.href, '_blank');
    });
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            appendToOutput(t('msg_045'), 'success');
        } else {
            appendToOutput(t('msg_068'), 'error');
        }
    } catch (err) {
        appendToOutput(t('msg_058') + err, 'error');
    }
    
    document.body.removeChild(textarea);
}

function showCopyFeedback(element) {
    const originalHTML = element.innerHTML;
    element.innerHTML = '<span style="color: var(--success)">✓</span>';
    setTimeout(() => {
        element.innerHTML = originalHTML;
    }, 2000);
}

async function saveLogToFile() {
    const output = logcatOutput || document.getElementById('output-logcat');
    const logContent = output ? (output.innerText || output.textContent) : '';

    if (!logContent.trim()) {
        appendToOutput(t('msg_094'), 'warning', logcatOutput);
        return false;
    }

    try {
        await execCommand(`mkdir -p /storage/emulated/0/Download/COPG-VD/LOGS`);
        let finalFilename = document.getElementById('save-log-popup').dataset.filename || await generateLogFilename();
        await execCommand(`echo ${shq(logContent)} > ${shq(`/storage/emulated/0/Download/COPG-VD/LOGS/${finalFilename}`)}`);
        appendToOutput(t('msg_088', {"finalFilename": finalFilename}), 'success', logcatOutput);
        return true;
    } catch (error) {
        appendToOutput(t('msg_078', {"error": error}), 'error', logcatOutput);
        return false;
    }
}

// Unified diagnostics: one place to read + export everything useful for a bug report.
async function gatherDiagnostics() {
    const cmd = `D=/data/adb; M="$D/modules/COPG-VD"
echo "===== COPG-VD Diagnostics ====="
echo "generated: $(date 2>/dev/null)"
echo; echo "[module]"
grep -E "^(id|version|versionCode)=" "$M/module.prop" 2>/dev/null
echo "loaded_in_maps: $(cat /proc/*/maps 2>/dev/null | grep -c COPG-VD/zygisk)"
echo "disabled: $([ -f "$M/disable" ] && echo yes || echo no)"
echo; echo "[root / zygisk]"
echo "rezygisk: $(grep -E ^version= "$D/modules/rezygisk/module.prop" 2>/dev/null | cut -d= -f2)"
echo "manager: $(for m in ksu ap magisk; do [ -d "$D/$m" ] && echo -n "$m "; done)"
echo; echo "[device]"
echo "fingerprint: $(getprop ro.build.fingerprint)"
echo "model: $(getprop ro.product.model) | android $(getprop ro.build.version.release) sdk $(getprop ro.build.version.sdk)"
echo; echo "[config] $D/COPG-VD.json"
cat "$D/COPG-VD.json" 2>/dev/null || echo "(no config)"
echo; echo "[update log - last 60]"
tail -n 60 "$D/COPG-VD.update.log" 2>/dev/null || echo "(none)"
echo; echo "[module logcat - last 120]"
logcat -d -s COPG-VD 2>/dev/null | tail -n 120 || echo "(unavailable)"
echo; echo "===== end ====="`;
    return await execCommand(cmd);
}

async function runDiagnostics() {
    const btn = document.getElementById('diag-run');
    const out = document.getElementById('output-diag');
    const panel = document.getElementById('out-diag');
    if (panel) panel.classList.remove('collapsed');
    if (btn) btn.classList.add('loading');
    if (out) out.textContent = t('msg_diag_running');
    try {
        if (out) out.textContent = await gatherDiagnostics();
    } catch (e) {
        if (out) out.textContent = String(e);
    } finally {
        if (btn) btn.classList.remove('loading');
    }
}

async function exportOutputToDownload(text, prefix) {
    const target = document.getElementById('output-diag');
    if (!text || !text.trim()) { appendToOutput(t('msg_094'), 'warning', target); return; }
    try {
        const dir = '/storage/emulated/0/Download/COPG-VD/LOGS';
        await execCommand(`mkdir -p ${shq(dir)}`);
        const n = new Date(), pad = (x) => String(x).padStart(2, '0');
        const ts = `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}-${pad(n.getHours())}${pad(n.getMinutes())}${pad(n.getSeconds())}`;
        const fn = `${prefix}-${ts}.txt`;
        await execCommand(`echo ${shq(text)} > ${shq(dir + '/' + fn)}`);
        appendToOutput(t('msg_088', {"finalFilename": fn}), 'success', target);
    } catch (e) {
        appendToOutput(t('msg_078', {"error": e}), 'error', target);
    }
}

async function generateLogFilename() {
    try {
        await execCommand(`mkdir -p /storage/emulated/0/Download/COPG-VD/LOGS`);
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        let filename = "COPG-VD-LOG.txt";
        const checkOriginal = await execCommand(`ls ${shq(`/storage/emulated/0/Download/COPG-VD/LOGS/${filename}`)} 2>/dev/null || echo "not_found"`);
        
        if (checkOriginal.trim() !== 'not_found') {
            filename = `COPG-VD-LOG-${dateStr}.txt`;
            const checkDated = await execCommand(`ls ${shq(`/storage/emulated/0/Download/COPG-VD/LOGS/${filename}`)} 2>/dev/null || echo "not_found"`);
            
            if (checkDated.trim() !== 'not_found') {
                filename = `COPG-VD-LOG-${dateStr}-${hours}${minutes}.txt`;
                const checkTime = await execCommand(`ls ${shq(`/storage/emulated/0/Download/COPG-VD/LOGS/${filename}`)} 2>/dev/null || echo "not_found"`);
                
                if (checkTime.trim() !== 'not_found') {
                    filename = `COPG-VD-LOG-${dateStr}-${hours}${minutes}${seconds}.txt`;
                    const checkSeconds = await execCommand(`ls ${shq(`/storage/emulated/0/Download/COPG-VD/LOGS/${filename}`)} 2>/dev/null || echo "not_found"`);
                    
                    if (checkSeconds.trim() !== 'not_found') {
                        let counter = 1;
                        let newFilename = `COPG-VD-LOG-${dateStr}-${hours}${minutes}${seconds}(${counter}).txt`;
                        let checkNumbered = await execCommand(`ls ${shq(`/storage/emulated/0/Download/COPG-VD/LOGS/${newFilename}`)} 2>/dev/null || echo "not_found"`);
                        
                        while (checkNumbered.trim() !== 'not_found') {
                            counter++;
                            newFilename = `COPG-VD-LOG-${dateStr}-${hours}${minutes}${seconds}(${counter}).txt`;
                            checkNumbered = await execCommand(`ls ${shq(`/storage/emulated/0/Download/COPG-VD/LOGS/${newFilename}`)} 2>/dev/null || echo "not_found"`);
                        }
                        filename = newFilename;
                    }
                }
            }
        }
        return filename;
    } catch (error) {
        appendToOutput(t('msg_061', {"error": error}), 'error');
        return "COPG-VD-LOG.txt";
    }
}

async function backupFile(filename) {
    try {
        await execCommand(`mkdir -p /sdcard/Download/COPG-VD`);
        const checkOriginal = await execCommand(`ls ${shq(`/sdcard/Download/COPG-VD/${filename}`)} 2>/dev/null || echo "not_found"`);
        
        let finalFilename = filename;
        if (checkOriginal.trim() !== 'not_found') {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const baseName = filename.split('.')[0];
            const extension = filename.split('.')[1];
            
            let newFilename = `${baseName}-${dateStr}.${extension}`;
            const checkDated = await execCommand(`ls ${shq(`/sdcard/Download/COPG-VD/${newFilename}`)} 2>/dev/null || echo "not_found"`);
            
            if (checkDated.trim() === 'not_found') {
                finalFilename = newFilename;
            } else {
                const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
                newFilename = `${baseName}-${dateStr}-${timeStr}.${extension}`;
                let checkTime = await execCommand(`ls ${shq(`/sdcard/Download/COPG-VD/${newFilename}`)} 2>/dev/null || echo "not_found"`);
                
                if (checkTime.trim() === 'not_found') {
                    finalFilename = newFilename;
                } else {
                    const fullTimeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
                    newFilename = `${baseName}-${dateStr}-${fullTimeStr}.${extension}`;
                    let checkFullTime = await execCommand(`ls ${shq(`/sdcard/Download/COPG-VD/${newFilename}`)} 2>/dev/null || echo "not_found"`);
                    
                    if (checkFullTime.trim() === 'not_found') {
                        finalFilename = newFilename;
                    } else {
                        let counter = 1;
                        let checkNumbered = await execCommand(`ls ${shq(`/sdcard/Download/COPG-VD/${newFilename}`)} 2>/dev/null || echo "not_found"`);
                        
                        while (checkNumbered.trim() !== 'not_found') {
                            newFilename = `${baseName}-${dateStr}-${fullTimeStr}(${counter}).${extension}`;
                            checkNumbered = await execCommand(`ls ${shq(`/sdcard/Download/COPG-VD/${newFilename}`)} 2>/dev/null || echo "not_found"`);
                            counter++;
                        }
                        finalFilename = newFilename;
                    }
                }
            }
        }
        
        await execCommand(`cp ${shq(`/data/adb/${filename}`)} ${shq(`/sdcard/Download/COPG-VD/${finalFilename}`)}`);
        appendToOutput(t('msg_049', {"finalFilename": finalFilename}), 'success');
        return true;
    } catch (error) {
        appendToOutput(t('msg_066', {"filename": filename, "error": error}), 'error');
        return false;
    }
}

function showBackupPopup() {
    activeOutput = openToolOutput('output-backup', false);
    showPopup('backup-popup');
}

function closeBackupPopup() {
    closePopup('backup-popup');
}

async function startLogcat(e) {
    if (e) e.stopPropagation();
    if (logcatRunning) return;

    try {
        logcatOutput = openToolOutput('output-logcat');
        appendToOutput(t('msg_100'), 'info', logcatOutput);
        logcatRunning = true;
        document.getElementById('start-logcat').style.display = 'none';
        document.getElementById('stop-logcat').style.display = '';

        await execCommand("su -c 'logcat -c'");
        readLogcat();
    } catch (error) {
        appendToOutput(t('msg_080', {"error": error}), 'error', logcatOutput);
        stopLogcat();
    }
}

async function readLogcat() {
    if (!logcatRunning) return;

    try {
        const logs = await execCommand("su -c 'logcat -d -s COPG-VD'");
        if (logs && logs.trim()) {
            const lines = logs.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    let logType = 'info';
                    if (line.includes(' E ') || line.includes('ERROR')) logType = 'error';
                    else if (line.includes(' W ') || line.includes('WARN')) logType = 'warning';
                    appendToOutput(line.trim(), logType, logcatOutput);
                }
            });
        }

        await execCommand("su -c 'logcat -c'");
        if (logcatRunning) {
            setTimeout(readLogcat, 10);
        }
    } catch (error) {
        appendToOutput(t('msg_089', {"error": error}), 'error', logcatOutput);
        stopLogcat();
    }
}

function stopLogcat(e) {
    if (e) e.stopPropagation();
    if (!logcatRunning) return;

    logcatRunning = false;
    try {
        execCommand("su -c 'logcat -c'").catch(() => {});
        appendToOutput(t('msg_090'), 'info', logcatOutput);
    } catch (error) {
        appendToOutput(t('msg_062', {"error": error}), 'error', logcatOutput);
    } finally {
        document.getElementById('start-logcat').style.display = '';
        document.getElementById('stop-logcat').style.display = 'none';
        showSaveLogPopup();
    }
}

async function showSaveLogPopup() {
    try {
        const filename = await generateLogFilename();
        document.getElementById('save-log-filename').textContent = filename;
        document.getElementById('save-log-popup').dataset.filename = filename;
        showPopup('save-log-popup');
    } catch (error) {
        appendToOutput(t('msg_060', {"error": error}), 'error');
        showPopup('save-log-popup');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const themeIcon = document.getElementById('theme-icon');
    themeIcon.textContent = document.body.classList.contains('dark-theme') ? '🌙' : '☀️';
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function appendToOutput(content, type = 'info', target) {
    const output = target || activeOutput;
    if (!output) { showToast(content, type); return; }
    const logEntry = document.createElement('div');

    let colorClass = 'log-info';
    let iconClass = 'icon-info';
    
    if (type === 'error') {
        colorClass = 'log-error';
        iconClass = 'icon-error';
    } else if (type === 'success') {
        colorClass = 'log-success';
        iconClass = 'icon-success';
    } else if (type === 'warning') {
        colorClass = 'log-warning';
        iconClass = 'icon-warning';
    } else {
        if (content.includes('[!]') || content.includes('❌')) {
            colorClass = 'log-error';
            iconClass = 'icon-error';
        } else if (content.includes('Deleted') || content.includes('Removed') || content.includes('Disabled')) {
            colorClass = 'log-red';
            iconClass = 'icon-error';
        } else if (content.includes('✅')) {
            colorClass = 'log-success';
            iconClass = 'icon-success';
        } else if (content.includes('📍') || content.includes('Deleting')) {
            colorClass = 'log-warning';
            iconClass = 'icon-warning';
        } else if (content.includes('Enabled')) {
            colorClass = 'log-green';
            iconClass = 'icon-success';
        } else if (content.includes('saved') || content.includes('added') || content.includes('cleared') || content.includes('shortcut created')) {
            colorClass = 'log-green';
            iconClass = 'icon-success';
        } else if (content.includes('canceled')) {
            colorClass = 'log-info';
            iconClass = 'icon-info';
        }
    }
    
    logEntry.className = colorClass;
    const icon = document.createElement('span');
    icon.className = `log-icon ${iconClass}`;
    logEntry.appendChild(icon);
    logEntry.appendChild(document.createTextNode(
        ` ${new Date().toLocaleTimeString()} - ${content.replace(/^\[.\]\s*/i, '')}`));
    output.appendChild(logEntry);
    const body = output.closest('.tool-output-body');
    if (body) body.scrollTop = body.scrollHeight;
}

function openToolOutput(bodyId, clear = true) {
    const output = document.getElementById(bodyId);
    if (!output) return null;
    if (clear) output.innerHTML = '';
    const panel = output.closest('.tool-output');
    if (panel) {
        panel.classList.remove('collapsed');
        const icon = panel.querySelector('.toggle-icon');
        if (icon) icon.classList.add('expanded');
    }
    return output;
}

function showToast(content, type = 'info') {
    let host = document.getElementById('toast-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'toast-host';
        document.body.appendChild(host);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = content.replace(/^\[.\]\s*/i, '');
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 3600);
}

async function loadVersion() {
    const versionElement = document.getElementById('version-text');
    try {
        const version = await execCommand("grep '^version=' /data/adb/modules/COPG-VD/module.prop | cut -d'=' -f2");
        versionElement.textContent = `${version.trim()}`;
    } catch (error) {
        appendToOutput(t('msg_073') + error, 'error');
    }
}

async function loadToggleStates() {
    try {
        const resetpropToggle = document.getElementById('toggle-resetprop');
        const roproductmanufacturerToggle = document.getElementById('toggle-ro-product-manufacturer');
        const autoupdateToggle = document.getElementById('toggle-autoupdate');
        resetpropToggle.checked = (await execCommand("[ -e /data/adb/modules/COPG-VD/.skip.resetprop ] && echo 0 || echo 1")).trim() === "1";
        roproductmanufacturerToggle.checked = (await execCommand("[ -e /data/adb/modules/COPG-VD/.skip.manufacturer ] && echo 0 || echo 1")).trim() === "1";
        autoupdateToggle.checked = (await execCommand("[ -e /data/adb/modules/COPG-VD/.skip.autoupdate ] && echo 0 || echo 1")).trim() === "1";
        await loadVersionPolicy();
    } catch (error) {
        appendToOutput(t('msg_072') + error, 'error');
    }
}

async function loadConfig() {
    try {
        const configContent = await execCommand(`cat ${shq(CONFIG_FILE)}`);
        const parsedConfig = JSON.parse(configContent);
        currentConfig = parsedConfig;
        configKeyOrder = Object.keys(parsedConfig);
        appendToOutput(t('msg_054'), 'success');
    } catch (error) {
        appendToOutput(t('msg_070') + error, 'error');
        currentConfig = {};
        configKeyOrder = [];
    }
}

const DEVICE_FIELDS = [
    ['DEVICE', 'ui_fld_device'], ['BRAND', 'ui_fld_brand'], ['MODEL', 'ui_fld_model'],
    ['PRODUCT', 'ui_fld_product'], ['MANUFACTURER', 'ui_fld_manufacturer'],
    ['FINGERPRINT', 'ui_fld_fingerprint'], ['BOARD', 'ui_fld_board'],
    ['BOOTLOADER', 'ui_fld_bootloader'], ['HARDWARE', 'ui_fld_hardware'], ['ID', 'ui_fld_id'],
    ['DISPLAY', 'ui_fld_display'], ['HOST', 'ui_fld_host'], ['INCREMENTAL', 'ui_fld_incremental'],
    ['TIMESTAMP', 'ui_fld_timestamp'], ['SECURITY_PATCH', 'ui_fld_security_patch'],
    ['PREVIEW_SDK', 'ui_fld_preview_sdk'], ['SDK_FULL', 'ui_fld_sdk_full'],
    ['CODENAME', 'ui_fld_codename'], ['USER', 'ui_fld_user'],
    ['SDK_FINGERPRINT', 'ui_fld_sdk_fingerprint'], ['ANDROID_VERSION', 'ui_fld_android_version'],
    ['SDK_INT', 'ui_fld_sdk_int'], ['FIRST_API_LEVEL', 'ui_fld_first_api_level']
];

const DEVICE_CATEGORIES = [
    ['ui_cat_identity', ['DEVICE', 'BRAND', 'MODEL', 'PRODUCT', 'MANUFACTURER', 'FINGERPRINT']],
    ['ui_cat_hardware', ['BOARD', 'BOOTLOADER', 'HARDWARE']],
    ['ui_cat_build',    ['ID', 'DISPLAY', 'HOST', 'INCREMENTAL', 'TIMESTAMP', 'USER', 'SDK_FINGERPRINT']],
    ['ui_cat_version',  ['SECURITY_PATCH', 'PREVIEW_SDK', 'SDK_FULL', 'CODENAME', 'ANDROID_VERSION', 'SDK_INT', 'FIRST_API_LEVEL']],
];
const DEVICE_LOCKED = ['ANDROID_VERSION', 'SDK_INT', 'SDK_FULL', 'CODENAME', 'FIRST_API_LEVEL'];
const DEVICE_LABELS = Object.fromEntries(DEVICE_FIELDS);
const DEVICE_STATE_LABELS = { spoof: 'ui_st_spoof', skip: 'ui_st_skip', empty: 'ui_st_empty', 'null': 'ui_st_null', global: 'ui_st_global' };
const devStateNeedsValue = (s) => s === 'spoof' || s === 'global';

function renderDeviceList() {
    const deviceList = document.getElementById('device-list');
    if (!deviceList) return appendToOutput(t('msg_063'), 'error');
    const profile = currentConfig['COPG-VD'] || {};
    const delList = Array.isArray(currentConfig['COPG-VD-Delete']) ? currentConfig['COPG-VD-Delete'] : [];
    const globList = Array.isArray(currentConfig['global_fields']) ? currentConfig['global_fields'] : [];
    deviceList.innerHTML = '';

    const stateOf = (key) => {
        if (globList.includes(key) && !DEVICE_LOCKED.includes(key)) return 'global';
        if (delList.includes(key) && !DEVICE_LOCKED.includes(key)) return 'null';
        if (profile[key] === '' && !DEVICE_LOCKED.includes(key)) return 'empty';
        if (profile[key] != null && profile[key] !== '') return 'spoof';
        return 'skip';
    };

    DEVICE_CATEGORIES.forEach(([catKey, keys]) => {
        const sec = document.createElement('div');
        sec.className = 'dev-category';
        const head = document.createElement('div');
        head.className = 'dev-cat-head';
        head.textContent = t(catKey);
        sec.appendChild(head);

        if (catKey === 'ui_cat_version') {
            const prow = document.createElement('div');
            prow.className = 'dev-field dev-policy';
            const phead = document.createElement('div');
            phead.className = 'dev-field-head';
            const plab = document.createElement('label');
            plab.className = 'dev-field-label';
            plab.textContent = t('ui_version_policy');
            const pinfo = document.createElement('button');
            pinfo.type = 'button';
            pinfo.className = 'info-btn-item';
            pinfo.dataset.info = 'version_spoof';
            pinfo.setAttribute('aria-label', 'Info');
            pinfo.textContent = '?';
            phead.appendChild(plab);
            phead.appendChild(pinfo);
            const psel = document.createElement('select');
            psel.id = 'select-spoof-version';
            psel.className = 'version-select';
            [['never', 'ui_022'], ['rom', 'ui_039'], ['force', 'ui_016']].forEach(([v, k]) => {
                const o = document.createElement('option');
                o.value = v; o.textContent = t(k);
                psel.appendChild(o);
            });
            psel.addEventListener('change', (e) => setVersionPolicy(e.target.value, e.target));
            const phint = document.createElement('small');
            phint.id = 'version-rom-hint';
            phint.className = 'toggle-hint';
            prow.appendChild(phead);
            prow.appendChild(psel);
            prow.appendChild(phint);
            sec.appendChild(prow);
            if (typeof loadVersionPolicy === 'function') loadVersionPolicy();
        }

        keys.forEach((key) => {
            const st = stateOf(key);
            const allowed = DEVICE_LOCKED.includes(key) ? ['spoof', 'skip'] : ['spoof', 'skip', 'empty', 'null', 'global'];
            const row = document.createElement('div');
            row.className = 'dev-field';
            row.dataset.key = key;
            row.dataset.state = st;

            const head = document.createElement('div');
            head.className = 'dev-field-head';
            const lab = document.createElement('label');
            lab.className = 'dev-field-label';
            lab.textContent = t(DEVICE_LABELS[key]);
            const info = document.createElement('button');
            info.type = 'button';
            info.className = 'info-btn-item';
            info.dataset.info = 'states';
            info.setAttribute('aria-label', 'Info');
            info.textContent = '?';
            head.appendChild(lab);
            head.appendChild(info);

            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'dev-value';
            inp.dataset.key = key;
            inp.value = (profile[key] != null && profile[key] !== '') ? profile[key] : '';
            inp.style.display = devStateNeedsValue(st) ? '' : 'none';

            const states = document.createElement('div');
            states.className = 'dev-states';
            states.setAttribute('role', 'radiogroup');
            allowed.forEach((s) => {
                const opt = document.createElement('label');
                opt.className = 'dev-st';
                opt.dataset.value = s;
                const r = document.createElement('input');
                r.type = 'radio';
                r.name = 'st_' + key;
                r.value = s;
                if (s === st) { r.checked = true; opt.classList.add('on'); }
                const span = document.createElement('span');
                span.textContent = t(DEVICE_STATE_LABELS[s]);
                opt.appendChild(r);
                opt.appendChild(span);
                r.addEventListener('change', () => {
                    states.querySelectorAll('.dev-st').forEach((e) => e.classList.remove('on'));
                    opt.classList.add('on');
                    row.dataset.state = s;
                    inp.style.display = devStateNeedsValue(s) ? '' : 'none';
                    row.classList.toggle('is-active', s !== 'skip');
                });
                states.appendChild(opt);
            });
            row.classList.toggle('is-active', st !== 'skip');

            row.appendChild(head);
            if (DEVICE_LOCKED.includes(key)) {
                const sub = document.createElement('div');
                sub.className = 'dev-field-sub';
                sub.textContent = t('ui_fldsub_' + key.toLowerCase());
                row.appendChild(sub);
            }
            row.appendChild(states);
            row.appendChild(inp);
            sec.appendChild(row);
        });
        deviceList.appendChild(sec);
    });
}

async function saveDeviceInline() {
    const deviceList = document.getElementById('device-list');
    const profile = Object.assign({}, currentConfig['COPG-VD'] || {});
    const fieldKeys = DEVICE_FIELDS.map(([k]) => k);
    let delList = (Array.isArray(currentConfig['COPG-VD-Delete']) ? currentConfig['COPG-VD-Delete'] : []).filter((k) => !fieldKeys.includes(k));
    let globList = (Array.isArray(currentConfig['global_fields']) ? currentConfig['global_fields'] : []).filter((k) => !fieldKeys.includes(k));

    deviceList.querySelectorAll('.dev-field').forEach((row) => {
        const key = row.dataset.key;
        const checked = row.querySelector('input[type="radio"]:checked');
        const inp = row.querySelector('.dev-value');
        const st = checked ? checked.value : 'skip';
        const val = inp ? inp.value.trim() : '';
        delete profile[key];
        if (st === 'spoof' || st === 'global') {
            if (val === '') return;
            profile[key] = val;
            if (st === 'global') globList.push(key);
        } else if (st === 'empty') {
            profile[key] = '';
        } else if (st === 'null') {
            delList.push(key);
        }
    });

    currentConfig['COPG-VD'] = profile;
    if (!configKeyOrder.includes('COPG-VD')) configKeyOrder.push('COPG-VD');
    if (delList.length) { currentConfig['COPG-VD-Delete'] = delList; if (!configKeyOrder.includes('COPG-VD-Delete')) configKeyOrder.push('COPG-VD-Delete'); }
    else delete currentConfig['COPG-VD-Delete'];
    if (globList.length) { currentConfig['global_fields'] = globList; if (!configKeyOrder.includes('global_fields')) configKeyOrder.push('global_fields'); }
    else delete currentConfig['global_fields'];

    fillIdentityPlate();
    try {
        await saveConfig();
        appendToOutput(t('msg_056', {"deviceName": profile.DEVICE || 'COPG-VD'}), 'success');
    } catch (error) {
        appendToOutput(t('msg_077', {"error": error}), 'error');
    }
}

function editDeviceHandler(e) {
    editDevice(e.currentTarget.dataset.device);
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        const content = popup.querySelector('.popup-content');
        content.classList.add('popup-exit');
        content.addEventListener('animationend', () => {
            popup.style.display = 'none';
            content.classList.remove('popup-exit');
        }, { once: true });
    }
}

function editDevice(deviceKey) {
    openDeviceModal(deviceKey);
}

function openDeviceModal(deviceKey = null) {
    const modal = document.getElementById('device-modal');
    const title = document.getElementById('device-modal-title');
    const form = document.getElementById('device-form');
    
    form.querySelectorAll('input').forEach(field => {
        field.classList.remove('error');
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('error-message')) {
            existingError.remove();
        }
    });
    
    if (deviceKey) {
        title.textContent = 'Edit Device Profile';
        editingDevice = deviceKey;
        const deviceData = currentConfig[deviceKey];
        document.getElementById('device-name').value = deviceData.DEVICE || '';
        document.getElementById('device-brand').value = deviceData.BRAND || '';
        document.getElementById('device-model').value = deviceData.MODEL || '';
        document.getElementById('device-product').value = deviceData.PRODUCT || '';
        document.getElementById('device-manufacturer').value = deviceData.MANUFACTURER || '';
        document.getElementById('device-fingerprint').value = deviceData.FINGERPRINT || '';
        document.getElementById('device-board').value = deviceData.BOARD || '';
        document.getElementById('device-bootloader').value = deviceData.BOOTLOADER || '';
        document.getElementById('device-hardware').value = deviceData.HARDWARE || '';
        document.getElementById('device-id').value = deviceData.ID || '';
        document.getElementById('device-display').value = deviceData.DISPLAY || '';
        document.getElementById('device-host').value = deviceData.HOST || '';
        document.getElementById('device-android-version').value = deviceData.ANDROID_VERSION || '';
        document.getElementById('device-sdk-int').value = deviceData.SDK_INT || '';
        document.getElementById('device-incremental').value = deviceData.INCREMENTAL || '';
        document.getElementById('device-timestamp').value = deviceData.TIMESTAMP || '';
        document.getElementById('device-security_patch').value = deviceData.SECURITY_PATCH || '';
        document.getElementById('device-preview_sdk').value = deviceData.PREVIEW_SDK || '';
        document.getElementById('device-sdk_full').value = deviceData.SDK_FULL || '';
        document.getElementById('device-codename').value = deviceData.CODENAME || '';
        document.getElementById('device-user').value = deviceData.USER || '';
        document.getElementById('device-sdk_fingerprint').value = deviceData.SDK_FINGERPRINT || '';
        setupAndroidSdkLink();
    } else {
        title.textContent = 'Add New Device Profile';
        editingDevice = null;
        form.reset();
        setupAndroidSdkLink();
    }
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.querySelector('.modal-content').classList.add('modal-enter');
    });
}

function setupAndroidSdkLink() {
    const androidInput = document.getElementById('device-android-version');
    const sdkInput = document.getElementById('device-sdk-int');
    
    if (!androidInput || !sdkInput) return;
    
    const newAndroidInput = androidInput.cloneNode(true);
    const newSdkInput = sdkInput.cloneNode(true);
    
    androidInput.parentNode.replaceChild(newAndroidInput, androidInput);
    sdkInput.parentNode.replaceChild(newSdkInput, sdkInput);
    
    function getSdkFromAndroid(androidValue) {
        const cleanVersion = androidValue.replace(/[^0-9.L]/g, '');
        
        if (androidToSdkMapping[cleanVersion]) {
            return androidToSdkMapping[cleanVersion];
        }
        
        const mainVersion = cleanVersion.split('.')[0];
        if (androidToSdkMapping[mainVersion]) {
            return androidToSdkMapping[mainVersion];
        }
        
        if (cleanVersion.endsWith('L')) {
            const withoutL = cleanVersion.slice(0, -1);
            if (androidToSdkMapping[withoutL]) {
                return androidToSdkMapping[withoutL];
            }
        }
        
        return null;
    }
    
    function getAndroidFromSdk(sdkValue) {
        const cleanSdk = sdkValue.replace(/[^0-9]/g, '');
        
        if (sdkToAndroidMapping[cleanSdk]) {
            return sdkToAndroidMapping[cleanSdk];
        }
        
        for (const [android, sdk] of Object.entries(androidToSdkMapping)) {
            if (sdk.toString() === cleanSdk) {
                return android.split('.')[0];
            }
        }
        
        return null;
    }
    
    newAndroidInput.addEventListener('input', function(e) {
        const androidValue = e.target.value.trim();
        if (!androidValue) return;
        
        const suggestedSdk = getSdkFromAndroid(androidValue);
        if (suggestedSdk) {
            const currentSdk = newSdkInput.value.trim();
            if (!currentSdk || currentSdk === suggestedSdk.toString()) {
                newSdkInput.value = suggestedSdk;
                highlightField(newSdkInput);
            }
        }
    });
    
    newSdkInput.addEventListener('input', function(e) {
        const sdkValue = e.target.value.trim();
        if (!sdkValue) return;
        
        const suggestedAndroid = getAndroidFromSdk(sdkValue);
        if (suggestedAndroid) {
            const currentAndroid = newAndroidInput.value.trim();
            if (!currentAndroid || currentAndroid === suggestedAndroid) {
                newAndroidInput.value = suggestedAndroid;
                highlightField(newAndroidInput);
            }
        }
    });
    
    function highlightField(field) {
        field.classList.add('suggested-value');
        setTimeout(() => {
            field.classList.remove('suggested-value');
        }, 3000);
    }
    
    newAndroidInput.addEventListener('focus', function() {
        this.classList.remove('suggested-value');
    });
    
    newSdkInput.addEventListener('focus', function() {
        this.classList.remove('suggested-value');
    });
}

async function saveDevice(e) {
    e.preventDefault();
    
    const form = document.getElementById('device-form');
    const requiredFieldIds = [
        'device-name',
        'device-brand',
        'device-model',
        'device-product',
        'device-manufacturer',
        'device-fingerprint',
        'device-board',
        'device-bootloader',
        'device-hardware',
        'device-id',
        'device-display',
        'device-host',
        'device-incremental',
        'device-timestamp',
        'device-security_patch',
        'device-preview_sdk',
        'device-sdk_full',
        'device-codename',
        'device-user',
        'device-sdk_fingerprint'
    ];
    let hasError = false;
    const missingFields = [];
    
    requiredFieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.classList.remove('error');
            const existingError = field.nextElementSibling;
            if (existingError && existingError.classList.contains('error-message')) {
                existingError.remove();
            }
        }
    });
    
    requiredFieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (field && !field.value.trim()) {
            field.classList.add('error');
            const errorMessage = document.createElement('span');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'This field is required';
            field.insertAdjacentElement('afterend', errorMessage);
            hasError = true;
            missingFields.push(field.labels[0]?.textContent || id);
        }
    });
    
    if (hasError) {
        const popupMessage = missingFields.length > 0 
            ? `Please fill in the following fields: ${missingFields.join(', ')}`
            : 'Please correct the errors in the form';
        appendToOutput(popupMessage, 'error');
        document.getElementById('error-message').textContent = popupMessage;
        showPopup('error-popup');
        return;
    }
    
    const deviceName = document.getElementById('device-name').value.trim();
    const brand = document.getElementById('device-brand').value.trim() || 'Undefined';
    const model = document.getElementById('device-model').value.trim() || 'Undefined';
    const product = document.getElementById('device-product').value.trim() || 'Undefined';
    const board = document.getElementById('device-board').value.trim() || 'Undefined';
    const bootloader = document.getElementById('device-bootloader').value.trim() || 'Undefined';
    const hardware = document.getElementById('device-hardware').value.trim() || 'Undefined';
    const id = document.getElementById('device-id').value.trim() || 'Undefined';
    const display = document.getElementById('device-display').value.trim() || 'Undefined';
    const host = document.getElementById('device-host').value.trim() || 'Undefined';
    const manufacturer = document.getElementById('device-manufacturer').value.trim() || 'Undefined';
    const fingerprint = document.getElementById('device-fingerprint').value.trim() || 'Undefined';
    const incremental = document.getElementById('device-incremental').value.trim() || 'Undefined';
    const timestamp = document.getElementById('device-timestamp').value.trim() || 'Undefined';
    const security_patch = document.getElementById('device-security_patch').value.trim() || 'Undefined';
    const androidVersion = document.getElementById('device-android-version').value.trim();
    const sdkInt = document.getElementById('device-sdk-int').value.trim();
    const preview_sdk = document.getElementById('device-preview_sdk').value.trim() || 'Undefined';
    const sdk_full = document.getElementById('device-sdk_full').value.trim() || 'Undefined';
    const codename = document.getElementById('device-codename').value.trim() || 'Undefined';
    const user = document.getElementById('device-user').value.trim() || 'Undefined';
    const sdk_fingerprint = document.getElementById('device-sdk_fingerprint').value.trim() || 'Undefined';
    
    const deviceData = {
        BRAND: brand,
        DEVICE: deviceName,
        MANUFACTURER: manufacturer,
        MODEL: model,
        FINGERPRINT: fingerprint,
        PRODUCT: product,
        BOARD: board,
        BOOTLOADER: bootloader,
        HARDWARE: hardware,
        ID: id,
        DISPLAY: display,
        HOST: host,
        INCREMENTAL: incremental,
        TIMESTAMP: timestamp,
        SECURITY_PATCH: security_patch,
        PREVIEW_SDK: preview_sdk,
        SDK_FULL: sdk_full,
        CODENAME: codename,
        USER: user,
        SDK_FINGERPRINT: sdk_fingerprint
    };
    
    if (androidVersion) {
        deviceData.ANDROID_VERSION = androidVersion;
    }
    
    if (sdkInt) {
        deviceData.SDK_INT = sdkInt;
    }
    
    try {
        const deviceKey = 'COPG-VD';
        currentConfig[deviceKey] = deviceData;
        
        if (!configKeyOrder.includes(deviceKey)) {
            configKeyOrder.push(deviceKey);
        }
        
        await saveConfig();
        closeModal('device-modal');
        renderDeviceList();
        appendToOutput(
            t('msg_056', {"deviceName": deviceName}),
            'success'
        );
    } catch (error) {
        appendToOutput(t('msg_077', {"error": error}), 'error');
    }
}

async function saveConfig() {
    try {
        const orderedConfig = {};
        for (const key of configKeyOrder) {
            if (currentConfig[key] !== undefined) {
                orderedConfig[key] = currentConfig[key];
            }
        }
        
        for (const key of Object.keys(currentConfig)) {
            if (!configKeyOrder.includes(key)) {
                configKeyOrder.push(key);
                orderedConfig[key] = currentConfig[key];
            }
        }
        const configStr = JSON.stringify(orderedConfig, null, 2);
        
        await execCommand(`echo ${shq(configStr)} > ${shq(CONFIG_FILE)}`);
        await execCommand(`chmod 644 ${shq(CONFIG_FILE)}`);

        await execCommand(`kill -9 $(pidof com.android.vending com.google.android.gsf com.google.android.gms) 2>/dev/null`);
        
        try {
            await execCommand(`chcon u:object_r:system_file:s0 ${shq(CONFIG_FILE)}`);
        } catch (selinuxError) {
            console.warn('Could not set SELinux context:', selinuxError);
        }
        
        appendToOutput(t('msg_055'), 'info');
    } catch (error) {
        appendToOutput(t('msg_076', {"error": error}), 'error');
        throw error;
    }
}

async function writeSetting(key, value) {
    try {
        if (!currentConfig['COPG-VD-Settings']) currentConfig['COPG-VD-Settings'] = {};
        currentConfig['COPG-VD-Settings'][key] = value;
        await saveConfig();
    } catch (error) {
        appendToOutput(t('msg_099', {"error": error}), 'warning');
    }
}

const RP_GROUPS = ['identity', 'version', 'boot_state', 'selinux_bootmode', 'adb_usb', 'anti_emulator', 'cleanup'];
const scopeNeedsApps = (m) => m === 'whitelist' || m === 'blacklist';

function loadScopeSettings() {
    try {
        const mode = currentConfig['scope_mode'] || 'playstore';
        const sel = document.getElementById('select-scope-mode');
        if (sel) sel.value = ['global', 'whitelist', 'blacklist', 'playstore'].includes(mode) ? mode : 'global';
        const appsGrp = document.getElementById('scope-apps-group');
        if (appsGrp) appsGrp.style.display = scopeNeedsApps(mode) ? '' : 'none';
        const jni = document.getElementById('toggle-motor-jni');
        if (jni) jni.checked = currentConfig['motor_jni'] !== false;
        const pm = document.getElementById('select-prop-method');
        if (pm) pm.value = (currentConfig['motor_prop_hook'] !== false && currentConfig['prop_method'] === 'mmap') ? 'mmap' : 'off';
        const dlvl = document.getElementById('select-drm-level');
        if (dlvl) dlvl.value = (currentConfig['motor_drm'] === true)
            ? (((currentConfig['COPG-VD'] || {})['DRM_SECURITY_LEVEL'] === 'L3') ? 'L3' : 'L1')
            : 'off';
        const drmGrp = document.getElementById('drm-apps-group');
        if (drmGrp) drmGrp.style.display = (currentConfig['motor_drm'] === true) ? '' : 'none';
        const grupos = (currentConfig['resetprop'] && currentConfig['resetprop'].grupos) || {};
        RP_GROUPS.forEach((g) => {
            const el = document.getElementById('grp-' + g);
            if (el) el.checked = grupos[g] !== false;
        });
        const vb = document.getElementById('toggle-verbose');
        if (vb) vb.checked = currentConfig['verbose_logs'] === true;
        fillIdentityPlate();
    } catch (e) {}
}

async function setVerbose(enabled) {
    currentConfig['verbose_logs'] = enabled;
    if (!configKeyOrder.includes('verbose_logs')) configKeyOrder.push('verbose_logs');
    await saveConfig();
}

async function checkRebootPending() {
    const el = document.getElementById('reboot-pending');
    if (!el) return;
    try {
        const out = await execCommand(
            'cfg=$(stat -c %Y ' + shq(CONFIG_FILE) + ' 2>/dev/null || echo 0); ' +
            'up=$(cut -d. -f1 /proc/uptime 2>/dev/null || echo 0); ' +
            'now=$(date +%s 2>/dev/null || echo 0); ' +
            'boot=$((now - up)); [ "$cfg" -gt "$boot" ] && echo pending || echo clean');
        el.style.display = out.trim() === 'pending' ? '' : 'none';
    } catch (e) { el.style.display = 'none'; }
}

async function rebootDevice() {
    try {
        await execCommand('(sync; sleep 1; svc power reboot || setprop sys.powerctl reboot || reboot) >/dev/null 2>&1 &');
        appendToOutput(t('msg_reboot'), 'info');
    } catch (e) {
        appendToOutput(t('msg_reboot_fail', {"error": e}), 'error');
    }
}

async function restartPlayServices() {
    try {
        await execCommand("for p in $(pgrep -f com.google.android.gms.unstable 2>/dev/null); do kill \"$p\" 2>/dev/null; done; true");
        appendToOutput(t('msg_restart_gms'), 'info');
    } catch (e) {
        appendToOutput(t('msg_reboot_fail', {"error": e}), 'error');
    }
}

let fetchIndex = null;
const FETCH_SCRIPT = '/data/adb/modules/COPG-VD/fingerprint-update.sh';

// Turn the script's own status code (e.g. "download-failed http=000 curl=6") into a
// localized human message, keeping the technical detail in brackets. Unknown codes
// (or a raw JS error) pass through unchanged. #8
function localizeFetchError(e) {
    const raw = String(e == null ? '' : e).trim();
    const code = raw.split(/\s+/)[0];
    const map = {
        'download-failed': 'msg_fe_download', 'no-downloader': 'msg_fe_nodl',
        'bad-prop': 'msg_fe_badprop', 'bad-index': 'msg_fe_badindex',
        'bad-path': 'msg_fe_badpath', 'map-failed': 'msg_fe_mapfail',
        'no-config': 'msg_fe_nocfg', 'write-failed': 'msg_fe_writefail',
        'no-arg': 'msg_fe_noarg'
    };
    const key = map[code];
    if (!key) return raw;
    const detail = raw.slice(code.length).trim();
    return detail ? (t(key) + ' [' + detail + ']') : t(key);
}
const FETCH_CHANNEL_ORDER = ['canary', 'beta', 'release'];

function fetchStatus(msg, type) {
    const el = document.getElementById('fetch-status');
    if (!el) return;
    const d = document.createElement('div');
    d.className = type === 'error' ? 'log-error' : (type === 'success' ? 'log-success' : 'log-info');
    d.textContent = msg;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
}

function currentChannelFor(dev) {
    if (!fetchIndex || !fetchIndex.devices[dev]) return null;
    const p = currentConfig['COPG-VD'] || {};
    const chans = fetchIndex.devices[dev].channels || {};
    const inc = p.INCREMENTAL, id = p.ID || p.DISPLAY;
    for (const c in chans) {
        if (inc && String(chans[c].incremental) === String(inc)) return c;
    }
    for (const c in chans) {
        if (id && chans[c].build && String(chans[c].build) === String(id)) return c;
    }
    return null;
}

function populateFetchChannels(dev) {
    const sel = document.getElementById('fetch-channel');
    if (!sel || !fetchIndex || !fetchIndex.devices[dev]) return;
    sel.innerHTML = '';
    const ch = fetchIndex.devices[dev].channels || {};
    Object.keys(ch).sort((a, b) => {
        const ia = FETCH_CHANNEL_ORDER.indexOf(a), ib = FETCH_CHANNEL_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    }).forEach((c) => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c + (ch[c] && ch[c].security_patch ? ' (' + ch[c].security_patch + ')' : '');
        sel.appendChild(o);
    });
}

async function openFetchPopup() {
    const devSel = document.getElementById('fetch-device');
    const chSel = document.getElementById('fetch-channel');
    const st = document.getElementById('fetch-status');
    if (st) st.innerHTML = '';
    if (devSel) devSel.innerHTML = '';
    if (chSel) chSel.innerHTML = '';
    const apBtn = document.getElementById('fetch-apply');
    const rsBtn = document.getElementById('fetch-restart');
    if (apBtn) apBtn.style.display = '';
    if (rsBtn) rsBtn.style.display = 'none';
    showPopup('fetch-popup');
    fetchStatus(t('msg_fetch_loading'), 'info');
    let out;
    try {
        out = await execCommand(`sh ${FETCH_SCRIPT} fetch-index`);
    } catch (e) {
        fetchStatus(t('msg_fetch_fail', {"error": localizeFetchError(e)}), 'error');
        return;
    }
    let data;
    try { data = JSON.parse(out); } catch (e) { data = null; }
    if (!data || !data.devices) {
        const hint = (out || '').trim().replace(/^status:\s*/, '').slice(0, 120);
        fetchStatus(t('msg_fetch_noindex') + (hint ? ' (' + hint + ')' : ''), 'error');
        return;
    }
    fetchIndex = data;
    const devs = Object.keys(data.devices).sort();
    devs.forEach((d) => {
        const o = document.createElement('option');
        o.value = d;
        o.textContent = data.devices[d].model ? data.devices[d].model + ' (' + d + ')' : d;
        devSel.appendChild(o);
    });
    const curDev = (currentConfig['COPG-VD'] || {}).DEVICE || '';
    const preDev = data.devices[curDev] ? curDev : devs[0];
    devSel.value = preDev;
    populateFetchChannels(preDev);
    const preChan = currentChannelFor(preDev);
    if (preChan) chSel.value = preChan;
    if (st) st.innerHTML = '';
}

async function doFetchApply() {
    if (!fetchIndex) return;
    const dev = document.getElementById('fetch-device').value;
    const chan = document.getElementById('fetch-channel').value;
    if (!dev || !chan) return;
    const meta = ((fetchIndex.devices[dev] || {}).channels || {})[chan] || {};
    const rel = meta.latest;
    if (!rel) { fetchStatus(t('msg_fetch_fail', {"error": 'no path'}), 'error'); return; }
    const btn = document.getElementById('fetch-apply');
    if (btn) btn.classList.add('loading');
    fetchStatus(t('msg_fetch_applying') + ' ' + rel, 'info');
    let out;
    try {
        out = await execCommand(`sh ${FETCH_SCRIPT} fetch ${shq(rel)}`);
    } catch (e) {
        if (btn) btn.classList.remove('loading');
        fetchStatus(t('msg_fetch_fail', {"error": localizeFetchError(e)}), 'error');
        return;
    }
    if (btn) btn.classList.remove('loading');
    const status = (out.split('\n').map((l) => l.trim()).find((l) => l.startsWith('status:')) || '')
        .replace('status:', '').trim();
    if (status === 'fetched') {
        await loadConfig();
        renderDeviceList();
        fillIdentityPlate();
        checkRebootPending();
        fetchStatus(t('msg_fetch_ok'), 'success');
        appendToOutput(t('msg_fetch_ok'), 'success');
        const ap = document.getElementById('fetch-apply');
        const rs = document.getElementById('fetch-restart');
        if (ap) ap.style.display = 'none';
        if (rs) rs.style.display = '';
    } else {
        fetchStatus(t('msg_fetch_fail', {"error": status || (out || '').trim().slice(0, 120)}), 'error');
    }
}

function fillIdentityPlate() {
    const p = currentConfig['COPG-VD'] || {};
    const modelEl = document.getElementById('identity-model');
    const fpEl = document.getElementById('identity-fp');
    const scopeEl = document.getElementById('identity-scope');
    const name = p.MODEL || p.DEVICE || p.PRODUCT || '';
    if (modelEl) {
        if (name) {
            modelEl.textContent = name;
            modelEl.classList.remove('empty');
            modelEl.removeAttribute('data-i18n');
        } else {
            modelEl.textContent = t('ui_profile_none');
            modelEl.classList.add('empty');
            modelEl.setAttribute('data-i18n', 'ui_profile_none');
        }
    }
    if (fpEl) fpEl.textContent = p.FINGERPRINT || '';
    if (scopeEl) {
        const mode = currentConfig['scope_mode'] || 'playstore';
        scopeEl.textContent = t('ui_scope_' + mode);
        scopeEl.classList.toggle('neutral', mode === 'global');
    }
}

async function setScopeMode(mode) {
    currentConfig['scope_mode'] = mode;
    const appsGrp = document.getElementById('scope-apps-group');
    if (appsGrp) appsGrp.style.display = scopeNeedsApps(mode) ? '' : 'none';
    fillIdentityPlate();
    await saveConfig();
}
async function setMotor(key, value) { currentConfig[key] = value; await saveConfig(); }
async function setPropHook(value) {
    currentConfig['motor_prop_hook'] = (value !== 'off');
    currentConfig['prop_method'] = (value === 'off') ? 'off' : value;
    await saveConfig();
}
async function setDrm(value) {
    currentConfig['motor_drm'] = (value !== 'off');
    if (value !== 'off') {
        const profile = Object.assign({}, currentConfig['COPG-VD'] || {});
        profile['DRM_SECURITY_LEVEL'] = value;
        currentConfig['COPG-VD'] = profile;
    }
    const drmGrp = document.getElementById('drm-apps-group');
    if (drmGrp) drmGrp.style.display = (value !== 'off') ? '' : 'none';
    await saveConfig();
}
async function setVersionPolicy(value, selectEl) {
    if (selectEl) selectEl.classList.toggle('danger', value === 'force');
    try {
        await execCommand(`echo ${shq(value)} > /data/adb/modules/COPG-VD/.spoof.version`);
        await writeSetting('spoof_version', value === 'force' ? 'rom' : value);
        if (value === 'force') appendToOutput(t('msg_064'), 'error');
        else if (value === 'rom') appendToOutput(t('msg_105'), 'warning');
        else appendToOutput(t('msg_047'), 'success');
    } catch (error) {
        appendToOutput(t('msg_067', {"error": error}), 'error');
        await loadVersionPolicy();
    }
}
async function setGlobalField(field, on) {
    let gf = Array.isArray(currentConfig['global_fields']) ? currentConfig['global_fields'].slice() : [];
    gf = gf.filter((f) => f !== field);
    if (on) gf.push(field);
    currentConfig['global_fields'] = gf;
    await saveConfig();
}
async function setGroup(name, value) {
    if (!currentConfig['resetprop']) currentConfig['resetprop'] = { enabled: true, grupos: {} };
    if (!currentConfig['resetprop'].grupos) currentConfig['resetprop'].grupos = {};
    currentConfig['resetprop'].grupos[name] = value;
    await saveConfig();
}

async function openAppPicker(key, title) {
    const current = Array.isArray(currentConfig[key]) ? currentConfig[key] : [];
    let pkgs = [];
    try {
        const out = await execCommand("pm list packages 2>/dev/null | sed 's/^package://' | sort");
        pkgs = out.split('\n').map((s) => s.trim()).filter(Boolean);
    } catch (e) {}
    current.forEach((p) => { if (!pkgs.includes(p)) pkgs.unshift(p); });
    const sel = new Set(current);

    const overlay = document.createElement('div');
    overlay.className = 'popup scope-apps-popup';
    overlay.style.display = 'flex';
    overlay.innerHTML =
        '<div class="popup-content">' +
          '<div class="modal-header"><h3></h3></div>' +
          '<input type="text" class="scope-app-filter" placeholder="filter">' +
          '<div class="popup-body scope-app-list"></div>' +
          '<div class="popup-footer">' +
            '<button class="action-btn scope-apps-save"></button>' +
            '<button class="cancel-btn scope-apps-cancel"></button>' +
          '</div>' +
        '</div>';
    overlay.querySelector('h3').textContent = title;
    overlay.querySelector('.scope-apps-save').textContent = t('ui_029');
    overlay.querySelector('.scope-apps-cancel').textContent = t('ui_006');
    const list = overlay.querySelector('.scope-app-list');
    pkgs.forEach((p) => {
        const row = document.createElement('label');
        row.className = 'scope-app-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.pkg = p;
        cb.checked = sel.has(p);
        row.appendChild(cb);
        row.appendChild(document.createTextNode(' ' + p));
        list.appendChild(row);
    });
    overlay.querySelector('.scope-app-filter').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        list.querySelectorAll('.scope-app-row').forEach((r) => {
            r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    });
    overlay.querySelector('.scope-apps-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.scope-apps-save').addEventListener('click', async () => {
        currentConfig[key] = [...list.querySelectorAll('input[data-pkg]:checked')].map((c) => c.dataset.pkg);
        await saveConfig();
        overlay.remove();
    });
    document.body.appendChild(overlay);
}

async function openScopeApps() {
    const mode = currentConfig['scope_mode'] || 'playstore';
    const key = mode === 'blacklist' ? 'scope_blacklist' : 'scope_whitelist';
    return openAppPicker(key, t('ui_scope_apps'));
}

async function openDrmApps() {
    return openAppPicker('drm_targets', t('ui_drm_apps'));
}

async function loadVersionPolicy() {
    const select = document.getElementById('select-spoof-version');
    const hint = document.getElementById('version-rom-hint');
    if (!select || !hint) return;
    try {
        const state = (await execCommand("cat /data/adb/modules/COPG-VD/.spoof.version 2>/dev/null || echo never")).trim();
        select.value = ['never', 'rom', 'force'].includes(state) ? state : 'never';
        select.classList.toggle('danger', select.value === 'force');
        const rom = (await execCommand(
            "grep -m1 '^ro.build.version.release=' /system/build.prop | cut -d= -f2; " +
            "grep -m1 '^ro.build.version.sdk=' /system/build.prop | cut -d= -f2")).trim().split('\n');
        hint.textContent = rom.length >= 2 ? `this ROM: Android ${rom[0].trim()}, SDK ${rom[1].trim()}` : '';
    } catch (error) {
        appendToOutput(t('msg_074', {"error": error}), 'error');
    }
}

async function runUpdater(mode) {
    const script = '/data/adb/modules/COPG-VD/fingerprint-update.sh';
    appendToOutput({
        apply: 'Updating COPG-VD.json from GitHub...',
        check: 'Checking GitHub for a newer build...',
        analyze: 'Analyzing the config as it stands...'
    }[mode] || 'Running the updater...', 'info');

    let output;
    try {
        output = await execCommand(`sh ${script} ${mode} 2>&1 || true`);
    } catch (error) {
        appendToOutput(t('msg_104', {"error": error}), 'error');
        return;
    }

    const lines = output.split('\n').map(line => line.trim()).filter(Boolean);
    lines.filter(line => line.startsWith('[COPG-VD]'))
         .forEach(line => appendToOutput(line.replace('[COPG-VD] ', ''), 'info'));
    const status = (lines.find(line => line.startsWith('status:')) || '').replace('status:', '').trim();

    switch (status) {
        case 'up-to-date':
            appendToOutput(t('msg_046'), 'success');
            break;
        case 'update-available':
            appendToOutput(t('msg_044'), 'warning');
            break;
        case 'applied':
            appendToOutput(t('msg_050'), 'success');
            await loadConfig();
            renderDeviceList();
            break;
        case 'analyze-ok':
            appendToOutput(t('msg_051'), 'success');
            break;
        case 'analyze-warn':
            appendToOutput(t('msg_052'), 'warning');
            break;
        case 'analyze-red':
            appendToOutput(t('msg_053'), 'error');
            break;
        case 'local-newer':
            appendToOutput(t('msg_107'), 'warning');
            break;
        case 'skipped-custom-device':
            appendToOutput(t('msg_108'), 'warning');
            break;
        case 'no-config':
            appendToOutput(t('msg_092'), 'error');
            break;
        default:
            appendToOutput(t('msg_103'), 'error');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const content = modal.querySelector('.modal-content');
    content.classList.remove('modal-enter');
    content.classList.add('modal-exit');
    content.addEventListener('animationend', () => {
        modal.style.display = 'none';
        content.classList.remove('modal-exit');
        editingDevice = null;
    }, { once: true });
}

function showPopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'flex';
        popup.querySelector('.popup-content').classList.remove('popup-exit');
    }
}

function hidePopup(popupId, callback) {
    const popup = document.getElementById(popupId);
    if (popup) {
        const content = popup.querySelector('.popup-content');
        content.classList.add('popup-exit');
        content.addEventListener('animationend', () => {
            popup.style.display = 'none';
            content.classList.remove('popup-exit');
            if (callback) callback();
        }, { once: true });
    }
}

function setupToolOutputPanels() {
    const tools = document.getElementById('tools-tab');
    if (!tools) return;
    tools.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.out-copy');
        if (copyBtn) {
            e.stopPropagation();
            const body = copyBtn.closest('.tool-output').querySelector('.output');
            copyToClipboard(body ? (body.innerText || body.textContent) : '');
            return;
        }
        const exportBtn = e.target.closest('.out-export');
        if (exportBtn) {
            e.stopPropagation();
            const body = exportBtn.closest('.tool-output').querySelector('.output');
            exportOutputToDownload(body ? (body.innerText || body.textContent) : '', 'COPG-VD-DIAG');
            return;
        }
        const clearBtn = e.target.closest('.out-clear');
        if (clearBtn) {
            e.stopPropagation();
            const body = clearBtn.closest('.tool-output').querySelector('.output');
            if (body) body.innerHTML = '';
            return;
        }
        const head = e.target.closest('.tool-output-head');
        if (head) {
            const panel = head.closest('.tool-output');
            panel.classList.toggle('collapsed');
            const icon = panel.querySelector('.toggle-icon');
            if (icon) icon.classList.toggle('expanded');
        }
    });
}

function visibleOverlays() {
    return Array.from(document.querySelectorAll('.modal, .popup')).filter((el) => {
        try { return getComputedStyle(el).display !== 'none'; } catch (e) { return false; }
    });
}

function currentTabId() {
    const tabs = ['about', 'devices', 'spoofing', 'system', 'tools'];
    return tabs.find((t) => document.getElementById(`tab-${t}`)?.classList.contains('active'))
        || tabs.find((t) => document.getElementById(`${t}-tab`)?.classList.contains('active'))
        || 'about';
}

function setupBackNav() {
    try { history.replaceState({ tab: currentTabId() }, ''); } catch (e) {}
    window.addEventListener('popstate', (e) => {
        const open = visibleOverlays();
        if (open.length) {
            const el = open[open.length - 1];
            if (el.classList.contains('modal')) closeModal(el.id); else closePopup(el.id);
            try { history.pushState({ tab: currentTabId() }, ''); } catch (err) {}
            return;
        }
        const target = (e.state && e.state.tab) || 'about';
        navFromPop = true;
        switchTab(target);
        navFromPop = false;
    });
}

function switchTab(tabId, direction = null) {
    const tabs = ['about', 'devices', 'spoofing', 'system', 'tools'];
    const currentTab = tabs.find(tab => document.getElementById(`${tab}-tab`)?.classList.contains('active'));
    if (currentTab === tabId) return;
    activeOutput = null;

    const currentTabElement = document.getElementById(`${currentTab}-tab`);
    const newTabElement = document.getElementById(`${tabId}-tab`);
    if (!newTabElement) return;

    const currentIndex = tabs.indexOf(currentTab);
    const newIndex = tabs.indexOf(tabId);
    const inferredDirection = direction || (newIndex > currentIndex ? 'left' : 'right');

    if (currentTabElement) {
        currentTabElement.classList.remove('active');
        currentTabElement.style.display = 'none';
        currentTabElement.style.transform = 'translateX(0)';
        currentTabElement.style.opacity = '0';
    }

    newTabElement.style.display = 'block';
    newTabElement.style.transition = 'none';
    newTabElement.style.transform = 'translateX(100%)';
    newTabElement.style.opacity = '0';

    void newTabElement.offsetHeight;

    requestAnimationFrame(() => {
        newTabElement.classList.add('active');
        newTabElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        newTabElement.style.transform = 'translateX(0)';
        newTabElement.style.opacity = '1';
        if (tabId === 'devices') {
            setTimeout(() => renderDeviceList(), 100);
        }
        if (tabId === 'tools') {
            checkRebootPending();
        }
    });

    document.querySelectorAll('.tab-nav .tab-btn.active:not(#info-popup .tab-btn)').forEach(btn => btn.classList.remove('active'))
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
    const sb = document.getElementById('device-savebar');
    if (sb) sb.style.display = (tabId === 'devices') ? '' : 'none';
    if (!navFromPop) { try { history.pushState({ tab: tabId }, ''); } catch (e) {} }
}

function applyEventListeners() {
    const scopeSel = document.getElementById('select-scope-mode');
    if (scopeSel) scopeSel.addEventListener('change', (e) => setScopeMode(e.target.value));
    const mjni = document.getElementById('toggle-motor-jni');
    if (mjni) mjni.addEventListener('change', (e) => setMotor('motor_jni', e.target.checked));
    const pmSel = document.getElementById('select-prop-method');
    if (pmSel) pmSel.addEventListener('change', (e) => setPropHook(e.target.value));
    const dlvlSel = document.getElementById('select-drm-level');
    if (dlvlSel) dlvlSel.addEventListener('change', (e) => setDrm(e.target.value));
    RP_GROUPS.forEach((g) => {
        const el = document.getElementById('grp-' + g);
        if (el) el.addEventListener('change', (e) => setGroup(g, e.target.checked));
    });
    const scopeAppsBtn = document.getElementById('scope-apps-edit');
    if (scopeAppsBtn) scopeAppsBtn.addEventListener('click', openScopeApps);
    const drmAppsBtn = document.getElementById('drm-apps-edit');
    if (drmAppsBtn) drmAppsBtn.addEventListener('click', openDrmApps);
    const deviceSaveBtn = document.getElementById('device-save-btn');
    if (deviceSaveBtn) deviceSaveBtn.addEventListener('click', saveDeviceInline);
    document.getElementById('toggle-resetprop').addEventListener('click', async (e) => {
        const isChecked = e.target.checked;
        try {
            await execCommand(`${isChecked ? "rm -f" : "touch"} /data/adb/modules/COPG-VD/.skip.resetprop`);
            await writeSetting('resetprop', isChecked);
            appendToOutput(isChecked ? "Resetprop Enabled. Reboot to see changes" : "Resetprop Disabled. Reboot to see changes", isChecked ? 'success' : 'error');
        } catch (error) {
            appendToOutput(t('msg_081', {"error": error}), 'error');
            e.target.checked = !isChecked;
        }
    });
    document.getElementById('toggle-ro-product-manufacturer').addEventListener('click', async (e) => {
        const isChecked = e.target.checked;
        try {
            await execCommand(`${isChecked ? "rm -f" : "touch"} /data/adb/modules/COPG-VD/.skip.manufacturer`);
            await writeSetting('spoof_manufacturer', isChecked);
            appendToOutput(isChecked ? "Ro.Product.Manufacturer Enabled. Reboot to see changes" : "Ro.Product.Manufacturer Disabled. Reboot to see changes", isChecked ? 'success' : 'error');
        } catch (error) {
            appendToOutput(t('msg_082', {"error": error}), 'error');
            e.target.checked = !isChecked;
        }
    });

    document.getElementById('analyze-config').addEventListener('click', async (e) => {
        e.target.classList.add('loading');
        activeOutput = openToolOutput('output-analyze');
        try { await runUpdater('analyze'); } finally { activeOutput = null; e.target.classList.remove('loading'); }
    });
    
    document.getElementById('toggle-autoupdate').addEventListener('click', async (e) => {
        const isChecked = e.target.checked;
        try {
            await execCommand(`${isChecked ? "rm -f" : "touch"} /data/adb/modules/COPG-VD/.skip.autoupdate`);
            await writeSetting('autoupdate', isChecked);
            appendToOutput(isChecked ? "JSON auto-update enabled (once per boot)" : "JSON auto-update disabled", isChecked ? 'success' : 'info');
        } catch (error) {
            appendToOutput(t('msg_083', {"error": error}), 'error');
            e.target.checked = !isChecked;
        }
    });

    document.getElementById('check-update').addEventListener('click', async (e) => {
        e.target.classList.add('loading');
        activeOutput = openToolOutput('output-check');
        try { await runUpdater('check'); } finally { activeOutput = null; e.target.classList.remove('loading'); }
    });

    document.getElementById('apply-update').addEventListener('click', async (e) => {
        e.target.classList.add('loading');
        activeOutput = openToolOutput('output-apply');
        try { await runUpdater('apply'); } finally { activeOutput = null; e.target.classList.remove('loading'); }
    });

    setupBackupListeners();

    document.getElementById('save-log-yes').addEventListener('click', async () => {
        hidePopup('save-log-popup', async () => {
            await saveLogToFile();
        });
    });

    document.querySelectorAll('.info-tab-nav .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            activateInfoTab(tabId);
        });
    });

    document.getElementById('save-log-no').addEventListener('click', () => {
        closePopup('save-log-popup');
        appendToOutput(t('msg_087'), 'info');
    });
    
    document.getElementById('start-logcat').addEventListener('click', startLogcat);
    document.getElementById('stop-logcat').addEventListener('click', stopLogcat);
    setupToolOutputPanels();
    document.getElementById('toggle-verbose').addEventListener('click', async (e) => {
        const isChecked = e.target.checked;
        try {
            await setVerbose(isChecked);
            appendToOutput(isChecked ? 'Verbose logging enabled' : 'Verbose logging disabled', isChecked ? 'success' : 'info');
        } catch (error) {
            appendToOutput(t('msg_082', {"error": error}), 'error');
            e.target.checked = !isChecked;
        }
    });
    document.getElementById('reboot-device').addEventListener('click', rebootDevice);
    const rfw = document.getElementById('restart-gms');
    if (rfw) rfw.addEventListener('click', restartPlayServices);
    document.getElementById('fetch-profile').addEventListener('click', openFetchPopup);
    document.getElementById('diag-run')?.addEventListener('click', runDiagnostics);
    const fpDev = document.getElementById('fetch-profile-device');
    if (fpDev) fpDev.addEventListener('click', openFetchPopup);
    document.getElementById('fetch-apply').addEventListener('click', doFetchApply);
    const fRestart = document.getElementById('fetch-restart');
    if (fRestart) fRestart.addEventListener('click', () => { closePopup('fetch-popup'); restartPlayServices(); });
    document.getElementById('fetch-device').addEventListener('change', (e) => populateFetchChannels(e.target.value));
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    document.getElementById('tab-about').addEventListener('click', () => switchTab('about'));
    document.getElementById('tab-devices').addEventListener('click', () => switchTab('devices'));
    document.getElementById('tab-spoofing').addEventListener('click', () => switchTab('spoofing'));
    document.querySelectorAll('#about-tab .about-row[data-link]').forEach((row) => {
        row.addEventListener('click', () => openLink(row.getAttribute('data-link')));
    });
    document.getElementById('tab-system').addEventListener('click', () => switchTab('system'));
    document.getElementById('tab-tools').addEventListener('click', () => switchTab('tools'));
    setupBackNav();

    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        const popup = btn.closest('.popup');
        if (modal) closeModal(modal.id);
        if (popup) closePopup(popup.id);
    }));

    document.getElementById('device-form').addEventListener('submit', saveDevice);

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    document.querySelectorAll('.popup').forEach(popup => {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) closePopup(popup.id);
        });
    });

    document.getElementById('error-ok').addEventListener('click', () => {
        closePopup('error-popup');
    });

}

window.addEventListener('resize', () => {
    const infoPopup = document.getElementById('info-popup');
    if (infoPopup.style.display === 'flex') {
        setInfoTabHeights();
    }
});

const LANG_NAMES = {
    en: "English", ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", cs: "\u010ce\u0161tina",
    de: "Deutsch", es: "Espa\u00f1ol", fa: "\u0641\u0627\u0631\u0633\u06cc", fr: "Fran\u00e7ais",
    hi: "\u0939\u093f\u0928\u094d\u0926\u0940", in: "Bahasa Indonesia", it: "Italiano",
    ja: "\u65e5\u672c\u8a9e", ko: "\ud55c\uad6d\uc5b4", nl: "Nederlands", pl: "Polski",
    pt: "Portugu\u00eas", ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", sv: "Svenska",
    th: "\u0e44\u0e17\u0e22", tr: "T\u00fcrk\u00e7e", vi: "Ti\u1ebfng Vi\u1ec7t", zh: "\u4e2d\u6587"
};

function setupLanguageSelector() {
    const list = document.getElementById('lang-list');
    const btn = document.getElementById('lang-toggle');
    if (!list || !window.I18N) return;
    const render = () => {
        list.innerHTML = '';
        const cur = window.I18N.current;
        const ordered = [cur, ...window.I18N.AVAILABLE.filter((c) => c !== cur)];
        ordered.forEach((code) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'lang-item' + (code === cur ? ' active' : '');
            item.textContent = LANG_NAMES[code] || code;
            item.addEventListener('click', async () => {
                closePopup('lang-popup');
                try {
                    await window.I18N.set(code);
                    if (typeof writeSetting === 'function') { try { await writeSetting('lang', code); } catch (_) {} }
                    if (typeof renderDeviceList === 'function') renderDeviceList();
                    appendToOutput(t('msg_lang_changed'), 'success');
                } catch (err) {
                    appendToOutput(t('msg_lang_error', {"error": err}), 'error');
                }
            });
            list.appendChild(item);
        });
    };
    render();
    if (btn) btn.addEventListener('click', () => { render(); showPopup('lang-popup'); });
}

function setupItemInfo() {
    const titleEl = document.getElementById('iteminfo-title');
    const bodyEl = document.getElementById('iteminfo-body');
    if (!titleEl || !bodyEl) return;
    document.addEventListener('click', (e) => {
        const btn = e.target.closest ? e.target.closest('.info-btn-item') : null;
        if (!btn) return;
        const key = btn.dataset.info;
        const wrap = btn.closest('.tg-label');
        const lbl = wrap ? wrap.querySelector('.toggle-label') : null;
        titleEl.textContent = lbl
            ? (lbl.childNodes[0] ? lbl.childNodes[0].textContent.trim() : lbl.textContent.trim())
            : t('ui_infoT_' + key);
        bodyEl.textContent = t('ui_info_' + key);
        showPopup('iteminfo-popup');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.I18N) { try { await window.I18N.init(); } catch (e) {} }
    setupLanguageSelector();
    setupInfoPopup();
    setupItemInfo();

    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.getElementById('theme-icon').textContent = '☀️';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-icon').textContent = '🌙';
    }
        
    appendToOutput(t('msg_102'), 'success');
    await loadVersion();
    await loadToggleStates();
    await loadConfig();
    loadScopeSettings();
    applyEventListeners();
    renderDeviceList();
});

async function getPreferredStartPath() {
    const paths = ['/storage/emulated/0/Download', '/storage/emulated/0'];
    for (const path of paths) {
        try {
            const lsOutput = await execCommand(`ls -l ${shq(path)} || echo "ERROR: dir_not_found"`);
            if (!lsOutput.includes('ERROR: dir_not_found') && !lsOutput.includes('No such file or directory')) {
                appendToOutput(t('msg_098', {"path": path}), 'info');
                return path;
            }
        } catch (error) {
            appendToOutput(t('msg_065', {"path": path, "error.message": error.message}), 'warning');
        }
    }
    appendToOutput(t('msg_093'), 'warning');
    return '/storage/emulated/0';
}

async function recursiveFileSearch(basePath, searchTerm = '') {
    const results = [];
    try {
        const findOutput = await execCommand(`find ${shq(basePath)} -type f \\( -name "*.json" -o -name "*.txt" \\) || echo ""`);
        const files = findOutput.trim().split('\n').filter(f => f && (f.endsWith('.json') || f.endsWith('.txt')));
        
        for (const file of files) {
            const fileName = file.split('/').pop();
            if (!searchTerm || fileName.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({
                    path: file,
                    name: fileName
                });
            }
        }
        return results;
    } catch (error) {
        appendToOutput(t('msg_079', {"basePath": basePath, "error": error}), 'error');
        return [];
    }
}

async function restoreFile(sourcePath, targetFile) {
    try {
        if (!sourcePath || !targetFile) {
            throw new Error(`Invalid source or target path: source=${sourcePath}, target=${targetFile}`);
        }

        const cpOutput = await execCommand(`cp ${shq(sourcePath)} ${shq(`/data/adb/${targetFile}`)} || echo "ERROR: cp_failed"`);
        if (cpOutput.includes('ERROR: cp_failed')) {
            throw new Error(`Copy command failed: ${cpOutput}`);
        }

        await execCommand(`chmod 644 ${shq(`/data/adb/${targetFile}`)}`);
        
        try {
            await execCommand(`chcon u:object_r:system_file:s0 ${shq(`/data/adb/${targetFile}`)}`);
        } catch (selinuxError) {
            console.warn('Could not set SELinux context:', selinuxError);
        }

        appendToOutput(t('msg_101', {"sourcePath.split('/').pop()": sourcePath.split('/').pop(), "targetFile": targetFile}), 'success');

        if (targetFile === 'COPG-VD.json') {
            await loadConfig();
            renderDeviceList();
        }
        return true;
    } catch (error) {
        appendToOutput(t('msg_075', {"sourcePath ? sourcePath.split('/').pop() : 'unknown file'": sourcePath ? sourcePath.split('/').pop() : 'unknown file', "error.message": error.message}), 'error');
        return false;
    }
}

async function showFilePicker(targetFile, startPath = null) {
    if (!targetFile) {
        targetFile = 'COPG-VD.json';
        appendToOutput(t('msg_106'), 'warning');
    }

    appendToOutput(t('msg_085', {"targetFile": targetFile}), 'info');
    const popup = document.getElementById('file-picker-popup');
    const searchInput = document.getElementById('file-picker-search');
    const fileList = document.getElementById('file-picker-list');
    const pathElement = document.getElementById('file-picker-path');
    const backBtn = document.getElementById('file-picker-back');

    const currentPath = startPath || await getPreferredStartPath();

    searchInput.setAttribute('readonly', 'true');
    searchInput.value = '';
    fileList.innerHTML = '<div class="loader" style="width: 100%; height: 40px; margin: 16px 0;"></div>';
    pathElement.textContent = currentPath;

    backBtn.style.display = currentPath === '/storage/emulated/0' ? 'none' : 'flex';

    const enableSearch = () => {
        searchInput.removeAttribute('readonly');
        searchInput.focus();
        searchContainer.removeEventListener('click', enableSearch);
    };
    const searchContainer = popup.querySelector('.search-container');
    searchContainer.addEventListener('click', enableSearch);

    try {
        const lsOutput = await execCommand(`ls -l ${shq(currentPath)} || echo "ERROR: dir_not_found"`);
        if (lsOutput.includes('ERROR: dir_not_found') || lsOutput.includes('No such file or directory')) {
            if (currentPath !== '/storage/emulated/0') {
                appendToOutput(t('msg_057', {"currentPath": currentPath}), 'warning');
                return showFilePicker(targetFile, '/storage/emulated/0');
            } else {
                throw new Error(`Cannot access ${currentPath}: Directory not found or no permission`);
            }
        }

        const lines = lsOutput.trim().split('\n').filter(line => line && !line.startsWith('total'));
        const fileArray = [];
        const dirArray = [];

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 8) return;
            const permissions = parts[0];
            const name = parts.slice(7).join(' ');
            if (permissions.startsWith('d')) {
                dirArray.push(name);
            } else if (name.endsWith('.json') || name.endsWith('.txt')) {
                fileArray.push(name);
            }
        });

        fileList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        dirArray.forEach(dir => {
            const dirCard = templates.directoryCard({
                path: `${currentPath}/${dir}`.replace('//', '/'),
                dirName: dir
            });
            
            dirCard.addEventListener('click', () => {
                showFilePicker(targetFile, `${currentPath}/${dir}`.replace('//', '/'));
            });
            
            fragment.appendChild(dirCard);
        });

        fileArray.forEach(file => {
            const fileCard = templates.fileCard({
                fileName: file,
                filePath: `${currentPath}/${file}`.replace('//', '/')
            });
            
            fileCard.addEventListener('click', async () => {
                await restoreFile(`${currentPath}/${file}`.replace('//', '/'), targetFile);
                closePopup('file-picker-popup');
                searchInput.value = '';
            });
            
            fragment.appendChild(fileCard);
        });

        if (dirArray.length === 0 && fileArray.length === 0) {
            fileList.innerHTML = `
                <div class="error-message" style="color: var(--text-secondary); text-align: center; padding: 16px;">
                    No files or folders found in ${escapeHtml(currentPath)}
                </div>
            `;
        } else {
            fileList.appendChild(fragment);
        }

        searchInput.addEventListener('input', async (e) => {
            const searchTerm = e.target.value.trim();
            if (!searchTerm) {
                fileList.innerHTML = '<div class="loader" style="width: 100%; height: 40px; margin: 16px 0;"></div>';
                const tempFragment = document.createDocumentFragment();
                
                dirArray.forEach(dir => {
                    const dirCard = templates.directoryCard({
                        path: `${currentPath}/${dir}`.replace('//', '/'),
                        dirName: dir
                    });
                    
                    dirCard.addEventListener('click', () => {
                        showFilePicker(targetFile, `${currentPath}/${dir}`.replace('//', '/'));
                    });
                    
                    tempFragment.appendChild(dirCard);
                });

                fileArray.forEach(file => {
                    const fileCard = templates.fileCard({
                        fileName: file,
                        filePath: `${currentPath}/${file}`.replace('//', '/')
                    });
                    
                    fileCard.addEventListener('click', async () => {
                        await restoreFile(`${currentPath}/${file}`.replace('//', '/'), targetFile);
                        closePopup('file-picker-popup');
                        searchInput.value = '';
                    });
                    
                    tempFragment.appendChild(fileCard);
                });

                fileList.innerHTML = '';
                if (dirArray.length === 0 && fileArray.length === 0) {
                    fileList.innerHTML = `
                        <div class="error-message" style="color: var(--text-secondary); text-align: center; padding: 16px;">
                            No files or folders found in ${escapeHtml(currentPath)}
                        </div>
                    `;
                } else {
                    fileList.appendChild(tempFragment);
                }
                return;
            }

            fileList.innerHTML = '<div class="loader" style="width: 100%; height: 40px; margin: 16px 0;"></div>';
            const baseSearchPath = (await getPreferredStartPath()).startsWith('/storage/emulated/0') 
                ? '/storage/emulated/0/Download' 
                : '/storage/emulated/0';
            const searchResults = await recursiveFileSearch(baseSearchPath, searchTerm);
            
            fileList.innerHTML = '';
            const searchFragment = document.createDocumentFragment();

            if (searchResults.length === 0) {
                fileList.innerHTML = `
                    <div class="error-message" style="color: var(--text-secondary); text-align: center; padding: 16px;">
                        No matching files found
                    </div>
                `;
            } else {
                searchResults.forEach(file => {
                    const fileCard = document.createElement('div');
                    fileCard.className = 'app-card';
                    fileCard.dataset.file = file.name;
                    fileCard.dataset.path = file.path;
                    fileCard.innerHTML = `
                        <div class="app-icon-container">
                            <div class="app-icon-placeholder file-icon"></div>
                        </div>
                        <div class="app-info">
                            <div class="app-name">${escapeHtml(file.name)}</div>
                            <div>${escapeHtml(file.path)}</div>
                        </div>
                    `;
                    fileCard.addEventListener('click', async () => {
                        await restoreFile(file.path, targetFile);
                        closePopup('file-picker-popup');
                        searchInput.value = '';
                    });
                    searchFragment.appendChild(fileCard);
                });
                fileList.appendChild(searchFragment);
            }
        });

        showPopup('file-picker-popup');
        appendToOutput(t('msg_084', {"currentPath": currentPath}), 'success');
    } catch (error) {
        fileList.innerHTML = '';
        const errorBox = document.createElement('div');
        errorBox.className = 'error-message';
        errorBox.style.cssText = 'color: var(--error); text-align: center; padding: 16px;';
        errorBox.textContent = `Failed to load files in ${currentPath}: ${error.message} `;
        const retry = document.createElement('button');
        retry.textContent = 'Try Again';
        retry.style.cssText = 'margin-top: 8px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 8px;';
        retry.addEventListener('click', () => showFilePicker(targetFile, currentPath));
        errorBox.appendChild(retry);
        fileList.appendChild(errorBox);
        appendToOutput(t('msg_071', {"currentPath": currentPath, "error": error}), 'error');
    }
}

function setupBackupListeners() {
    const backupManagerBtn = document.getElementById('backup-manager');
    if (backupManagerBtn) {
        backupManagerBtn.replaceWith(backupManagerBtn.cloneNode(true));
        const newBackupManagerBtn = document.getElementById('backup-manager');
        newBackupManagerBtn.addEventListener('click', showBackupPopup);
    }

    document.querySelectorAll('.backup-btn').forEach(btn => {
        const filename = btn.dataset.file;
        if (!filename) return;
        const newBtn = btn.cloneNode(true);
        newBtn.dataset.file = filename;
        btn.parentNode.replaceChild(newBtn, btn);
    });

    document.querySelectorAll('.backup-btn').forEach(btn => {
        const filename = btn.dataset.file;
        if (!filename) return;
        btn.addEventListener('click', async (e) => {
            e.target.classList.add('loading');
            await backupFile(filename);
            e.target.classList.remove('loading');
        });
    });

    document.querySelectorAll('.restore-btn').forEach(btn => {
        const filename = btn.dataset.file;
        if (!filename) return;
        const newBtn = btn.cloneNode(true);
        newBtn.dataset.file = filename;
        btn.parentNode.replaceChild(newBtn, btn);
    });

    document.querySelectorAll('.restore-btn').forEach(btn => {
        const filename = btn.dataset.file;
        if (!filename) return;
        btn.addEventListener('click', async (e) => {
            appendToOutput(t('msg_095', {"filename": filename}), 'info');
            const startPath = await getPreferredStartPath();
            await showFilePicker(filename, startPath);
        });
    });

    const backupAllBtn = document.getElementById('backup-all-btn');
    if (backupAllBtn) {
        backupAllBtn.replaceWith(backupAllBtn.cloneNode(true));
        const newBackupAllBtn = document.getElementById('backup-all-btn');
        newBackupAllBtn.addEventListener('click', async () => {
            newBackupAllBtn.classList.add('loading');
            const files = ['COPG-VD.json'];
            let successCount = 0;

            for (const file of files) {
                if (await backupFile(file)) {
                    successCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            newBackupAllBtn.classList.remove('loading');
            appendToOutput(t('msg_048', {"successCount": successCount, "files.length": files.length}), 
                          successCount === files.length ? 'success' : 'warning');
        });
    }

    const backupCancelBtn = document.querySelector('#backup-popup .cancel-btn');
    if (backupCancelBtn) {
        backupCancelBtn.replaceWith(backupCancelBtn.cloneNode(true));
        const newBackupCancelBtn = document.querySelector('#backup-popup .cancel-btn');
        newBackupCancelBtn.addEventListener('click', () => {
            closePopup('backup-popup');
        });
    }

    const filePickerCancelBtn = document.querySelector('#file-picker-popup .cancel-btn');
    if (filePickerCancelBtn) {
        filePickerCancelBtn.replaceWith(filePickerCancelBtn.cloneNode(true));
        const newCancelBtn = document.querySelector('#file-picker-popup .cancel-btn');
        newCancelBtn.addEventListener('click', () => {
            document.getElementById('file-picker-search').value = '';
            closePopup('file-picker-popup');
        });
    }

    const filePickerBackBtn = document.getElementById('file-picker-back');
    if (filePickerBackBtn) {
        filePickerBackBtn.replaceWith(filePickerBackBtn.cloneNode(true));
        const newBackBtn = document.getElementById('file-picker-back');
        newBackBtn.addEventListener('click', () => {
            const currentPath = document.getElementById('file-picker-path').textContent;
            const searchInput = document.getElementById('file-picker-search');
            const targetFile = document.querySelector('.restore-btn[data-file]:not([disabled])')?.dataset.file || 'COPG-VD.json';
            
            if (searchInput.value.trim()) {
                searchInput.value = '';
                showFilePicker(targetFile, currentPath);
            } else if (currentPath !== '/storage/emulated/0') {
                const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/storage/emulated/0';
                showFilePicker(targetFile, parentPath);
            }
        });
    }
}
