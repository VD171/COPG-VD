let actionRunning = false;
let configKeyOrder = [];
let currentConfig = {};
let editingDevice = null;
let editingGame = null;
let lastRender = { devices: 0, games: 0 };
const RENDER_DEBOUNCE_MS = 150;
let snackbarTimeout = null;
let appIndex = []; // Global index for app data
let packagePickerObserver = null;

async function readIgnoreList() {
    try {
        const ignoreListContent = await execCommand("cat /data/adb/modules/COPG/ignorelist.txt || echo ''");
        return ignoreListContent.trim().split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        appendToOutput("Failed to read ignore list: " + error, 'error');
        return [];
    }
}

async function writeIgnoreList(ignoreList) {
    try {
        const content = ignoreList.join('\n');
        await execCommand(`echo '${content.replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/ignorelist.txt`);
        return true;
    } catch (error) {
        appendToOutput("Failed to write ignore list: " + error, 'error');
        return false;
    }
}

async function togglePackageInIgnoreList(packageName) {
    const ignoreList = await readIgnoreList();
    const index = ignoreList.indexOf(packageName);
    
    if (index === -1) {
        // Add to ignore list
        ignoreList.push(packageName);
        await writeIgnoreList(ignoreList);
        return true; // Added
    } else {
        // Remove from ignore list
        ignoreList.splice(index, 1);
        await writeIgnoreList(ignoreList);
        return false; // Removed
    }
}

// Module ID for COPG
const MODULE_ID = 'COPG';
const SANITIZED_MODULE_ID = MODULE_ID.replace(/[^a-zA-Z0-9_.]/g, '_');
const JS_INTERFACE = `$${SANITIZED_MODULE_ID}`; // e.g., $COPG
const DEBUG_LOGS = false; // Set to true for detailed debug logs

async function execCommand(command) {
    const callbackName = `exec_callback_${Date.now()}`;
    return new Promise((resolve, reject) => {
        window[callbackName] = (errno, stdout, stderr) => {
            delete window[callbackName];
            errno === 0 ? resolve(stdout) : reject(stderr);
        };
        ksu.exec(command, "{}", callbackName);
    });
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
        versionElement.textContent = `v${version.trim()}`;
    } catch (error) {
        appendToOutput("Failed to load version: " + error, 'error');
    }
}

async function loadToggleStates() {
    try {
        const autoBrightnessToggle = document.getElementById('toggle-auto-brightness');
        const dndToggle = document.getElementById('toggle-dnd');
        const loggingToggle = document.getElementById('toggle-logging');
        const keepScreenOnToggle = document.getElementById('toggle-keep-screen-on');
        const state = await execCommand("cat /data/adb/copg_state || echo ''");
        autoBrightnessToggle.checked = state.includes("AUTO_BRIGHTNESS_OFF=1") || !state.includes("AUTO_BRIGHTNESS_OFF=");
        dndToggle.checked = state.includes("DND_ON=1") || !state.includes("DND_ON=");
        loggingToggle.checked = state.includes("DISABLE_LOGGING=1") || !state.includes("DISABLE_LOGGING=");
        keepScreenOnToggle.checked = state.includes("KEEP_SCREEN_ON=1") || !state.includes("KEEP_SCREEN_ON=");
    } catch (error) {
        appendToOutput("Failed to load toggle states: " + error, 'error');
    }
}

