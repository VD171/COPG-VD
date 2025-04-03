let actionRunning = false;
let currentConfig = {};
let editingDevice = null;
let editingGame = null;

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
    
    // Prioritize explicit type over content-based rules
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
        // Fallback content-based rules
        if (content.includes('[!]') || content.includes('❌')) {
            colorClass = 'log-error';
            iconClass = 'icon-error';
        } else if (content.includes('Deleted') || content.includes('Removed') || content.includes('Disabled')) {
            colorClass = 'log-red';
            iconClass = 'icon-error';
        } else if (content.includes('✅')) {
            colorClass = 'log-success';
            iconClass = 'icon-success';
        } else if (content.includes('🔄') || content.includes('Rebooting') || content.includes('Deleting')) {
            colorClass = 'log-warning';
            iconClass = 'icon-warning';
        } else if (content.includes('Enabled')) {
            colorClass = 'log-green';
            iconClass = 'icon-success';
        } else if (content.includes('saved') || content.includes('added') || content.includes('cleared')) {
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
        currentConfig = JSON.parse(configContent);
        for (const key in currentConfig) {
            if (key.endsWith('_DEVICE') && currentConfig[key].CPUINFO) {
                currentConfig[key].CPUINFO = currentConfig[key].CPUINFO.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
            }
        }
        appendToOutput("Config loaded successfully", 'success');
        renderDeviceList();
        renderGameList();
    } catch (error) {
        appendToOutput("Failed to load config: " + error, 'error');
        currentConfig = {};
    }
}

