let actionRunning = false;
let configKeyOrder = [];
let currentConfig = {};
let editingDevice = null;
let lastRender = { devices: 0 };
const RENDER_DEBOUNCE_MS = 150;
let logcatRunning = false;
let currentDeviceSort = 'default';
let deviceSortDropdown = null;

const CONFIG_FILE = "/data/adb/COPG.json";
const MODULE_ID = 'COPG';
const SANITIZED_MODULE_ID = MODULE_ID.replace(/[^a-zA-Z0-9_.]/g, '_');
const JS_INTERFACE = `$${SANITIZED_MODULE_ID}`;
const DEBUG_LOGS = false;
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

const templates = {
    deviceCard: (data) => {
        const template = document.getElementById('device-card-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.device-card');
        
        card.dataset.key = data.key;
        card.style.animationDelay = `${data.delay}s`;
        card.querySelector('.device-name').textContent = data.deviceName;
        card.querySelector('.edit-btn').dataset.device = data.key;
        card.querySelector('.device-details').innerHTML = `Model: ${data.model}`;
        
        return card;
    },
    
    pickerDeviceCard: (data) => {
        const template = document.getElementById('picker-device-card-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.picker-device-card');
        
        card.dataset.key = data.key;
        card.querySelector('h4').textContent = data.deviceName;
        card.querySelector('p').textContent = `${data.brand} ${data.model}`;
        
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

async function execCommand(command) {
    return new Promise((resolve, reject) => {
        const callbackName = `exec_callback_${Date.now()}`;
        window[callbackName] = (errno, stdout, stderr) => {
            delete window[callbackName];
            if (errno === 0) {
                resolve(stdout || "");
            } else {
                reject(stderr || `Command failed with error code ${errno}`);
            }
        };
        
        if (typeof ksu !== 'undefined' && ksu.exec) {
            ksu.exec(command, "{}", callbackName);
        } else {
            reject("KSU API not available");
        }
    });
}

function createDeviceSortDropdown() {
    const template = document.getElementById('sort-dropdown-template');
    const clone = template.content.cloneNode(true);
    deviceSortDropdown = clone.querySelector('.sort-dropdown');
    
    deviceSortDropdown.id = 'device-sort-dropdown';
    
    const sortOptionsToRemove = deviceSortDropdown.querySelectorAll(
        '.sort-option[data-filter], .sort-separator, #clear-filter-btn'
    );
    
    sortOptionsToRemove.forEach(option => option.remove());
    
    deviceSortDropdown.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const sortType = option.dataset.sort;
            setDeviceSort(sortType);
            deviceSortDropdown.classList.remove('show');
            e.stopPropagation();
        });
    });
    
    document.addEventListener('click', (e) => {
        if (deviceSortDropdown && deviceSortDropdown.classList.contains('show') && 
            !e.target.closest('#device-sort-btn') && !e.target.closest('#device-sort-dropdown')) {
            deviceSortDropdown.classList.remove('show');
        }
    });
    
    document.body.appendChild(deviceSortDropdown);
}

function getOriginalDeviceOrder() {
    const devices = [];

    for (const key of configKeyOrder) {
        if (key === 'COPG' && currentConfig[key]) {
            const deviceName = currentConfig[key].DEVICE || 'COPG';
            const model = currentConfig[key].MODEL || 'Unknown';
            
            devices.push({
                key: key,
                deviceName: deviceName,
                model: model
            });
        }
    }
    
    return devices;
}

function sortDeviceList() {
    const deviceList = document.getElementById('device-list');
    if (!deviceList) return;
    
    const devices = Array.from(deviceList.querySelectorAll('.device-card'));
    
    if (currentDeviceSort === 'default') {
        const originalOrder = getOriginalDeviceOrder();
        const deviceMap = new Map();
        
        devices.forEach(device => {
            const deviceKey = device.dataset.key;
            deviceMap.set(deviceKey, device);
        });
        
        deviceList.innerHTML = '';
        originalOrder.forEach(deviceInfo => {
            const device = deviceMap.get(deviceInfo.key);
            if (device) {
                deviceList.appendChild(device);
            }
        });
        
        devices.forEach(device => {
            const deviceKey = device.dataset.key;
            if (!deviceMap.has(deviceKey)) {
                deviceList.appendChild(device);
            }
        });
    } else {
        devices.sort((a, b) => {
            const nameA = a.querySelector('.device-name').textContent.toLowerCase();
            const nameB = b.querySelector('.device-name').textContent.toLowerCase();
            
            if (currentDeviceSort === 'asc') {
                return nameA.localeCompare(nameB);
            } else if (currentDeviceSort === 'desc') {
                return nameB.localeCompare(nameA);
            }
            return 0;
        });
        
        devices.forEach(device => {
            deviceList.appendChild(device);
        });
    }
    
    attachDeviceListeners();
}