async function loadConfig() {
    try {
        const configContent = await execCommand("cat /data/adb/modules/COPG/config.json");
        const parsedConfig = JSON.parse(configContent);
        currentConfig = parsedConfig;
        
        configKeyOrder = Object.keys(parsedConfig);
        
        
        try {
            await execCommand("touch /data/adb/modules/COPG/ignorelist.txt");
        } catch (error) {
            appendToOutput("Failed to create ignorelist.txt: " + error, 'error');
        }
        
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
    
    // استفاده از configKeyOrder برای حفظ ترتیب
    for (const key of configKeyOrder) {
        if (key.endsWith('_DEVICE') && currentConfig[key]) {
            const deviceName = currentConfig[key].DEVICE || key.replace('PACKAGES_', '').replace('_DEVICE', '');
            const packageKey = key.replace('_DEVICE', '');
            const gameCount = Array.isArray(currentConfig[packageKey]) ? currentConfig[packageKey].length : 0;
            const model = currentConfig[key].MODEL || 'Unknown';
            
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-card';
            deviceCard.dataset.key = key;
            deviceCard.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
            deviceCard.innerHTML = `
                <div class="device-header">
                    <h4 class="device-name">${deviceName}</h4>
                    <div class="device-actions">
                        <button class="edit-btn" data-device="${key}" title="Edit">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="delete-btn" data-device="${key}" title="Delete">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="device-details">
                    Model: ${model}<br>
                    Games associated: ${gameCount}
                </div>
            `;
            fragment.appendChild(deviceCard);
            index++;
        }
    }
    
    deviceList.innerHTML = '';
    deviceList.appendChild(fragment);
    attachDeviceListeners();
}

function attachDeviceListeners() {
    document.querySelectorAll('.device-card .edit-btn').forEach(btn => {
        btn.removeEventListener('click', editDeviceHandler);
        btn.addEventListener('click', editDeviceHandler);
    });
    document.querySelectorAll('.device-card .delete-btn').forEach(btn => {
        btn.removeEventListener('click', deleteDeviceHandler);
        btn.addEventListener('click', deleteDeviceHandler);
    });
}

function editDeviceHandler(e) {
    editDevice(e.currentTarget.dataset.device);
}

function deleteDeviceHandler(e) {
    deleteDevice(e.currentTarget.dataset.device);
}

async function renderGameList() {
    const now = Date.now();
    if (now - lastRender.games < RENDER_DEBOUNCE_MS) return;
    lastRender.games = now;

    const gameList = document.getElementById('game-list');
    if (!gameList) return appendToOutput("Error: 'game-list' not found", 'error');

    const ignoreList = await readIgnoreList();
    
    
    let gameNamesMap = {};
    try {
        const gameNamesContent = await execCommand("cat /data/adb/modules/COPG/list.json");
        gameNamesMap = JSON.parse(gameNamesContent);
    } catch (error) {
        appendToOutput("Failed to load game names mapping: " + error, 'warning');
    }
    
    
    let installedPackages = [];
    try {
        const pmOutput = await execCommand("pm list packages | cut -d: -f2");
        installedPackages = pmOutput.trim().split('\n');
    } catch (error) {
        appendToOutput("Failed to get installed packages: " + error, 'warning');
    }

    const fragment = document.createDocumentFragment();
    let index = 0;
    
    
    for (const key of configKeyOrder) {
        if (Array.isArray(currentConfig[key]) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
            const deviceKey = `${key}_DEVICE`;
            const deviceData = currentConfig[deviceKey] || {};
            const deviceName = deviceData.DEVICE || key.replace('PACKAGES_', '');
            currentConfig[key].forEach(gamePackage => {
                const isIgnored = ignoreList.includes(gamePackage);
                const isInstalled = installedPackages.includes(gamePackage);
                const gameName = gameNamesMap[gamePackage] || gamePackage;
                
                const gameCard = document.createElement('div');
                gameCard.className = `game-card ${isIgnored ? 'ignored' : ''}`;
                gameCard.dataset.package = gamePackage;
                gameCard.dataset.device = key;
                gameCard.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
                gameCard.innerHTML = `
                    <div class="game-header">
                        <div class="game-name-container">
                            <h4 class="game-name">${gameName}</h4>
                            <span class="game-package">${gamePackage}</span>
                        </div>
                        <div class="game-actions">
                            <button class="edit-btn" data-game="${gamePackage}" data-device="${key}" title="Edit">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="delete-btn" data-game="${gamePackage}" data-device="${key}" title="Delete">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="game-details">
                        <span class="game-info">${deviceName}</span>
                        <div class="badge-group">
                            ${isIgnored ? '<span class="ignored-badge" onclick="showIgnoreExplanation(event)">Ignored</span>' : ''}
                            ${isInstalled ? '<span class="installed-badge">Installed</span>' : ''}
                        </div>
                    </div>
                `;
                fragment.appendChild(gameCard);
                index++;
            });
        }
    }
    
    gameList.innerHTML = '';
    gameList.appendChild(fragment);
    attachGameListeners();
    setupLongPressHandlers();
}

function setupLongPressHandlers() {
    let pressTimer;
    const pressDuration = 500;
    const scrollThreshold = 15;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isLongPressActive = false;

    document.querySelectorAll('.game-card').forEach(card => {
        const packageName = card.dataset.package;
        const isIgnored = card.classList.contains('ignored');
        const gameName = card.querySelector('.game-name').textContent;

        const showPopup = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isLongPressActive = true;

            const popup = document.getElementById('ignore-popup');
            const title = document.getElementById('ignore-popup-title');
            const message = document.getElementById('ignore-popup-message');
            const packageEl = document.getElementById('ignore-popup-package');
            const icon = document.getElementById('ignore-popup-icon');
            const confirmBtn = document.getElementById('ignore-popup-confirm');

            title.textContent = isIgnored ? 'Remove from Ignore List' : 'Add to Ignore List';
            message.textContent = isIgnored 
                ? 'This package will be removed from ignore list' 
                : 'This package will be added to ignore list';
            packageEl.innerHTML = `
                <span class="game-name-popup">${gameName}</span>
                <span class="package-name-popup">${packageName}</span>
            `;

            icon.className = 'popup-icon';
            icon.classList.add(isIgnored ? 'icon-remove' : 'icon-add');

            confirmBtn.dataset.package = packageName;
            confirmBtn.dataset.action = isIgnored ? 'remove' : 'add';

            popup.style.display = 'flex';
            requestAnimationFrame(() => {
                popup.querySelector('.popup-content').classList.add('modal-enter');
            });
        };
        // Touch events
        card.addEventListener('touchstart', (e) => {
            if (isLongPressActive) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            pressTimer = setTimeout(() => {
                showPopup(e);
            }, pressDuration);
        }, { passive: false });

        card.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaX = Math.abs(touchX - touchStartX);
            const deltaY = Math.abs(touchY - touchStartY);
            const elapsedTime = Date.now() - touchStartTime;

            // Cancel long-press for fast movements early on (swipe detection)
            if (elapsedTime < 100 && (deltaX > 10 || deltaY > 10)) {
                clearTimeout(pressTimer);
                return;
            }

            // Cancel long-press if movement exceeds threshold
            if (deltaX > scrollThreshold || deltaY > scrollThreshold) {
                clearTimeout(pressTimer);
            }
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
            clearTimeout(pressTimer);
            if (isLongPressActive) {
                e.preventDefault();
            }
        }, { passive: false });

        card.addEventListener('touchcancel', () => {
            clearTimeout(pressTimer);
        });

        // Mouse events
        card.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || isLongPressActive) return; // Left click only
            pressTimer = setTimeout(() => {
                showPopup(e);
            }, pressDuration);
        });

        card.addEventListener('mouseup', (e) => {
            clearTimeout(pressTimer);
            if (isLongPressActive) {
                e.preventDefault();
            }
        });

        card.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
        });

        // Prevent context menu and default click behavior during long-press
        card.addEventListener('contextmenu', (e) => {
            if (isLongPressActive) {
                e.preventDefault();
            }
        });

        card.addEventListener('click', (e) => {
            if (isLongPressActive) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });

    // Popup button handlers
    const popup = document.getElementById('ignore-popup');
    const cancelBtn = document.getElementById('ignore-popup-cancel');
    const confirmBtn = document.getElementById('ignore-popup-confirm');

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePopup('ignore-popup');
        isLongPressActive = false;
    });

    confirmBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const packageName = confirmBtn.dataset.package;
        const action = confirmBtn.dataset.action;
        const wasAdded = await togglePackageInIgnoreList(packageName);
        appendToOutput(
            `${action === 'add' ? 'Added' : 'Removed'} ${packageName} ${action === 'add' ? 'to' : 'from'} ignore list`,
            'success'
        );
        renderGameList();
        closePopup('ignore-popup');
        isLongPressActive = false;
    });

    // Close popup when clicking outside
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            closePopup('ignore-popup');
            isLongPressActive = false;
        }
    });
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

function attachGameListeners() {
    document.querySelectorAll('.game-card .edit-btn').forEach(btn => {
        btn.removeEventListener('click', editGameHandler);
        btn.addEventListener('click', editGameHandler);
    });
    document.querySelectorAll('.game-card .delete-btn').forEach(btn => {
        btn.removeEventListener('click', deleteGameHandler);
        btn.addEventListener('click', deleteGameHandler);
    });
}

function editGameHandler(e) {
    editGame(e.currentTarget.dataset.game, e.currentTarget.dataset.device);
}

function deleteGameHandler(e) {
    const gamePackage = e.currentTarget.dataset.game;
    const gameName = e.currentTarget.closest('.game-card').querySelector('.game-name').textContent;
    const deviceName = e.currentTarget.closest('.game-card').querySelector('.game-info').textContent;
    
    deleteGame(gamePackage, e.currentTarget.dataset.device, gameName, deviceName);
}