function renderDeviceList() {
    const deviceList = document.getElementById('device-list');
    deviceList.innerHTML = '';
    
    for (const [key, value] of Object.entries(currentConfig)) {
        if (key.endsWith('_DEVICE')) {
            const deviceName = value.DEVICE || key.replace('PACKAGES_', '').replace('_DEVICE', '');
            const packageKey = key.replace('_DEVICE', '');
            const gameCount = Array.isArray(currentConfig[packageKey]) ? currentConfig[packageKey].length : 0;
            
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-card';
            deviceCard.dataset.key = key;
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
                    <div><strong>Brand:</strong> ${value.BRAND || 'Unknown'}</div>
                    <div><strong>Model:</strong> ${value.MODEL || 'Unknown'}</div>
                    <div><strong>Games:</strong> ${gameCount}</div>
                </div>
            `;
            deviceList.appendChild(deviceCard);
        }
    }
    
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

function renderGameList() {
    const gameList = document.getElementById('game-list');
    gameList.innerHTML = '';
    
    for (const [key, value] of Object.entries(currentConfig)) {
        if (Array.isArray(value) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
            const deviceKey = `${key}_DEVICE`;
            const deviceName = currentConfig[deviceKey]?.DEVICE || key.replace('PACKAGES_', '');
            value.forEach(gamePackage => {
                const gameCard = document.createElement('div');
                gameCard.className = 'game-card';
                gameCard.dataset.package = gamePackage;
                gameCard.dataset.device = key;
                gameCard.innerHTML = `
                    <div class="game-header">
                        <h4 class="game-name">${gamePackage}</h4>
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
                        <div><strong>Spoofed as:</strong> ${deviceName}</div>
                    </div>
                `;
                gameList.appendChild(gameCard);
            });
        }
    }
    
    attachGameListeners();
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
    deleteGame(e.currentTarget.dataset.game, e.currentTarget.dataset.device);
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
                const selectedDeviceInput = document.getElementById('game-device');
                selectedDeviceInput.value = deviceName;
                selectedDeviceInput.dataset.key = key;
                closePopup('device-picker-popup');
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
    
    if (deviceKey) {
        title.textContent = 'Edit Device Profile';
        editingDevice = deviceKey;
        const deviceData = currentConfig[deviceKey];
        
        document.getElementById('device-name').value = deviceData.DEVICE || '';
        document.getElementById('device-brand').value = deviceData.BRAND || '';
        document.getElementById('device-model').value = deviceData.MODEL || '';
        document.getElementById('device-manufacturer').value = deviceData.MANUFACTURER || '';
        document.getElementById('device-android-version').value = deviceData.VERSION_RELEASE || '';
        document.getElementById('device-fingerprint').value = deviceData.FINGERPRINT || '';
        document.getElementById('device-build-id').value = deviceData.BUILD_ID || '';
        document.getElementById('device-cpu').value = (deviceData.CPUINFO || '').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    } else {
        title.textContent = 'Add New Device Profile';
        editingDevice = null;
        form.reset();
    }
    
    modal.style.display = 'flex';
    modal.querySelector('.modal-content').classList.add('modal-enter');
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
    
    if (gamePackage) {
        title.textContent = 'Edit Game Configuration';
        editingGame = { package: gamePackage, device: deviceKey };
        packageInput.value = gamePackage;
        deviceInput.value = currentConfig[`${deviceKey}_DEVICE`]?.DEVICE || '';
        deviceInput.dataset.key = `${deviceKey}_DEVICE`;
    } else {
        title.textContent = 'Add New Game';
        editingGame = null;
        form.reset();
        deviceInput.value = '';
        deviceInput.dataset.key = '';
    }
    
    modal.style.display = 'flex';
    modal.querySelector('.modal-content').classList.add('modal-enter');
}

async function saveDevice(e) {
    e.preventDefault();
    
    const deviceName = document.getElementById('device-name').value.trim();
    const deviceKey = `PACKAGES_${deviceName.toUpperCase().replace(/ /g, '_')}_DEVICE`;
    const packageKey = deviceKey.replace('_DEVICE', '');
    
    if (!editingDevice && Object.keys(currentConfig).some(key => key.endsWith('_DEVICE') && key !== deviceKey && currentConfig[key].DEVICE === deviceName)) {
        appendToOutput(`Device profile "${deviceName}" already exists`, 'error');
        return;
    }

    const rawCpuInfo = document.getElementById('device-cpu').value.trim();
    const escapedCpuInfo = rawCpuInfo ? rawCpuInfo.replace(/\n/g, '\\n').replace(/\t/g, '\\t') : 'Unknown';
    const brand = document.getElementById('device-brand').value.trim() || 'Unknown';
    const model = document.getElementById('device-model').value.trim() || 'Unknown';
    const buildId = document.getElementById('device-build-id').value.trim() || 'Unknown';
    const androidVersion = document.getElementById('device-android-version').value.trim() || '14';
    
    const deviceData = {
        BRAND: brand,
        DEVICE: deviceName,
        MANUFACTURER: document.getElementById('device-manufacturer').value.trim() || 'Unknown',
        MODEL: model,
        FINGERPRINT: document.getElementById('device-fingerprint').value.trim() || `${brand}/${model}/${model}:${androidVersion}/${buildId}/20230101:user/release-keys`,
        BUILD_ID: buildId,
        DISPLAY: `${buildId}.A1`,
        PRODUCT: model,
        VERSION_RELEASE: androidVersion,
        SERIAL: `${brand.substring(0, 3)}${Math.floor(100000 + Math.random() * 900000)}`,
        CPUINFO: escapedCpuInfo,
        SERIAL_CONTENT: `${brand.substring(0, 3)}${Math.floor(100000 + Math.random() * 900000)}`
    };
    
    try {
        if (editingDevice && editingDevice !== deviceKey) {
            const oldPackageKey = editingDevice.replace('_DEVICE', '');
            const newPackageKey = packageKey;
            if (currentConfig[oldPackageKey]) {
                currentConfig[newPackageKey] = currentConfig[oldPackageKey];
                delete currentConfig[oldPackageKey];
            }
            delete currentConfig[editingDevice];
            appendToOutput(`Renamed device from "${editingDevice}" to "${deviceKey}"`, 'info');
        }
        
        if (!Array.isArray(currentConfig[packageKey])) {
            currentConfig[packageKey] = [];
        }
        currentConfig[deviceKey] = deviceData;
        
        await saveConfig();
        closeModal('device-modal');
        renderDeviceList();
        appendToOutput(`Device profile "${deviceName}" saved`, 'success');
    } catch (error) {
        appendToOutput(`Failed to save device: ${error}`, 'error');
    }
}

async function saveGame(e) {
    e.preventDefault();
    
    const gamePackage = document.getElementById('game-package').value.trim();
    const deviceKey = document.getElementById('game-device').dataset.key;
    const packageKey = deviceKey.replace('_DEVICE', '');
    
    if (!gamePackage || !deviceKey) {
        appendToOutput("Please fill all required fields and select a device", 'error');
        return;
    }

    if (!currentConfig[deviceKey]) {
        appendToOutput("Selected device profile does not exist", 'error');
        return;
    }

    try {
        if (editingGame) {
            const oldIndex = currentConfig[editingGame.device]?.indexOf(editingGame.package);
            if (oldIndex > -1) {
                currentConfig[editingGame.device].splice(oldIndex, 1);
            }
        }
        
        if (!Array.isArray(currentConfig[packageKey])) {
            currentConfig[packageKey] = [];
        }
        
        if (!currentConfig[packageKey].includes(gamePackage)) {
            currentConfig[packageKey].push(gamePackage);
        }
        
        await saveConfig();
        closeModal('game-modal');
        renderGameList();
        renderDeviceList();
        appendToOutput(`Game "${gamePackage}" added to "${currentConfig[deviceKey].DEVICE}"`, 'success');
        showPopup('reboot-popup');
    } catch (error) {
        appendToOutput(`Failed to save game: ${error}`, 'error');
    }
}

async function deleteDevice(deviceKey) {
    const deviceName = currentConfig[deviceKey]?.DEVICE || deviceKey.replace('PACKAGES_', '').replace('_DEVICE', '');
    const packageKey = deviceKey.replace('_DEVICE', '');
    const card = document.querySelector(`.device-card[data-key="${deviceKey}"]`);
    
    if (!card) return;
    
    card.classList.add('fade-out');
    setTimeout(async () => {
        card.remove();
        try {
            appendToOutput(`Deleting device: ${deviceName}`, 'warning');
            delete currentConfig[packageKey];
            delete currentConfig[deviceKey];
            await saveConfig();
            renderDeviceList();
            renderGameList();
            appendToOutput(`Deleted device "${deviceName}"`, 'red');
            showPopup('reboot-popup');
        } catch (error) {
            appendToOutput(`Failed to delete device: ${error}`, 'error');
            renderDeviceList();
            renderGameList();
        }
    }, 300);
}

async function deleteGame(gamePackage, deviceKey) {
    const deviceName = currentConfig[`${deviceKey}_DEVICE`]?.DEVICE || deviceKey.replace('PACKAGES_', '');
    const card = document.querySelector(`.game-card[data-package="${gamePackage}"][data-device="${deviceKey}"]`);
    
    if (!card) return;
    
    card.classList.add('fade-out');
    setTimeout(async () => {
        card.remove();
        try {
            if (!Array.isArray(currentConfig[deviceKey]) || currentConfig[deviceKey].length === 0) {
                appendToOutput(`No games found for "${deviceName}"`, 'warning');
                return;
            }
            
            const index = currentConfig[deviceKey].indexOf(gamePackage);
            if (index === -1) {
                appendToOutput(`Game "${gamePackage}" not found in "${deviceName}"`, 'error');
                return;
            }
            
            currentConfig[deviceKey].splice(index, 1);
            await saveConfig();
            renderGameList();
            renderDeviceList();
            appendToOutput(`Removed "${gamePackage}" from "${deviceName}"`, 'warning');
            showPopup('reboot-popup');
        } catch (error) {
            appendToOutput(`Failed to delete game: ${error}`, 'error');
            renderGameList();
        }
    }, 300);
}

async function saveConfig() {
    try {
        for (const key in currentConfig) {
            if (key.endsWith('_DEVICE') && currentConfig[key].CPUINFO) {
                currentConfig[key].CPUINFO = currentConfig[key].CPUINFO.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
            }
        }
        const configStr = JSON.stringify(currentConfig, null, 2);
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

async function rebootDevice() {
    appendToOutput("Rebooting device...", 'warning');
    try {
        await execCommand("su -c reboot");
    } catch (error) {
        appendToOutput("Failed to reboot: " + error, 'error');
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
    const currentTab = tabs.find(tab => document.getElementById(`${tab}-tab`).classList.contains('active'));
    if (currentTab === tabId) return;

    const currentTabElement = document.getElementById(`${currentTab}-tab`);
    const newTabElement = document.getElementById(`${tabId}-tab`);
    
    const currentIndex = tabs.indexOf(currentTab);
    const newIndex = tabs.indexOf(tabId);
    const inferredDirection = direction || (newIndex > currentIndex ? 'left' : 'right');
    
    if (currentTabElement) {
        currentTabElement.classList.remove('active');
        currentTabElement.classList.add(inferredDirection === 'left' ? 'slide-out-right' : 'slide-out-left');
    }
    
    newTabElement.classList.add('active');
    newTabElement.classList.add(inferredDirection === 'left' ? 'slide-in-left' : 'slide-in-right');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    setTimeout(() => {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('slide-in-left', 'slide-in-right', 'slide-out-left', 'slide-out-right');
        });
    }, 400);
}

function setupSwipeNavigation() {
    const container = document.getElementById('tab-container');
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoveX = 0;
    let touchMoveY = 0;
    const tabs = ['settings', 'devices', 'games'];
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        touchMoveX = e.touches[0].clientX;
        touchMoveY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        const diffX = touchStartX - touchMoveX;
        const diffY = touchStartY - touchMoveY;
        const currentTab = tabs.find(tab => document.getElementById(`${tab}-tab`).classList.contains('active'));
        const currentIndex = tabs.indexOf(currentTab);
        
        if (Math.abs(diffY) > Math.abs(diffX) || Math.abs(diffX) < 80) return;
        
        if (diffX > 0 && currentIndex < tabs.length - 1) {
            switchTab(tabs[currentIndex + 1], 'left');
        } else if (diffX < 0 && currentIndex > 0) {
            switchTab(tabs[currentIndex - 1], 'right');
        }
    });
}

async function updateGameList() {
    if (actionRunning) return;
    actionRunning = true;
    appendToOutput("Updating game list...");
    try {
        const output = await execCommand("sh /data/adb/modules/COPG/action.sh");
        output.split('\n').forEach(line => {
            if (line.trim()) appendToOutput(line);
            if (line.includes('🔄 Reboot required')) showPopup('reboot-popup');
        });
        await loadConfig();
        appendToOutput("Game list updated successfully", 'success');
    } catch (error) {
        appendToOutput("Failed to update game list: " + error, 'error');
    }
    actionRunning = false;
}

function applyEventListeners() {
    document.getElementById('toggle-auto-brightness').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/AUTO_BRIGHTNESS_OFF=/d' /data/adb/copg_state; echo "AUTO_BRIGHTNESS_OFF=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "Auto-Brightness Disabled" : "Auto-Brightness Enabled", isChecked ? 'success' : 'error');
    });

    document.getElementById('toggle-dnd').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/DND_ON=/d' /data/adb/copg_state; echo "DND_ON=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "DND Enabled" : "DND Disabled", isChecked ? 'success' : 'error');
    });

    document.getElementById('toggle-logging').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/DISABLE_LOGGING=/d' /data/adb/copg_state; echo "DISABLE_LOGGING=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "Logging Disabled" : "Logging Enabled", isChecked ? 'success' : 'error');
    });

    document.getElementById('toggle-keep-screen-on').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/KEEP_SCREEN_ON=/d' /data/adb/copg_state; echo "KEEP_SCREEN_ON=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "Keep Screen On Enabled" : "Keep Screen On Disabled", isChecked ? 'success' : 'error');
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
        hidePopup('update-confirm-popup');
        appendToOutput("Update canceled");
    });

    document.getElementById('reboot-yes').addEventListener('click', async () => {
        hidePopup('reboot-popup');
        await rebootDevice();
    });

    document.getElementById('reboot-no').addEventListener('click', () => {
        hidePopup('reboot-popup');
        appendToOutput("Reboot canceled");
    });

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

    document.getElementById('device-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.device-card').forEach(card => {
            const name = card.querySelector('.device-name').textContent.toLowerCase();
            const brand = card.querySelector('.device-details div:nth-child(1)').textContent.toLowerCase().replace('brand: ', '');
            const model = card.querySelector('.device-details div:nth-child(2)').textContent.toLowerCase().replace('model: ', '');
            const matches = name.includes(searchTerm) || brand.includes(searchTerm) || model.includes(searchTerm);
            card.style.display = matches ? '' : 'none';
        });
    });

    document.getElementById('game-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.game-card').forEach(card => {
            const name = card.querySelector('.game-name').textContent.toLowerCase();
            const device = card.querySelector('.game-details div').textContent.toLowerCase().replace('spoofed as: ', '');
            const matches = name.includes(searchTerm) || device.includes(searchTerm);
            card.style.display = matches ? '' : 'none';
        });
    });

    setupSwipeNavigation();
}

document.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-icon').textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    } else {
        document.getElementById('theme-icon').textContent = '☀️';
    }
    appendToOutput("UI initialized", 'success');
    loadVersion();
    loadToggleStates();
    loadConfig();
    applyEventListeners();
});