function initializeDeviceSort() {
    createDeviceSortDropdown();
    
    const sortBtn = document.getElementById('device-sort-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const rect = sortBtn.getBoundingClientRect();
            deviceSortDropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
            deviceSortDropdown.style.right = `${window.innerWidth - rect.right}px`;
            
            deviceSortDropdown.classList.toggle('show');
        });
    }
    
    setDeviceSort('default');
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

async function loadMarkdownContent() {
    const contents = {
        'license-content': 'https://raw.githubusercontent.com/AlirezaParsi/COPG/JSON/LICENSE',
        'readme-content': 'https://raw.githubusercontent.com/AlirezaParsi/COPG/JSON/README.md',
        'changelog-content': 'https://raw.githubusercontent.com/AlirezaParsi/COPG/JSON/changelog.md'
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
            container.innerHTML = html;
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
            container.innerHTML = `<div style="color:var(--error); padding:16px;">Failed to load: ${err.message}</div>`;
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
    execCommand(`am start -a android.intent.action.VIEW -d "${url}"`).catch(() => {
        window.open(url, '_blank');
    });
}

function setupDonatePopup() {
    const donateToggle = document.getElementById('donate-toggle');
    const closeDonateBtn = document.querySelector('.close-donate-btn');
    
    donateToggle.addEventListener('click', () => {
        showPopup('donate-popup');
    });
    
    closeDonateBtn.addEventListener('click', () => {
        closePopup('donate-popup');
    });
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const address = btn.dataset.address;
            copyToClipboard(address);
            showCopyFeedback(btn);
        });
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
            appendToOutput("Address copied to clipboard", 'success');
        } else {
            appendToOutput("Failed to copy address", 'error');
        }
    } catch (err) {
        appendToOutput("Error copying address: " + err, 'error');
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
    const output = document.getElementById('output');
    const logContent = output.innerText || output.textContent;
    
    if (!logContent.trim()) {
        appendToOutput("No log content to save", 'warning');
        return false;
    }

    try {
        await execCommand(`mkdir -p /storage/emulated/0/Download/COPG/LOGS`);
        let finalFilename = document.getElementById('save-log-popup').dataset.filename || await generateLogFilename();
        const escapedContent = logContent.replace(/'/g, "'\\''");
        await execCommand(`echo '${escapedContent}' > "/storage/emulated/0/Download/COPG/LOGS/${finalFilename}"`);
        appendToOutput(`Log saved to: ${finalFilename}`, 'success');
        return true;
    } catch (error) {
        appendToOutput(`Failed to save log: ${error}`, 'error');
        return false;
    }
}

async function generateLogFilename() {
    try {
        await execCommand(`mkdir -p /storage/emulated/0/Download/COPG/LOGS`);
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        let filename = "COPG-LOG.txt";
        const checkOriginal = await execCommand(`ls "/storage/emulated/0/Download/COPG/LOGS/${filename}" 2>/dev/null || echo "not_found"`);
        
        if (checkOriginal.trim() !== 'not_found') {
            filename = `COPG-LOG-${dateStr}.txt`;
            const checkDated = await execCommand(`ls "/storage/emulated/0/Download/COPG/LOGS/${filename}" 2>/dev/null || echo "not_found"`);
            
            if (checkDated.trim() !== 'not_found') {
                filename = `COPG-LOG-${dateStr}-${hours}${minutes}.txt`;
                const checkTime = await execCommand(`ls "/storage/emulated/0/Download/COPG/LOGS/${filename}" 2>/dev/null || echo "not_found"`);
                
                if (checkTime.trim() !== 'not_found') {
                    filename = `COPG-LOG-${dateStr}-${hours}${minutes}${seconds}.txt`;
                    const checkSeconds = await execCommand(`ls "/storage/emulated/0/Download/COPG/LOGS/${filename}" 2>/dev/null || echo "not_found"`);
                    
                    if (checkSeconds.trim() !== 'not_found') {
                        let counter = 1;
                        let newFilename = `COPG-LOG-${dateStr}-${hours}${minutes}${seconds}(${counter}).txt`;
                        let checkNumbered = await execCommand(`ls "/storage/emulated/0/Download/COPG/LOGS/${newFilename}" 2>/dev/null || echo "not_found"`);
                        
                        while (checkNumbered.trim() !== 'not_found') {
                            counter++;
                            newFilename = `COPG-LOG-${dateStr}-${hours}${minutes}${seconds}(${counter}).txt`;
                            checkNumbered = await execCommand(`ls "/storage/emulated/0/Download/COPG/LOGS/${newFilename}" 2>/dev/null || echo "not_found"`);
                        }
                        filename = newFilename;
                    }
                }
            }
        }
        return filename;
    } catch (error) {
        appendToOutput(`Error generating filename: ${error}`, 'error');
        return "COPG-LOG.txt";
    }
}

async function backupFile(filename) {
    try {
        await execCommand(`mkdir -p /sdcard/Download/COPG`);
        const checkOriginal = await execCommand(`ls "/sdcard/Download/COPG/${filename}" 2>/dev/null || echo "not_found"`);
        
        let finalFilename = filename;
        if (checkOriginal.trim() !== 'not_found') {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const baseName = filename.split('.')[0];
            const extension = filename.split('.')[1];
            
            let newFilename = `${baseName}-${dateStr}.${extension}`;
            const checkDated = await execCommand(`ls "/sdcard/Download/COPG/${newFilename}" 2>/dev/null || echo "not_found"`);
            
            if (checkDated.trim() === 'not_found') {
                finalFilename = newFilename;
            } else {
                const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
                newFilename = `${baseName}-${dateStr}-${timeStr}.${extension}`;
                let checkTime = await execCommand(`ls "/sdcard/Download/COPG/${newFilename}" 2>/dev/null || echo "not_found"`);
                
                if (checkTime.trim() === 'not_found') {
                    finalFilename = newFilename;
                } else {
                    const fullTimeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
                    newFilename = `${baseName}-${dateStr}-${fullTimeStr}.${extension}`;
                    let checkFullTime = await execCommand(`ls "/sdcard/Download/COPG/${newFilename}" 2>/dev/null || echo "not_found"`);
                    
                    if (checkFullTime.trim() === 'not_found') {
                        finalFilename = newFilename;
                    } else {
                        let counter = 1;
                        let checkNumbered = await execCommand(`ls "/sdcard/Download/COPG/${newFilename}" 2>/dev/null || echo "not_found"`);
                        
                        while (checkNumbered.trim() !== 'not_found') {
                            newFilename = `${baseName}-${dateStr}-${fullTimeStr}(${counter}).${extension}`;
                            checkNumbered = await execCommand(`ls "/sdcard/Download/COPG/${newFilename}" 2>/dev/null || echo "not_found"`);
                            counter++;
                        }
                        finalFilename = newFilename;
                    }
                }
            }
        }
        
        await execCommand(`cp /data/adb/modules/COPG/${filename} "/sdcard/Download/COPG/${finalFilename}"`);
        appendToOutput(`Backup created: ${finalFilename}`, 'success');
        return true;
    } catch (error) {
        appendToOutput(`Failed to backup ${filename}: ${error}`, 'error');
        return false;
    }
}

function showBackupPopup() {
    showPopup('backup-popup');
}

function closeBackupPopup() {
    closePopup('backup-popup');
}

async function startLogcat(e) {
    if (e) e.stopPropagation();
    if (logcatRunning) return;

    const loggingToggle = document.getElementById('toggle-logging');
    if (loggingToggle && loggingToggle.checked) {
        document.getElementById('error-message').textContent = "Please disable 'Disable Logging' option first to use logcat.";
        showPopup('error-popup');
        appendToOutput("Cannot start logcat - 'Disable Logging' is enabled", 'error');
        return;
    }

    try {
        appendToOutput("Starting logcat for COPGModule... (open target app ...)", 'info');
        logcatRunning = true;
        document.getElementById('start-logcat').style.display = 'none';
        document.getElementById('stop-logcat').style.display = 'inline-block';
        document.getElementById('log-content').classList.remove('collapsed');
        document.querySelector('#settings-log-section .toggle-icon').classList.add('expanded');
        
        await execCommand("su -c 'logcat -c'");
        readLogcat();
    } catch (error) {
        appendToOutput(`Failed to start logcat: ${error}`, 'error');
        stopLogcat();
    }
}

async function readLogcat() {
    if (!logcatRunning) return;

    try {
        const logs = await execCommand("su -c 'logcat -d -s COPGModule'");
        if (logs && logs.trim()) {
            const lines = logs.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    let logType = 'info';
                    if (line.includes(' E ') || line.includes('ERROR')) logType = 'error';
                    else if (line.includes(' W ') || line.includes('WARN')) logType = 'warning';
                    appendToOutput(line.trim(), logType);
                }
            });
        }
        
        await execCommand("su -c 'logcat -c'");
        if (logcatRunning) {
            setTimeout(readLogcat, 10);
        }
    } catch (error) {
        appendToOutput(`Logcat error: ${error}`, 'error');
        stopLogcat();
    }
}