function populateDevicePicker() {
    const picker = document.getElementById('device-picker-list');
    picker.innerHTML = '';
    for (const [key, value] of Object.entries(currentConfig)) {
        if (key.endsWith('_DEVICE')) {
            const deviceName = value.DEVICE || key.replace('PACKAGES_', '').replace('_DEVICE', '');
            const deviceCard = document.createElement('div');
            deviceCard.className = 'picker-device-card';
            deviceCard.dataset.key = key;
            deviceCard.innerHTML = `
                <h4>${deviceName}</h4>
                <p>${value.BRAND || 'Unknown'} ${value.MODEL || 'Unknown'}</p>
            `;
            deviceCard.addEventListener('click', () => {
                picker.querySelectorAll('.picker-device-card').forEach(card => {
                    card.classList.remove('selected');
                });
                deviceCard.classList.add('selected');
                const selectedDeviceInput = document.getElementById('game-device');
                selectedDeviceInput.value = deviceName;
                selectedDeviceInput.dataset.key = key;
                selectedDeviceInput.classList.add('highlighted');
                setTimeout(() => {
                    closePopup('device-picker-popup');
                }, 200);
            });
            picker.appendChild(deviceCard);
        }
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
        document.getElementById('device-manufacturer').value = deviceData.MANUFACTURER || '';
        document.getElementById('device-fingerprint').value = deviceData.FINGERPRINT || '';
    } else {
        title.textContent = 'Add New Device Profile';
        editingDevice = null;
        form.reset();
    }
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.querySelector('.modal-content').classList.add('modal-enter');
    });
}

function editGame(gamePackage, deviceKey) {
    openGameModal(gamePackage, deviceKey);
}

function openGameModal(gamePackage = null, deviceKey = null) {
    const modal = document.getElementById('game-modal');
    if (!modal) return appendToOutput("Error: 'game-modal' not found", 'error');
    
    const title = document.getElementById('game-modal-title');
    const form = document.getElementById('game-form');
    const packageInput = document.getElementById('game-package');
    const deviceInput = document.getElementById('game-device');
    
    form.querySelectorAll('input').forEach(field => {
        field.classList.remove('error');
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('error-message')) {
            existingError.remove();
        }
    });
    
    if (gamePackage) {
        title.textContent = 'Edit Game Configuration';
        editingGame = { package: gamePackage, device: deviceKey };
        packageInput.value = gamePackage;
        deviceInput.value = currentConfig[`${deviceKey}_DEVICE`]?.DEVICE || '';
        deviceInput.dataset.key = `${deviceKey}_DEVICE`;
        deviceInput.classList.add('highlighted');
        
        // Load game name if available
        execCommand("cat /data/adb/modules/COPG/list.json")
            .then(content => {
                const listData = JSON.parse(content);
                if (listData[gamePackage]) {
                    const gameNameInput = document.getElementById('game-name');
                    if (gameNameInput) {
                        gameNameInput.value = listData[gamePackage];
                    }
                }
            })
            .catch(error => {
                console.error("Failed to load game names:", error);
            });
    } else {
        title.textContent = 'Add New Game';
        editingGame = null;
        form.reset();
        deviceInput.value = '';
        deviceInput.dataset.key = '';
        deviceInput.classList.remove('highlighted');
    }
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.querySelector('.modal-content').classList.add('modal-enter');
    });
}
async function saveDevice(e) {
    e.preventDefault();
    
    const form = document.getElementById('device-form');
    const requiredFieldIds = [
        'device-name',
        'device-brand',
        'device-model',
        'device-manufacturer',
        'device-fingerprint'
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
    const deviceKey = `PACKAGES_${deviceName.toUpperCase().replace(/ /g, '_')}_DEVICE`;
    
    if (!editingDevice) {
        for (const [key, value] of Object.entries(currentConfig)) {
            if (key.endsWith('_DEVICE') && key !== deviceKey) {
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
    
    const packageKey = deviceKey.replace('_DEVICE', '');
    
    const brand = document.getElementById('device-brand').value.trim() || 'Unknown';
    const model = document.getElementById('device-model').value.trim() || 'Unknown';
    
    const deviceData = {
        BRAND: brand,
        DEVICE: deviceName,
        MANUFACTURER: document.getElementById('device-manufacturer').value.trim() || 'Unknown',
        MODEL: model,
        FINGERPRINT: document.getElementById('device-fingerprint').value.trim() || `${brand}/${model}/${model}:14/UP1A.231005.007/20230101:user/release-keys`,
        PRODUCT: model
    };
    
    try {
        if (editingDevice && editingDevice !== deviceKey) {
            const oldPackageKey = editingDevice.replace('_DEVICE', '');
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
            appendToOutput(`Renamed device from "${editingDevice}" to "${deviceKey}"`, 'info');
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
            editingDevice 
                ? `Device profile "${deviceName}" saved` 
                : `Device profile "${deviceName}" added`, 
            'success'
        );
    } catch (error) {
        appendToOutput(`Failed to save device: ${error}`, 'error');
    }
}

async function saveGame(e) {
    e.preventDefault();
    const form = document.getElementById('game-form');
    const gamePackage = document.getElementById('game-package').value.trim();
    const gameNameInput = document.getElementById('game-name');
    const gameName = gameNameInput.value.trim() || gamePackage;
    const deviceInput = document.getElementById('game-device');
    const deviceKey = deviceInput.dataset.key;
    const packageKey = deviceKey.replace('_DEVICE', '');
    
    form.querySelectorAll('input').forEach(field => {
        field.classList.remove('error');
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('error-message')) {
            existingError.remove();
        }
    });
    
    let hasError = false;
    const missingFields = [];
    
    if (!gamePackage) {
        const field = document.getElementById('game-package');
        field.classList.add('error');
        const errorMessage = document.createElement('span');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'This field is required';
        field.insertAdjacentElement('afterend', errorMessage);
        hasError = true;
        missingFields.push('Package Name');
    }
    
    if (!deviceKey) {
        deviceInput.classList.add('error');
        const errorMessage = document.createElement('span');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Please select a device';
        deviceInput.insertAdjacentElement('afterend', errorMessage);
        hasError = true;
        missingFields.push('Device Profile');
    }
    
    if (!editingGame || editingGame.package !== gamePackage) {
        for (const [key, value] of Object.entries(currentConfig)) {
            if (Array.isArray(value) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
                if (value.includes(gamePackage)) {
                    const associatedDeviceKey = `${key}_DEVICE`;
                    const associatedDeviceName = currentConfig[associatedDeviceKey]?.DEVICE || key.replace('PACKAGES_', '');
                    const field = document.getElementById('game-package');
                    field.classList.add('error');
                    const existingError = field.nextElementSibling;
                    if (existingError && existingError.classList.contains('error-message')) {
                        existingError.remove();
                    }
                    const errorMessage = document.createElement('span');
                    errorMessage.className = 'error-message';
                    errorMessage.textContent = 'Game package already exists';
                    document.getElementById('game-package').parentNode.insertAdjacentElement('afterend', errorMessage);
                    const errorPopupMessage = `Game '${gamePackage}' is already associated with device profile '${associatedDeviceName}'.`;
                    appendToOutput(errorPopupMessage, 'error');
                    document.getElementById('error-message').textContent = errorPopupMessage;
                    showPopup('error-popup');
                    hasError = true;
                    missingFields.push('Package Name (duplicate)');
                    break;
                }
            }
        }
    }
    
    if (hasError) {
        if (missingFields.length > 0 && !missingFields.includes('Package Name (duplicate)')) {
            const errorMessage = `Please fill in the following fields: ${missingFields.join(', ')}`;
            appendToOutput(errorMessage, 'error');
            document.getElementById('error-message').textContent = errorMessage;
            showPopup('error-popup');
        }
        return;
    }
    
    if (!currentConfig[deviceKey]) {
        appendToOutput("Selected device profile does not exist", 'error');
        document.getElementById('error-message').textContent = "Selected device profile does not exist.";
        showPopup('error-popup');
        return;
    }
    
    try {
        let oldIndex = -1;
        if (editingGame) {
            oldIndex = currentConfig[editingGame.device]?.indexOf(editingGame.package);
            if (oldIndex > -1) {
                currentConfig[editingGame.device].splice(oldIndex, 1);
            }
        }
        
        if (!Array.isArray(currentConfig[packageKey])) {
            currentConfig[packageKey] = [];
            
            if (!configKeyOrder.includes(packageKey)) {
                const deviceIndex = configKeyOrder.indexOf(deviceKey);
                if (deviceIndex !== -1) {
                    configKeyOrder.splice(deviceIndex, 0, packageKey);
                } else {
                    configKeyOrder.push(packageKey);
                }
            }
        }
        
        
        if (!currentConfig[packageKey].includes(gamePackage)) {
            if (editingGame && editingGame.device === packageKey && oldIndex !== -1) {
                
                currentConfig[packageKey].splice(oldIndex, 0, gamePackage);
            } else {
                
                currentConfig[packageKey].push(gamePackage);
            }
        }
        
        
        try {
            const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
            const listData = JSON.parse(listContent);
            listData[gamePackage] = gameName;
            await execCommand(`echo '${JSON.stringify(listData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
        } catch (error) {
            appendToOutput("Failed to update game names list: " + error, 'warning');
        }
        
        await saveConfig();
        closeModal('game-modal');
        renderGameList();
        renderDeviceList();
        appendToOutput(`Game "${gameName}" added to "${currentConfig[deviceKey].DEVICE}"`, 'success');
    } catch (error) {
        appendToOutput(`Failed to save game: ${error}`, 'error');
        document.getElementById('error-message').textContent = `Failed to save game: ${error}`;
        showPopup('error-popup');
    }
}

async function renderGameList() {
    const now = Date.now();
    if (now - lastRender.games < RENDER_DEBOUNCE_MS) return;
    lastRender.games = now;

    const gameList = document.getElementById('game-list');
    if (!gameList) return appendToOutput("Error: 'game-list' not found", 'error');

    const ignoreList = await readIgnoreList();
    
    // Load game names mapping
    let gameNamesMap = {};
    try {
        const gameNamesContent = await execCommand("cat /data/adb/modules/COPG/list.json");
        gameNamesMap = JSON.parse(gameNamesContent);
    } catch (error) {
        appendToOutput("Failed to load game names mapping: " + error, 'warning');
    }
    
    // Get list of installed packages
    let installedPackages = [];
    try {
        const pmOutput = await execCommand("pm list packages | cut -d: -f2");
        installedPackages = pmOutput.trim().split('\n');
    } catch (error) {
        appendToOutput("Failed to get installed packages: " + error, 'warning');
    }

    const fragment = document.createDocumentFragment();
    let index = 0;
    
    for (const [key, value] of Object.entries(currentConfig)) {
        if (Array.isArray(value) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
            const deviceKey = `${key}_DEVICE`;
            const deviceData = currentConfig[deviceKey] || {};
            const deviceName = deviceData.DEVICE || key.replace('PACKAGES_', '');
            value.forEach(gamePackage => {
                const isIgnored = ignoreList.includes(gamePackage);
                const isInstalled = installedPackages.includes(gamePackage);
                const gameName = gameNamesMap[gamePackage] || gamePackage;
                
                const gameCard = document.createElement('div');
                gameCard.className = `game-card ${isIgnored ? 'ignored' : ''}`;
                gameCard.dataset.package = gamePackage;
                gameCard.dataset.device = key;
                gameCard.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
                gameCard.innerHTML = `
    <div class="game-header">
        <div class="game-name-container">
            <h4 class="game-name">${gameName}</h4>
            <span class="game-package">${gamePackage}</span>
        </div>
        <div class="game-actions">
            <button class="edit-btn" data-game="${gamePackage}" data-device="${key}" title="Edit">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="delete-btn" data-game="${gamePackage}" data-device="${key}" title="Delete">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    </div>
    <div class="game-details">
        <span class="game-info">${deviceName}</span>
        <div class="badge-group">
            ${isIgnored ? '<span class="ignored-badge" onclick="showIgnoreExplanation(event)">Ignored</span>' : ''}
            ${isInstalled ? '<span class="installed-badge">Installed</span>' : ''}
        </div>
    </div>
`;
                fragment.appendChild(gameCard);
                index++;
            });
        }
    }
    
    gameList.innerHTML = '';
    gameList.appendChild(fragment);
    attachGameListeners();
    setupLongPressHandlers();
}

function showSnackbar(message, onUndo) {
    const snackbar = document.getElementById('snackbar');
    const messageElement = document.getElementById('snackbar-message');
    const undoButton = document.getElementById('snackbar-undo');

    if (snackbarTimeout) {
        clearTimeout(snackbarTimeout);
    }

    messageElement.textContent = message;
    snackbar.classList.add('show');

    const newUndoButton = undoButton.cloneNode(true);
    undoButton.parentNode.replaceChild(newUndoButton, undoButton);

    newUndoButton.addEventListener('click', () => {
        if (onUndo) onUndo();
        snackbar.classList.remove('show');
        clearTimeout(snackbarTimeout);
        snackbarTimeout = null;
    });

    snackbarTimeout = setTimeout(() => {
        snackbar.classList.remove('show');
        snackbarTimeout = null;
    }, 5000);
}

function insertAtIndex(obj, key, value, index) {
    const entries = Object.entries(obj);
    const newEntries = [
        ...entries.slice(0, index),
        [key, value],
        ...entries.slice(index)
    ];
    return Object.fromEntries(newEntries);
}

async function deleteDevice(deviceKey) {
    const deviceName = currentConfig[deviceKey]?.DEVICE || deviceKey.replace('PACKAGES_', '').replace('_DEVICE', '');
    const packageKey = deviceKey.replace('_DEVICE', '');
    const card = document.querySelector(`.device-card[data-key="${deviceKey}"]`);
    
    if (!card) return;

    const deviceEntries = Object.entries(currentConfig).filter(([key]) => key.endsWith('_DEVICE'));
    const deviceIndex = deviceEntries.findIndex(([key]) => key === deviceKey);
    if (deviceIndex === -1) {
        appendToOutput(`Device "${deviceName}" not found in config`, 'error');
        return;
    }
    
    card.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 400));

    const deletedDeviceData = { ...currentConfig[deviceKey] };
    const deletedPackageData = currentConfig[packageKey] ? [...currentConfig[packageKey]] : [];
    const deletedDeviceIndex = deviceIndex;

    delete currentConfig[packageKey];
    delete currentConfig[deviceKey];
    try {
        await saveConfig();
        appendToOutput(`Deleted device "${deviceName}"`, 'red');
    } catch (error) {
        appendToOutput(`Failed to delete device: ${error}`, 'error');
        currentConfig = insertAtIndex(currentConfig, deviceKey, deletedDeviceData, deletedDeviceIndex * 2);
        if (deletedPackageData.length > 0) {
            currentConfig = insertAtIndex(currentConfig, packageKey, deletedPackageData, deletedDeviceIndex * 2);
        }
        card.classList.remove('fade-out');
        renderDeviceList();
        renderGameList();
        return;
    }

    renderDeviceList();
    renderGameList();

    showSnackbar(`Deleted device "${deviceName}"`, async () => {
        currentConfig = insertAtIndex(currentConfig, deviceKey, deletedDeviceData, deletedDeviceIndex * 2);
        if (deletedPackageData.length > 0) {
            currentConfig = insertAtIndex(currentConfig, packageKey, deletedPackageData, deletedDeviceIndex * 2);
        }
        try {
            await saveConfig();
            appendToOutput(`Restored device "${deviceName}"`, 'success');
            renderDeviceList();
            renderGameList();
            const restoredCard = document.querySelector(`.device-card[data-key="${deviceKey}"]`);
            if (restoredCard) {
                restoredCard.style.opacity = '0';
                restoredCard.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    restoredCard.style.opacity = '1';
                    restoredCard.style.transform = 'translateY(0)';
                    restoredCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                }, 10);
            }
        } catch (error) {
            appendToOutput(`Failed to restore device: ${error}`, 'error');
            delete currentConfig[packageKey];
            delete currentConfig[deviceKey];
            await saveConfig();
            renderDeviceList();
            renderGameList();
        }
    });
}

async function deleteGame(gamePackage, deviceKey, gameName, deviceName) {
    const card = document.querySelector(`.game-card[data-package="${gamePackage}"][data-device="${deviceKey}"]`);
    
    if (!card) return;

    card.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 400));

    const deletedGame = gamePackage;
    const originalIndex = currentConfig[deviceKey].indexOf(gamePackage);
    if (originalIndex === -1) {
        appendToOutput(`Game "${gameName || gamePackage}" not found in "${deviceName}"`, 'error');
        card.classList.remove('fade-out');
        return;
    }

    // Store the complete list.json content before deletion
    let originalListContent = "";
    try {
        originalListContent = await execCommand("cat /data/adb/modules/COPG/list.json");
    } catch (error) {
        appendToOutput("Failed to load game names list: " + error, 'warning');
    }

    currentConfig[deviceKey].splice(originalIndex, 1);
    
    try {
        // Remove from config.json
        await saveConfig();
        
        // Remove from list.json if exists
        try {
            const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
            const listData = JSON.parse(listContent);
            if (listData[gamePackage]) {
                delete listData[gamePackage];
                await execCommand(`echo '${JSON.stringify(listData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
            }
        } catch (error) {
            appendToOutput("Failed to update game names list: " + error, 'warning');
        }
        
        appendToOutput(`Removed "${gamePackage}" from "${deviceName}"`, 'red');
    } catch (error) {
        appendToOutput(`Failed to delete game: ${error}`, 'error');
        currentConfig[deviceKey].splice(originalIndex, 0, deletedGame);
        card.classList.remove('fade-out');
        renderGameList();
        renderDeviceList();
        return;
    }

    renderGameList();
    renderDeviceList();

    showSnackbar(`Removed "${gameName || gamePackage}" from "${deviceName}"`, async () => {
        if (!Array.isArray(currentConfig[deviceKey])) {
            currentConfig[deviceKey] = [];
        }
        
        // Insert back at the original position in config
        currentConfig[deviceKey].splice(originalIndex, 0, deletedGame);
        
        try {
            // Restore config.json
            await saveConfig();
            
            // Restore the original list.json content completely
            if (originalListContent) {
                try {
                    await execCommand(`echo '${originalListContent.replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
                } catch (error) {
                    appendToOutput("Failed to restore game names list: " + error, 'warning');
                }
            }
            
            appendToOutput(`Restored game "${gamePackage}" to "${deviceName}"`, 'success');
            
            // Force re-render of both lists
            renderDeviceList();
            renderGameList();
            
            // Find and highlight the restored card
            setTimeout(() => {
                const restoredCard = document.querySelector(`.game-card[data-package="${gamePackage}"][data-device="${deviceKey}"]`);
                if (restoredCard) {
                    restoredCard.style.opacity = '0';
                    restoredCard.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        restoredCard.style.opacity = '1';
                        restoredCard.style.transform = 'translateY(0)';
                        restoredCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    }, 10);
                }
            }, 100);
        } catch (error) {
            appendToOutput(`Failed to restore game: ${error}`, 'error');
            currentConfig[deviceKey].splice(originalIndex, 1);
            await saveConfig();
            renderDeviceList();
            renderGameList();
        }
    });
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
        await execCommand(`echo '${configStr.replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/config.json`);
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
        editingGame = null;
    }, { once: true });
}

function showPopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'flex';
        popup.querySelector('.popup-content').classList.remove('popup-exit');
        if (popupId === 'device-picker-popup') {
            populateDevicePicker();
            const searchInput = document.getElementById('device-picker-search');
            if (searchInput) {
                searchInput.value = '';
                document.querySelectorAll('.picker-device-card').forEach(card => {
                    card.style.display = 'block';
                });
            }
        }
    }
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
    const tabs = ['settings', 'devices', 'games'];
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
        currentTabElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        currentTabElement.style.transform = inferredDirection === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
        currentTabElement.style.opacity = '0';
    }

    newTabElement.style.display = 'block';
    newTabElement.style.transition = 'none';
    newTabElement.style.transform = inferredDirection === 'left' ? 'translateX(100%)' : 'translateX(-100%)';
    newTabElement.style.opacity = '0';

    void newTabElement.offsetHeight;

    requestAnimationFrame(() => {
        newTabElement.classList.add('active');
        newTabElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        newTabElement.style.transform = 'translateX(0)';
        newTabElement.style.opacity = '1';

        if (currentTabElement) {
            currentTabElement.addEventListener('transitionend', () => {
                currentTabElement.style.display = 'none';
                currentTabElement.style.transform = 'translateX(0)';
                currentTabElement.style.opacity = '0';
            }, { once: true });
        }

        newTabElement.addEventListener('transitionend', () => {
            setTimeout(() => {
                if (tabId === 'devices') {
                    renderDeviceList();
                } else if (tabId === 'games') {
                    renderGameList();
                }
            }, 100);
        }, { once: true });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
}

function setupSwipeNavigation() {
    const container = document.getElementById('tab-container');
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoveX = 0;
    let touchMoveY = 0;
    const tabs = ['settings', 'devices', 'games'];
    const swipeThreshold = 30;
    const verticalThreshold = 50;
    let isSwiping = false;
    let lastSwipeTime = 0;
    const debounceTime = 150;

    function resetTabStates() {
        tabs.forEach(tab => {
            const tabElement = document.getElementById(`${tab}-tab`);
            if (tabElement) {
                tabElement.style.transition = 'none';
                tabElement.style.transform = 'translateX(0)';
                tabElement.style.opacity = tabElement.classList.contains('active') ? '1' : '0';
                tabElement.style.display = tabElement.classList.contains('active') ? 'block' : 'none';
            }
        });
    }

    container.addEventListener('touchstart', (e) => {
        const now = Date.now();
        if (now - lastSwipeTime < debounceTime) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        touchMoveX = e.touches[0].clientX;
        touchMoveY = e.touches[0].clientY;
        const diffX = touchMoveX - touchStartX;
        const diffY = touchMoveY - touchStartY;
        const currentTab = tabs.find(tab => document.getElementById(`${tab}-tab`)?.classList.contains('active'));
        const currentIndex = tabs.indexOf(currentTab);

        if (Math.abs(diffY) > verticalThreshold || Math.abs(diffX) < 20) return;

        e.preventDefault();
        isSwiping = true;

        if ((currentIndex === 0 && diffX > 0) || (currentIndex === tabs.length - 1 && diffX < 0)) return;

        const currentTabElement = document.getElementById(`${currentTab}-tab`);
        if (currentTabElement) {
            currentTabElement.style.transition = 'none';
            currentTabElement.style.transform = `translateX(${diffX}px)`;
            currentTabElement.style.opacity = Math.max(0.2, 1 - Math.abs(diffX) / window.innerWidth);
        }

        const nextTab = diffX < 0 ? tabs[currentIndex + 1] : tabs[currentIndex - 1];
        const nextTabElement = document.getElementById(`${nextTab}-tab`);
        if (nextTabElement) {
            nextTabElement.style.display = 'block';
            nextTabElement.style.transition = 'none';
            nextTabElement.style.transform = `translateX(${diffX < 0 ? window.innerWidth + diffX : -window.innerWidth + diffX}px)`;
            nextTabElement.style.opacity = Math.min(1, Math.abs(diffX) / window.innerWidth);
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (!isSwiping) return;

        const now = Date.now();
        if (now - lastSwipeTime < debounceTime) return;
        lastSwipeTime = now;

        const diffX = touchMoveX - touchStartX;
        const diffY = touchMoveY - touchStartY;
        const currentTab = tabs.find(tab => document.getElementById(`${tab}-tab`)?.classList.contains('active'));
        const currentIndex = tabs.indexOf(currentTab);
        const currentTabElement = document.getElementById(`${currentTab}-tab`);
        const nextTab = diffX < 0 ? tabs[currentIndex + 1] : tabs[currentIndex - 1];
        const nextTabElement = document.getElementById(`${nextTab}-tab`);

        if (currentTabElement) currentTabElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        if (nextTabElement) nextTabElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';

        if (Math.abs(diffX) > swipeThreshold && Math.abs(diffY) <= verticalThreshold && nextTab) {
            switchTab(nextTab, diffX < 0 ? 'left' : 'right');
        } else {
            if (currentTabElement) {
                currentTabElement.style.transform = 'translateX(0)';
                currentTabElement.style.opacity = '1';
            }
            if (nextTabElement) {
                nextTabElement.style.transform = diffX < 0 ? 'translateX(100%)' : 'translateX(-100%)';
                nextTabElement.style.opacity = '0';
                nextTabElement.addEventListener('transitionend', () => {
                    nextTabElement.style.display = 'none';
                    resetTabStates();
                }, { once: true });
            } else {
                resetTabStates();
            }
        }
    });

    resetTabStates();
}

async function updateGameList() {
    if (actionRunning) return;
    actionRunning = true;
    const btn = document.getElementById('update-config');
    btn.classList.add('loading');
    appendToOutput("Checking for game list updates...", 'info');
    try {
        const output = await execCommand("sh /data/adb/modules/COPG/update_config.sh");
        const outputLines = output.split('\n').filter(line => line.trim());
        let isUpToDate = false;

        outputLines.forEach(line => {
            if (line.trim() && !line.includes('Your config is already up-to-date')) {
                appendToOutput(line);
            }
            if (line.includes('Your config is already up-to-date')) {
                isUpToDate = true;
            }
        });

        if (isUpToDate) {
            appendToOutput("No updates found for game list", 'info');
        } else {
            appendToOutput("Game list updated successfully", 'success');
            await loadConfig();
        }
    } catch (error) {
        appendToOutput("Failed to check game list updates: " + error, 'error');
    }
    btn.classList.remove('loading');
    actionRunning = false;
}

function applyEventListeners() {
    document.getElementById('toggle-auto-brightness').addEventListener('click', async (e) => {
        const isChecked = e.target.checked;
        try {
            await execCommand(`sed -i '/AUTO_BRIGHTNESS_OFF=/d' /data/adb/copg_state; echo "AUTO_BRIGHTNESS_OFF=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
            appendToOutput(isChecked ? "Auto-Brightness Disabled" : "Auto-Brightness Enabled", isChecked ? 'success' : 'error');
        } catch (error) {
            appendToOutput(`Failed to update auto-brightness: ${error}`, 'error');
            e.target.checked = !isChecked;
        }
    });

    document.getElementById('toggle-dnd').addEventListener('click', async (e) => {
        const isChecked = e.target.checked;
        try {
            await execCommand(`sed -i '/DND_ON=/d' /data/adb/copg_state; echo "DND_ON=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
            appendToOutput(isChecked ? "DND Enabled" : "DND Disabled", isChecked ? 'success' : 'error');
        } catch (error) {
            appendToOutput(`Failed to update DND: ${error}`, 'error');
            e.target.checked = !isChecked;
        }
    });

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

    document.getElementById('toggle-keep-screen-on').addEventListener('click', async (e) => {
        const isChecked = e.target.checked;
        try {
            await execCommand(`sed -i '/KEEP_SCREEN_ON=/d' /data/adb/copg_state; echo "KEEP_SCREEN_ON=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
            appendToOutput(isChecked ? "Keep Screen On Enabled" : "Keep Screen On Disabled", isChecked ? 'success' : 'error');
        } catch (error) {
            appendToOutput(`Failed to update keep screen on: ${error}`, 'error');
            e.target.checked = !isChecked;
        }
    });

    document.getElementById('update-config').addEventListener('click', () => {
        if (actionRunning) return;
        showPopup('update-confirm-popup');
    });

    document.getElementById('update-yes').addEventListener('click', async () => {
        hidePopup('update-confirm-popup', async () => {
            await updateGameList();
        });
    });

    document.getElementById('update-no').addEventListener('click', () => {
        closePopup('update-confirm-popup');
        appendToOutput("Update canceled", 'info');
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

    document.getElementById('log-header').addEventListener('click', toggleLogSection);
    document.getElementById('clear-log').addEventListener('click', (e) => {
        e.stopPropagation();
        const output = document.getElementById('output');
        output.innerHTML = '';
        appendToOutput("Log cleared", 'success');
    });

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    document.getElementById('tab-settings').addEventListener('click', () => switchTab('settings'));
    document.getElementById('tab-devices').addEventListener('click', () => switchTab('devices'));
    document.getElementById('tab-games').addEventListener('click', () => switchTab('games'));

    document.getElementById('add-device').addEventListener('click', () => openDeviceModal());
    document.getElementById('add-game').addEventListener('click', () => openGameModal());

    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        const popup = btn.closest('.popup');
        if (modal) closeModal(modal.id);
        if (popup) closePopup(popup.id);
    }));

    document.getElementById('device-form').addEventListener('submit', saveDevice);
    document.getElementById('game-form').addEventListener('submit', saveGame);

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

    document.getElementById('game-device').addEventListener('click', () => {
        showPopup('device-picker-popup');
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
                deviceData.MANUFACTURER || '',
                deviceData.FINGERPRINT || ''
            ].join(' ').toLowerCase();
            card.style.display = searchableText.includes(searchTerm) ? 'block' : 'none';
        });
    });

    document.getElementById('game-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.game-card').forEach(card => {
            const name = card.querySelector('.game-name').textContent.toLowerCase();
            const device = card.querySelector('.game-details').textContent.toLowerCase().replace('spoofed as: ', '');
            card.style.display = (name.includes(searchTerm) || device.includes(searchTerm)) ? 'block' : 'none';
        });
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
                deviceData.FINGERPRINT || ''
            ].join(' ').toLowerCase();
            card.style.display = searchableText.includes(searchTerm) ? 'block' : 'none';
        });
    });

    setupSwipeNavigation();
}

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
    await loadToggleStates();
    await loadConfig();
    applyEventListeners();
    switchTab('settings');
});

// Package Picker Functions
const loadPackagePickerDependencies = async () => {
    // Load required dependencies for package picker
    if (typeof wrapInputStream === 'undefined') {
        const { wrapInputStream } = await import("https://mui.kernelsu.org/internal/assets/ext/wrapInputStream.mjs");
        window.wrapInputStream = wrapInputStream;
    }
};

async function showPackagePicker() {
    appendToOutput("Loading package picker...", 'info');
    const popup = document.getElementById('package-picker-popup');
    const searchInput = document.getElementById('package-picker-search');
    const appList = document.getElementById('package-picker-list');
    
    // Set readonly to prevent keyboard on popup open
    searchInput.setAttribute('readonly', 'true');
    searchInput.value = '';
    appList.innerHTML = '<div class="loader" style="width: 100%; height: 40px; margin: 16px 0;"></div>';
    appIndex = []; // Reset index

    // Add click handler to enable search input
    const enableSearch = () => {
        searchInput.removeAttribute('readonly');
        searchInput.focus();
        searchContainer.removeEventListener('click', enableSearch);
    };
    const searchContainer = popup.querySelector('.search-container');
    searchContainer.addEventListener('click', enableSearch);

    try {
        let pkgList = [];
        
        // First try using the API method
        try {
            if (typeof $packageManager !== 'undefined' && typeof $packageManager.getInstalledPackages === 'function') {
                pkgList = JSON.parse($packageManager.getInstalledPackages(0, 0));
                appendToOutput("Loaded packages using API method", 'success');
            } else {
                throw new Error("PackageManager API not available");
            }
        } catch (apiError) {
            appendToOutput("API method failed, falling back to pm command: " + apiError, 'warning');
            // Fallback to pm list packages command
            const pmOutput = await execCommand("pm list packages -3 | cut -d: -f2");
            pkgList = pmOutput.trim().split('\n').filter(pkg => pkg.trim() !== '');
            if (pkgList.length === 0) {
                throw new Error("No packages found using pm command");
            }
            appendToOutput(`Loaded ${pkgList.length} packages using pm command`, 'success');
        }
        appendToOutput("Indexing apps for search...", 'info');

        // Populate app index with package names and labels
        for (const pkg of pkgList) {
            let label = pkg; // Fallback to package name
            try {
                const info = $packageManager.getApplicationInfo(pkg, 0, 0);
                if (info && info.getLabel()) {
                    label = info.getLabel() || pkg;
                }
            } catch (e) {
                console.error(`Error fetching label for ${pkg}:`, e);
            }
            appIndex.push({ 
                package: pkg, 
                label: label.toLowerCase(), 
                originalLabel: label 
            });
        }

        // Sort index by label for better UX
        appIndex.sort((a, b) => a.label.localeCompare(b.label));

        // Get list of already added games
        const addedGames = [];
        for (const [key, value] of Object.entries(currentConfig)) {
            if (Array.isArray(value) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
                value.forEach(gamePackage => {
                    if (!addedGames.includes(gamePackage)) {
                        addedGames.push(gamePackage);
                    }
                });
            }
        }

        appList.innerHTML = '';

        // Create IntersectionObserver for lazy loading icons
        if (!packagePickerObserver) {
            packagePickerObserver = new IntersectionObserver(async (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const iconContainer = entry.target;
                        const pkg = iconContainer.dataset.pkg;
                        const appCard = iconContainer.closest('.app-card');
                        
                        try {
                            // Try to load app icon if API is available
                            if (typeof $packageManager !== 'undefined' && typeof $packageManager.getApplicationIcon === 'function') {
                                const stream = $packageManager.getApplicationIcon(pkg, 0, 0);
                                await loadPackagePickerDependencies();
                                const response = await wrapInputStream(stream);
                                const buffer = await response.arrayBuffer();
                                
                                // Create the actual image element
                                const img = document.createElement('img');
                                img.className = 'app-icon-loaded';
                                img.src = 'data:image/png;base64,' + arrayBufferToBase64(buffer);
                                img.style.opacity = '0';
                                img.style.transition = 'opacity 0.3s ease';
                                
                                // Replace placeholder with actual icon
                                iconContainer.innerHTML = '';
                                iconContainer.appendChild(img);
                                
                                // Fade in the icon
                                setTimeout(() => {
                                    img.style.opacity = '1';
                                }, 10);
                            }
                        } catch (e) {
                            console.error('Error loading app icon:', e);
                            // Keep the placeholder if loading fails
                            iconContainer.classList.add('load-failed');
                        }

                        packagePickerObserver.unobserve(iconContainer);
                    }
                }
            }, { rootMargin: '100px', threshold: 0.1 });
        }

        // Render app cards with beautiful placeholders
        const fragment = document.createDocumentFragment();
        pkgList.forEach(pkg => {
            const appCard = document.createElement('div');
            appCard.className = 'app-card';
            appCard.dataset.package = pkg;

            // Add class if package is already in the list
            if (addedGames.includes(pkg)) {
                appCard.classList.add('added-game');
            }

            // Icon container with placeholder
            const iconContainer = document.createElement('div');
            iconContainer.className = 'app-icon-container';
            iconContainer.dataset.pkg = pkg;
            
            // Create the placeholder element
            const placeholder = document.createElement('div');
            placeholder.className = 'app-icon-placeholder';
            iconContainer.appendChild(placeholder);

            // Info container
            const infoContainer = document.createElement('div');
            infoContainer.className = 'app-info';

            const name = document.createElement('div');
            name.className = 'app-name';
            name.textContent = appIndex.find(app => app.package === pkg)?.originalLabel || pkg;

            const packageName = document.createElement('div');
            packageName.className = 'app-package';
            packageName.textContent = pkg;

            infoContainer.appendChild(name);
            infoContainer.appendChild(packageName);

            appCard.appendChild(iconContainer);
            appCard.appendChild(infoContainer);
            fragment.appendChild(appCard);

            // Observe the icon container for lazy loading
            packagePickerObserver.observe(iconContainer);

            appCard.addEventListener('click', () => {
                document.getElementById('game-package').value = pkg;
                const appInfo = appIndex.find(app => app.package === pkg);
                const gameName = appInfo?.originalLabel || appInfo?.label || pkg;
                document.getElementById('game-name').value = gameName;
                closePopup('package-picker-popup');
            });
        });

        appList.appendChild(fragment);

        // Search functionality using the index
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const matchedPackages = appIndex
                .filter(app => app.label.includes(searchTerm) || app.package.includes(searchTerm))
                .map(app => app.package);

            document.querySelectorAll('.app-card').forEach(card => {
                const pkg = card.dataset.package;
                card.style.display = matchedPackages.includes(pkg) ? 'flex' : 'none';
            });
        });

        showPopup('package-picker-popup');
        appendToOutput("App list loaded", 'success');
    } catch (error) {
        console.error("Failed to load package list:", error);
        appList.innerHTML = `
            <div style="color: var(--error); text-align: center; padding: 16px;">
                Failed to load apps: ${error.message}
                <button onclick="showPackagePicker()" style="margin-top: 8px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 8px;">
                    Try Again
                </button>
            </div>
        `;
        appendToOutput("Failed to load package list: " + error, 'error');
    }
}

// Add event listener for package picker cancel button
document.querySelector('#package-picker-popup .cancel-btn')?.addEventListener('click', () => {
    document.getElementById('package-picker-search').value = '';
    closePopup('package-picker-popup');
});

// Utility function for array buffer to base64
function arrayBufferToBase64(buffer) {
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    uint8Array.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
}

// Add event listener for package picker button
document.addEventListener('DOMContentLoaded', () => {
    const pickerBtn = document.getElementById('package-picker-btn');
    if (pickerBtn) {
        pickerBtn.addEventListener('click', showPackagePicker);
        pickerBtn.style.padding = '0 8px'; // Smaller button
    }
});

function showIgnoreExplanation(e) {
    e.stopPropagation(); 
    
    
    const popup = document.createElement('div');
    popup.className = 'ignore-explanation-popup';
    popup.innerHTML = `
        <div class="explanation-content">
            <h3>About Ignored Apps</h3>
            <div class="explanation-text">
                <strong>Ignored</strong> means this app <strong>WON'T</strong> receive these tweaks:
                <ul>
                    <li>Do Not Disturb (DND)</li>
                    <li>Auto-Brightness</li>
                    <li>Disable Logging</li>
                    <li>Keep Screen On</li>
                </ul>
                <strong>Important:</strong> Spoofing <strong>WILL STILL WORK</strong> normally.
            </div>
            <button class="action-btn" onclick="this.parentElement.parentElement.remove()">OK</button>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });
}