function stopLogcat(e) {
    if (e) e.stopPropagation();
    if (!logcatRunning) return;

    logcatRunning = false;
    try {
        execCommand("su -c 'logcat -c'").catch(() => {});
        appendToOutput("Logcat stopped", 'info');
    } catch (error) {
        appendToOutput(`Error stopping logcat: ${error}`, 'error');
    } finally {
        document.getElementById('start-logcat').style.display = 'inline-block';
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
        appendToOutput(`Error determining filename: ${error}`, 'error');
        showPopup('save-log-popup');
    }
}

async function checkWebUIConfig() {
    try {
        const configContent = await execCommand("cat /data/adb/modules/COPG/webroot/config.json");
        const webuiConfig = JSON.parse(configContent);
        if (!webuiConfig.title || !webuiConfig.icon) {
            appendToOutput("Warning: Shortcut configuration is incomplete. Creation may fail.", 'warning');
        }
        return webuiConfig;
    } catch (error) {
        appendToOutput("Failed to load shortcut configuration: " + error, 'error');
        return null;
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const themeIcon = document.getElementById('theme-icon');
    themeIcon.textContent = document.body.classList.contains('dark-theme') ? '🌙' : '☀️';
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function appendToOutput(content, type = 'info') {
    const output = document.getElementById('output');
    const logContent = document.getElementById('log-content');
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
    logEntry.innerHTML = `<span class="log-icon ${iconClass}"></span> ${new Date().toLocaleTimeString()} - ${content.replace(/^\[.\]\s*/i, '')}`;
    output.appendChild(logEntry);
    if (!logContent.classList.contains('collapsed')) {
        logEntry.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

async function loadVersion() {
    const versionElement = document.getElementById('version-text');
    try {
        const version = await execCommand("grep '^version=' /data/adb/modules/COPG/module.prop | cut -d'=' -f2");
        versionElement.textContent = `${version.trim()}`;
    } catch (error) {
        appendToOutput("Failed to load version: " + error, 'error');
    }
}

async function loadConfig() {
    try {
        const configContent = await execCommand(`cat ${CONFIG_FILE}`);
        const parsedConfig = JSON.parse(configContent);
        currentConfig = parsedConfig;
        configKeyOrder = Object.keys(parsedConfig);
        appendToOutput("Config loaded successfully", 'success');
    } catch (error) {
        appendToOutput("Failed to load config: " + error, 'error');
        currentConfig = {};
        configKeyOrder = [];
    }
}

function renderDeviceList() {
    const now = Date.now();
    if (now - lastRender.devices < RENDER_DEBOUNCE_MS) return;
    lastRender.devices = now;

    const deviceList = document.getElementById('device-list');
    if (!deviceList) return appendToOutput("Error: 'device-list' not found", 'error');

    const fragment = document.createDocumentFragment();
    let index = 0;
    
    for (const key of configKeyOrder) {
        if (key === 'COPG' && currentConfig[key]) {
            const deviceName = currentConfig[key].DEVICE || 'COPG';
            const model = currentConfig[key].MODEL || 'Unknown';
            
            const deviceCard = templates.deviceCard({
                key: key,
                delay: Math.min(index * 0.05, 0.5),
                deviceName: deviceName,
                model: model
            });
            
            fragment.appendChild(deviceCard);
            index++;
        }
    }
    
    deviceList.innerHTML = '';
    deviceList.appendChild(fragment);
    attachDeviceListeners();
    
    if (currentDeviceSort !== 'default') {
        setTimeout(() => {
            sortDeviceList();
        }, 100);
    }
}

function attachDeviceListeners() {
    document.querySelectorAll('.device-card .edit-btn').forEach(btn => {
        btn.removeEventListener('click', editDeviceHandler);
        btn.addEventListener('click', editDeviceHandler);
    });
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
        'device-host'
    ];
    let hasError = false;
    const missingFields = [];
    
    requiredFieldIds.forEach(id => {
        const field = document.getElementById(id);
        field.classList.remove('error');
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('error-message')) {
            existingError.remove();
        }
    });
    
    requiredFieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (!field.value.trim()) {
            field.classList.add('error');
            const errorMessage = document.createElement('span');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'This field is required';
            field.insertAdjacentElement('afterend', errorMessage);
            hasError = true;
            missingFields.push(field.labels[0]?.textContent || id);
        }
    });
    
    const deviceName = document.getElementById('device-name').value.trim();
    const deviceModel = document.getElementById('device-model').value.trim();
    const deviceKey = `COPG`;
    
    if (!editingDevice) {
        for (const [key, value] of Object.entries(currentConfig)) {
            if (key === 'COPG' && key !== deviceKey) {
                if (value.DEVICE === deviceName) {
                    const field = document.getElementById('device-name');
                    field.classList.add('error');
                    const existingError = field.nextElementSibling;
                    if (existingError && existingError.classList.contains('error-message')) {
                        existingError.remove();
                    }
                    const errorMessage = document.createElement('span');
                    errorMessage.className = 'error-message';
                    errorMessage.textContent = 'Device collections already exists';
                    field.insertAdjacentElement('afterend', errorMessage);
                    appendToOutput(`Device profile "${deviceName}" already exists`, 'error');
                    hasError = true;
                    if (!missingFields.includes('Device Name')) missingFields.push('Device Name (duplicate)');
                }
                if (value.MODEL === deviceModel) {
                    const field = document.getElementById('device-model');
                    field.classList.add('error');
                    const existingError = field.nextElementSibling;
                    if (existingError && existingError.classList.contains('error-message')) {
                        existingError.remove();
                    }
                    const errorMessage = document.createElement('span');
                    errorMessage.className = 'error-message';
                    errorMessage.textContent = 'Device model already exists';
                    field.insertAdjacentElement('afterend', errorMessage);
                    appendToOutput(`Device model "${deviceModel}" already exists`, 'error');
                    hasError = true;
                    if (!missingFields.includes('Model')) missingFields.push('Model (duplicate)');
                }
            }
        }
    }
    
    if (hasError) {
        const poppyMessage = missingFields.length > 0 
            ? `Please fill in the following fields: ${missingFields.join(', ')}`
            : 'Please correct the errors in the form';
        appendToOutput(poppyMessage, 'error');
        document.getElementById('error-message').textContent = poppyMessage;
        showPopup('error-popup');
        return;
    }
    
    const packageKey = 'COPG';
    const brand = document.getElementById('device-brand').value.trim() || 'Unknown';
    const model = document.getElementById('device-model').value.trim() || 'Unknown';
    const product = document.getElementById('device-product').value.trim() || 'Unknown';
    const board = document.getElementById('device-board').value.trim() || 'Unknown';
    const bootloader = document.getElementById('device-bootloader').value.trim() || 'Unknown';
    const hardware = document.getElementById('device-hardware').value.trim() || 'Unknown';
    const id = document.getElementById('device-id').value.trim() || 'Unknown';
    const display = document.getElementById('device-display').value.trim() || 'Unknown';
    const host = document.getElementById('device-host').value.trim() || 'Unknown';
    const androidVersion = document.getElementById('device-android-version').value.trim();
    const sdkInt = document.getElementById('device-sdk-int').value.trim();
    
    const deviceData = {
        BRAND: brand,
        DEVICE: deviceName,
        MANUFACTURER: document.getElementById('device-manufacturer').value.trim() || 'Unknown',
        MODEL: model,
        FINGERPRINT: document.getElementById('device-fingerprint').value.trim() || `${brand}/${model}/${model}:14/UP1A.231005.007/20230101:user/release-keys`,
        PRODUCT: product,
        BOARD: board,
        BOOTLOADER: bootloader,
        HARDWARE: hardware,
        ID: id,
        DISPLAY: display,
        HOST: host
    };
    
    if (androidVersion) {
        deviceData.ANDROID_VERSION = androidVersion;
    }
    
    if (sdkInt) {
        deviceData.SDK_INT = sdkInt;
    }
    
    try {
        if (editingDevice && editingDevice !== deviceKey) {
            const oldPackageKey = 'COPG';
            const oldIndex = configKeyOrder.indexOf(editingDevice);
            const oldPackageIndex = configKeyOrder.indexOf(oldPackageKey);
            
            if (oldIndex !== -1) {
                configKeyOrder[oldIndex] = deviceKey;
            }
            if (oldPackageIndex !== -1) {
                configKeyOrder[oldPackageIndex] = packageKey;
            }
            
            if (currentConfig[oldPackageKey]) {
                currentConfig[packageKey] = currentConfig[oldPackageKey];
                delete currentConfig[oldPackageKey];
            }
            delete currentConfig[editingDevice];
        } else if (!editingDevice) {
            configKeyOrder.push(packageKey, deviceKey);
        }
        
        if (!Array.isArray(currentConfig[packageKey])) {
            currentConfig[packageKey] = [];
        }
        currentConfig[deviceKey] = deviceData;
        
        await saveConfig();
        closeModal('device-modal');
        renderDeviceList();
        appendToOutput(
            `Device profile "${deviceName}" saved`, 
            'success'
        );
    } catch (error) {
        appendToOutput(`Failed to save device: ${error}`, 'error');
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
        
        await execCommand(`echo '${configStr.replace(/'/g, "'\\''")}' > ${CONFIG_FILE}`);
        await execCommand(`su -c 'chmod 644 ${CONFIG_FILE}'`);
        
        try {
            await execCommand(`su -c 'chcon u:object_r:system_file:s0 ${CONFIG_FILE}'`);
        } catch (selinuxError) {
            console.warn('Could not set SELinux context:', selinuxError);
        }
        
        appendToOutput("Config saved", 'info');
    } catch (error) {
        appendToOutput(`Failed to save config: ${error}`, 'error');
        throw error;
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

function toggleLogSection(e) {
    e.stopPropagation();
    const logContent = document.getElementById('log-content');
    const toggleIcon = document.querySelector('#settings-log-section .toggle-icon');
    logContent.classList.toggle('collapsed');
    toggleIcon.classList.toggle('expanded');
    if (!logContent.classList.contains('collapsed')) {
        const output = document.getElementById('output');
        const lastEntry = output.lastElementChild;
        if (lastEntry) lastEntry.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

function switchTab(tabId, direction = null) {
    const tabs = ['settings', 'devices'];
    const currentTab = tabs.find(tab => document.getElementById(`${tab}-tab`)?.classList.contains('active'));
    if (currentTab === tabId) return;

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
    });

    document.querySelectorAll('.tab-nav .tab-btn.active:not(#info-popup .tab-btn)').forEach(btn => btn.classList.remove('active'))
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
}

function copyLogContent() {
    const output = document.getElementById('output');
    const logContent = output.innerText || output.textContent;
    
    const textarea = document.createElement('textarea');
    textarea.value = logContent;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            appendToOutput("Logs copied to clipboard", 'success');
        } else {
            appendToOutput("Failed to copy logs", 'error');
        }
    } catch (err) {
        appendToOutput("Error copying logs: " + err, 'error');
    }
    
    document.body.removeChild(textarea);
}

function applyEventListeners() {
    document.getElementById('toggle-logging').addEventListener('click', async (e) => {
        const isChecked = e.target.checked;
        try {
            await execCommand(`sed -i '/DISABLE_LOGGING=/d' /data/adb/copg_state; echo "DISABLE_LOGGING=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
            appendToOutput(isChecked ? "Logging Disabled" : "Logging Enabled", isChecked ? 'success' : 'error');
        } catch (error) {
            appendToOutput(`Failed to update logging: ${error}`, 'error');
            e.target.checked = !isChecked;
        }
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
        appendToOutput("Log not saved", 'info');
    });

    const shortcutButton = document.getElementById('shortcut-container');
    if (shortcutButton) {
        const moduleInterface = window[JS_INTERFACE] || window.$copg;
        const isInterfaceAvailable = moduleInterface && Object.keys(moduleInterface).length > 0 && typeof moduleInterface.createShortcut === 'function';
        
        if (DEBUG_LOGS) {
            appendToOutput(`Module interface check: ${JS_INTERFACE} = ${typeof moduleInterface}, createShortcut = ${typeof moduleInterface?.createShortcut}`, 'info');
        }
        
        if (isInterfaceAvailable) {
            shortcutButton.style.display = 'flex';
            appendToOutput("Shortcut feature is ready", 'success');
            shortcutButton.addEventListener('click', async () => {
                if (actionRunning) return;
                actionRunning = true;
                shortcutButton.classList.add('loading');
                appendToOutput("Creating shortcut, please wait...", 'info');
                try {
                    if (window[JS_INTERFACE] && typeof window[JS_INTERFACE].createShortcut === 'function') {
                        await window[JS_INTERFACE].createShortcut();
                        appendToOutput("Home screen shortcut created successfully", 'success');
                    } else {
                        throw new Error(`${JS_INTERFACE}.createShortcut is not available`);
                    }
                } catch (error) {
                    appendToOutput("Unable to create shortcut. Please try again or add it manually via your home screen.", 'error');
                    if (DEBUG_LOGS) {
                        appendToOutput(`Error: ${error.message || error}`, 'error');
                    }
                } finally {
                    shortcutButton.classList.remove('loading');
                    actionRunning = false;
                }
            });
        } else {
            appendToOutput("Shortcut feature not available", 'warning');
            shortcutButton.style.display = 'none';
        }
    }
    
    document.getElementById('start-logcat').addEventListener('click', startLogcat);
    document.getElementById('stop-logcat').addEventListener('click', stopLogcat);
    document.getElementById('log-header').addEventListener('click', toggleLogSection);
    document.getElementById('clear-log').addEventListener('click', (e) => {
        e.stopPropagation();
        const output = document.getElementById('output');
        output.innerHTML = '';
        appendToOutput("Log cleared", 'success');
    });
    document.getElementById('copy-log').addEventListener('click', (e) => {
        e.stopPropagation();
        copyLogContent();
    });
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    document.getElementById('tab-settings').addEventListener('click', () => switchTab('settings'));
    document.getElementById('tab-devices').addEventListener('click', () => switchTab('devices'));

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

    document.getElementById('device-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.device-card').forEach(card => {
            const key = card.dataset.key;
            const deviceData = currentConfig[key] || {};
            const searchableText = [
                deviceData.DEVICE || '',
                deviceData.BRAND || '',
                deviceData.MODEL || '',
                deviceData.PRODUCT || '',
                deviceData.MANUFACTURER || '',
                deviceData.FINGERPRINT || '',
                deviceData.BOARD || '',
                deviceData.BOOTLOADER || '',
                deviceData.HARDWARE || '',
                deviceData.ID || '',
                deviceData.DISPLAY || '',
                deviceData.HOST || ''
            ].join(' ').toLowerCase();
            card.style.display = searchableText.includes(searchTerm) ? 'block' : 'none';
        });
        sortDeviceList();
    });
    
    document.getElementById('device-picker-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.picker-device-card').forEach(card => {
            const key = card.dataset.key;
            const deviceData = currentConfig[key] || {};
            const searchableText = [
                deviceData.DEVICE || '',
                deviceData.BRAND || '',
                deviceData.MANUFACTURER || '',
                deviceData.FINGERPRINT || '',
                deviceData.BOARD || '',
                deviceData.BOOTLOADER || '',
                deviceData.HARDWARE || '',
                deviceData.ID || '',
                deviceData.DISPLAY || '',
                deviceData.HOST || ''
            ].join(' ').toLowerCase();
            card.style.display = searchableText.includes(searchTerm) ? 'block' : 'none';
        });
    });
}

window.addEventListener('resize', () => {
    const infoPopup = document.getElementById('info-popup');
    if (infoPopup.style.display === 'flex') {
        setInfoTabHeights();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setupDonatePopup();
    setupInfoPopup();
});

document.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.getElementById('theme-icon').textContent = '☀️';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-icon').textContent = '🌙';
    }
    
    const moduleInterface = window[JS_INTERFACE] || window.$copg;
    if (DEBUG_LOGS) {
        appendToOutput(`Initial module interface check: ${JS_INTERFACE} = ${typeof moduleInterface}, createShortcut = ${typeof moduleInterface?.createShortcut}`, 'info');
    }
    
    await checkWebUIConfig();
    appendToOutput("UI initialized", 'success');
    await loadVersion();
    await loadConfig();
    applyEventListeners();
    initializeDeviceSort(); 
    switchTab('settings');
});

document.querySelector('#package-picker-popup .cancel-btn')?.addEventListener('click', () => {
    document.getElementById('package-picker-search').value = '';
    closePopup('package-picker-popup');
});

async function getPreferredStartPath() {
    const paths = ['/storage/emulated/0/Download', '/storage/emulated/0'];
    for (const path of paths) {
        try {
            const lsOutput = await execCommand(`su -c 'ls -l "${path}"' || echo "ERROR: dir_not_found"`);
            if (!lsOutput.includes('ERROR: dir_not_found') && !lsOutput.includes('No such file or directory')) {
                appendToOutput(`Selected start path: ${path}`, 'info');
                return path;
            }
        } catch (error) {
            appendToOutput(`Failed to access ${path}: ${error.message}`, 'warning');
        }
    }
    appendToOutput('No accessible storage path found, defaulting to /storage/emulated/0', 'warning');
    return '/storage/emulated/0';
}

async function recursiveFileSearch(basePath, searchTerm = '') {
    const results = [];
    try {
        const findOutput = await execCommand(`su -c 'find "${basePath}" -type f \\( -name "*.json" -o -name "*.txt" \\)' || echo ""`);
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
        appendToOutput(`Failed to search files in ${basePath}: ${error}`, 'error');
        return [];
    }
}

async function restoreFile(sourcePath, targetFile) {
    try {
        if (!sourcePath || !targetFile) {
            throw new Error(`Invalid source or target path: source=${sourcePath}, target=${targetFile}`);
        }

        await execCommand(`su -c 'mkdir -p /data/adb/modules/COPG'`);
        const cpOutput = await execCommand(`su -c 'cp "${sourcePath}" "/data/adb/modules/COPG/${targetFile}"' || echo "ERROR: cp_failed"`);
        if (cpOutput.includes('ERROR: cp_failed')) {
            throw new Error(`Copy command failed: ${cpOutput}`);
        }

        await execCommand(`su -c 'chmod 644 /data/adb/modules/COPG/${targetFile}'`);
        
        try {
            await execCommand(`su -c 'chcon u:object_r:system_file:s0 /data/adb/modules/COPG/${targetFile}'`);
        } catch (selinuxError) {
            console.warn('Could not set SELinux context:', selinuxError);
        }

        appendToOutput(`Successfully restored ${sourcePath.split('/').pop()} as ${targetFile}`, 'success');

        if (targetFile === 'COPG.json') {
            await loadConfig();
            renderDeviceList();
        }
        return true;
    } catch (error) {
        appendToOutput(`Failed to restore ${sourcePath ? sourcePath.split('/').pop() : 'unknown file'}: ${error.message}`, 'error');
        return false;
    }
}

async function showFilePicker(targetFile, startPath = null) {
    if (!targetFile) {
        targetFile = 'COPG.json';
        appendToOutput('Warning: targetFile undefined, defaulting to COPG.json', 'warning');
    }

    appendToOutput(`Loading file picker for ${targetFile}...`, 'info');
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
        const lsOutput = await execCommand(`su -c 'ls -l "${currentPath}"' || echo "ERROR: dir_not_found"`);
        if (lsOutput.includes('ERROR: dir_not_found') || lsOutput.includes('No such file or directory')) {
            if (currentPath !== '/storage/emulated/0') {
                appendToOutput(`Directory ${currentPath} not found, falling back to /storage/emulated/0`, 'warning');
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
                    No files or folders found in ${currentPath}
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
                            No files or folders found in ${currentPath}
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
                            <div class="app-name">${file.name}</div>
                            <div class="app-package">${file.path}</div>
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
        appendToOutput(`File list loaded for ${currentPath}`, 'success');
    } catch (error) {
        fileList.innerHTML = `
            <div class="error-message" style="color: var(--error); text-align: center; padding: 16px;">
                Failed to load files in ${currentPath}: ${error.message}
                <button onclick="showFilePicker('${targetFile}', '${currentPath}')" style="margin-top: 8px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 8px;">
                    Try Again
                </button>
            </div>
        `;
        appendToOutput(`Failed to load file list in ${currentPath}: ${error}`, 'error');
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
            appendToOutput(`Opening file picker for ${filename}`, 'info');
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
            const files = ['COPG.json'];
            let successCount = 0;

            for (const file of files) {
                if (await backupFile(file)) {
                    successCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            newBackupAllBtn.classList.remove('loading');
            appendToOutput(`Backup completed: ${successCount}/${files.length} files`, 
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
            const targetFile = document.querySelector('.restore-btn[data-file]:not([disabled])')?.dataset.file || 'COPG.json';
            
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
