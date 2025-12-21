let actionRunning = false;
let configKeyOrder = [];
let currentConfig = {};
let editingDevice = null;
let editingGame = null;
let lastRender = { devices: 0, games: 0 };
const RENDER_DEBOUNCE_MS = 150;
let snackbarTimeout = null;
let appIndex = [];
let logcatProcess = null;
let logcatRunning = false;
let selectedGameType = 'device';
let currentDeviceSort = 'default';
let deviceSortDropdown = null;
let currentGameSort = 'default';
let sortDropdown = null;
let gameListOriginalOrder = [];
let currentFilter = null;
let activeFilter = null;

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
        card.querySelector('.delete-btn').dataset.device = data.key;
        card.querySelector('.device-details').innerHTML = `Model: ${data.model}<br>Games associated: ${data.gameCount}`;
        
        return card;
    },
    
    gameCard: (data) => {
        const template = document.getElementById('game-card-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.game-card');
        
        card.dataset.package = data.gamePackage;
        card.dataset.device = data.deviceKey;
        card.style.animationDelay = `${data.delay}s`;
        card.querySelector('.game-name').textContent = data.gameName;
        card.querySelector('.game-package').textContent = data.cleanPackageName;
        card.querySelector('.edit-btn').dataset.game = data.gamePackage;
        card.querySelector('.edit-btn').dataset.device = data.deviceKey;
        card.querySelector('.delete-btn').dataset.game = data.gamePackage;
        card.querySelector('.delete-btn').dataset.device = data.deviceKey;
        card.querySelector('.game-info').textContent = data.deviceName;
        
        const badgeGroup = card.querySelector('.badge-group');
        let badgesHTML = '';
        
        if (data.isInstalled) {
            badgesHTML += '<span class="installed-badge">Installed</span>';
        }
        if (data.additionalBadges) {
            badgesHTML += data.additionalBadges;
        }
        
        badgeGroup.innerHTML = badgesHTML;
        return card;
    },
    
    cpuSpoofCard: (data) => {
        const template = document.getElementById('cpu-spoof-card-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.game-card');
        
        card.dataset.package = data.packageName;
        card.dataset.type = data.type;
        card.style.animationDelay = `${data.delay}s`;
        card.querySelector('.game-name').textContent = data.gameName;
        card.querySelector('.game-package').textContent = data.cleanPackageName;
        card.querySelector('.game-info').textContent = data.typeLabel;
        
        const badgeGroup = card.querySelector('.badge-group');
        let typeBadge = '';
               
        badgeGroup.innerHTML = `
            ${typeBadge}
            ${data.isInstalled ? '<span class="installed-badge">Installed</span>' : ''}
        `;
        
        const infoBadge = badgeGroup.querySelector('.blocked-globally-badge, .cpu-only-badge');
        if (infoBadge) {
            infoBadge.style.cursor = 'pointer';
            infoBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                showCpuSpoofInfo(data.cleanPackageName, data.type);
            });
        }
        
        const gameActions = card.querySelector('.game-actions');
        const editSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>`;
        
        const deleteSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>`;
        
        gameActions.innerHTML = `
            <button class="edit-btn" data-package="${data.packageName}" data-type="${data.type}" title="Edit">
                ${editSvg}
            </button>
            <button class="delete-btn" data-package="${data.packageName}" data-type="${data.type}" title="Delete">
                ${deleteSvg}
            </button>
        `;
        
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
    
    packagePickerCard: (data) => {
        const template = document.getElementById('package-picker-card-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.app-card');
        
        card.dataset.package = data.package;
        card.querySelector('.app-name').textContent = data.appLabel;
        card.querySelector('.app-package').textContent = data.package;
        card.querySelector('.app-icon-container').dataset.pkg = data.package;
        
        if (data.isAdded) {
            card.classList.add('added-game');
        }
        
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

function getPackageNameWithoutTags(packageName) {
    const parts = packageName.split(':');
    return parts[0];
}

function getAllTags(packageName) {
    const parts = packageName.split(':');
    return parts.slice(1);
}

function addTagToPackage(packageName, tag) {
    const cleanName = getPackageNameWithoutTags(packageName);
    const existingTags = getAllTags(packageName);
    if (!existingTags.includes(tag)) {
        existingTags.push(tag);
    }
    return existingTags.length > 0 ? `${cleanName}:${existingTags.join(':')}` : cleanName;
}

function removeTagFromPackage(packageName, tag) {
    const cleanName = getPackageNameWithoutTags(packageName);
    const existingTags = getAllTags(packageName).filter(t => t !== tag);
    return existingTags.length > 0 ? `${cleanName}:${existingTags.join(':')}` : cleanName;
}

function hasWithCpuTag(packageName) {
    return packageName.includes(':with_cpu');
}

function hasBlockedTag(packageName) {
    return packageName.includes(':blocked');
}

function addCpuSpoofTag(packageName) {
    const cleanName = getPackageNameWithoutTags(packageName);
    const existingTags = getAllTags(packageName);
    if (!existingTags.includes('with_cpu')) {
        existingTags.push('with_cpu');
    }
    return existingTags.length > 0 ? `${cleanName}:${existingTags.join(':')}` : cleanName;
}

function removeCpuSpoofTag(packageName) {
    const cleanName = getPackageNameWithoutTags(packageName);
    const existingTags = getAllTags(packageName).filter(t => t !== 'with_cpu');
    return existingTags.length > 0 ? `${cleanName}:${existingTags.join(':')}` : cleanName;
}

function addBlockedTag(packageName) {
    const cleanName = getPackageNameWithoutTags(packageName);
    const existingTags = getAllTags(packageName);
    if (!existingTags.includes('blocked')) {
        existingTags.push('blocked');
    }
    return existingTags.length > 0 ? `${cleanName}:${existingTags.join(':')}` : cleanName;
}

function removeBlockedTag(packageName) {
    const cleanName = getPackageNameWithoutTags(packageName);
    const existingTags = getAllTags(packageName).filter(t => t !== 'blocked');
    return existingTags.length > 0 ? `${cleanName}:${existingTags.join(':')}` : cleanName;
}

function toggleCpuSpoofTag(packageName, enable) {
    return enable ? addCpuSpoofTag(packageName) : removeCpuSpoofTag(packageName);
}

function toggleBlockedTag(packageName, enable) {
    return enable ? addBlockedTag(packageName) : removeBlockedTag(packageName);
}

function createSortDropdown() {
    const template = document.getElementById('sort-dropdown-template');
    const clone = template.content.cloneNode(true);
    sortDropdown = clone.querySelector('.sort-dropdown');
    
    sortDropdown.querySelectorAll('.sort-option[data-sort]').forEach(option => {
        option.addEventListener('click', (e) => {
            const sortType = option.dataset.sort;
            setGameSort(sortType);
            sortDropdown.classList.remove('show');
            e.stopPropagation();
        });
    });
    
    sortDropdown.querySelectorAll('.sort-option[data-filter]').forEach(option => {
        option.addEventListener('click', (e) => {
            const filterType = option.dataset.filter;
            
            if (filterType === 'clear') {
                clearGameFilter();
            } else {
                setGameFilter(filterType);
            }
            
            sortDropdown.classList.remove('show');
            e.stopPropagation();
        });
    });
    
    document.addEventListener('click', (e) => {
        if (sortDropdown && sortDropdown.classList.contains('show') && 
            !e.target.closest('.sort-btn') && !e.target.closest('.sort-dropdown')) {
            sortDropdown.classList.remove('show');
        }
    });
    
    document.body.appendChild(sortDropdown);
}

function getFilterDisplayName(filterType) {
    switch(filterType) {
        case 'blocklist': return 'Blocklist';
        case 'cpu_only': return 'CPU Only';
        case 'installed': return 'Installed';
        case 'no_tweaks': return 'No Tweaks';
        default: return filterType;
    }
}

function getSortTypeName(sortType) {
    switch(sortType) {
        case 'default': return 'Default';
        case 'asc': return 'A → Z';
        case 'desc': return 'Z → A';
        case 'blocklist': return 'Blocklist';
        case 'cpu_only': return 'CPU Only';
        case 'installed': return 'Installed';
        case 'no_tweaks': return 'No Tweaks';
        default: return sortType;
    }
}

function updateFilterCounts() {
    const gameList = document.getElementById('game-list');
    if (!gameList) return;
    
    const games = gameList.querySelectorAll('.game-card');
    
    const counts = {
        blocklist: 0,
        cpu_only: 0,
        installed: 0,
        no_tweaks: 0
    };
    
    games.forEach(game => {
        if (game.querySelector('.blocked-globally-badge') || game.querySelector('.blocked-badge')) {
            counts.blocklist++;
        }
        if (game.querySelector('.cpu-only-badge') || game.querySelector('.cpu-badge')) {
            counts.cpu_only++;
        }
        if (game.querySelector('.installed-badge')) {
            counts.installed++;
        }
        if (game.querySelector('.no-tweaks-badge')) {
            counts.no_tweaks++;
        }
    });
    
    const blocklistCount = document.getElementById('blocklist-count');
    const cpuOnlyCount = document.getElementById('cpu-only-count');
    const installedCount = document.getElementById('installed-count');
    const noTweaksCount = document.getElementById('no-tweaks-count');
    
    if (blocklistCount) blocklistCount.textContent = counts.blocklist;
    if (cpuOnlyCount) cpuOnlyCount.textContent = counts.cpu_only;
    if (installedCount) installedCount.textContent = counts.installed;
    if (noTweaksCount) noTweaksCount.textContent = counts.no_tweaks;
}

function setGameSort(sortType) {
    currentGameSort = sortType;
    
    sortDropdown.querySelectorAll('.sort-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.sort === sortType) {
            option.classList.add('active');
        }
        if (activeFilter && option.dataset.filter === activeFilter) {
            option.classList.add('active');
        }
    });
    
    sortGameList();
    
    const sortBtn = document.getElementById('game-sort-btn');
    let title = 'Sort games';
    if (sortType === 'asc') title = 'Sorted A→Z';
    else if (sortType === 'desc') title = 'Sorted Z→A';
    else if (activeFilter) {
        title = `Filter: ${getFilterDisplayName(activeFilter)}`;
    }
    sortBtn.title = title;
    
    appendToOutput(`Games sorted: ${getSortTypeName(sortType)}`, 'info');
}

function setDeviceSort(sortType) {
    currentDeviceSort = sortType;
    
    deviceSortDropdown.querySelectorAll('.sort-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.sort === sortType) {
            option.classList.add('active');
        }
    });
    
    sortDeviceList();
    
    const sortBtn = document.getElementById('device-sort-btn');
    let title = 'Sort devices';
    if (sortType === 'asc') title = 'Sorted A→Z';
    else if (sortType === 'desc') title = 'Sorted Z→A';
    sortBtn.title = title;
    
    appendToOutput(`Devices sorted: ${getSortTypeName(sortType)}`, 'info');
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
        if (key.endsWith('_DEVICE') && currentConfig[key]) {
            const deviceName = currentConfig[key].DEVICE || key.replace('PACKAGES_', '').replace('_DEVICE', '');
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

function getOriginalGameOrder() {
    const games = [];
    const cpuSpoofData = currentConfig.cpu_spoof || {};
    const blockedList = cpuSpoofData.blacklist || [];
    const cpuOnlyList = cpuSpoofData.cpu_only_packages || [];
    
    blockedList.forEach((packageName, index) => {
        games.push({
            packageName: packageName,
            type: 'blocked',
            cleanPackageName: getPackageNameWithoutTags(packageName),
            originalIndex: index,
            list: 'blocked'
        });
    });
    
    cpuOnlyList.forEach((packageName, index) => {
        games.push({
            packageName: packageName,
            type: 'cpu_only',
            cleanPackageName: getPackageNameWithoutTags(packageName),
            originalIndex: index,
            list: 'cpu_only'
        });
    });
    
    for (const key of configKeyOrder) {
        if (Array.isArray(currentConfig[key]) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
            const deviceKey = `${key}_DEVICE`;
            const deviceData = currentConfig[deviceKey] || {};
            const deviceName = deviceData.DEVICE || key.replace('PACKAGES_', '');
            
            currentConfig[key].forEach((gamePackage, index) => {
                games.push({
                    packageName: gamePackage,
                    type: 'device',
                    deviceKey: key,
                    deviceName: deviceName,
                    cleanPackageName: getPackageNameWithoutTags(gamePackage),
                    originalIndex: index,
                    list: key
                });
            });
        }
    }
    
    return games;
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

function sortGameList() {
    const gameList = document.getElementById('game-list');
    if (!gameList) return;
    
    if (activeFilter) {
        const visibleGames = Array.from(gameList.querySelectorAll('.game-card[style*="display: block"], .game-card:not([style*="display: none"])'));
        
        if (currentGameSort === 'asc') {
            visibleGames.sort((a, b) => {
                const nameA = a.querySelector('.game-name').textContent.toLowerCase();
                const nameB = b.querySelector('.game-name').textContent.toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (currentGameSort === 'desc') {
            visibleGames.sort((a, b) => {
                const nameA = a.querySelector('.game-name').textContent.toLowerCase();
                const nameB = b.querySelector('.game-name').textContent.toLowerCase();
                return nameB.localeCompare(nameA);
            });
        }
        
        visibleGames.forEach((game, index) => {
            game.style.order = index;
        });
        
        attachGameListeners();
        setupLongPressHandlers();
        return;
    }
    
    const games = Array.from(gameList.querySelectorAll('.game-card'));
    
    if (currentGameSort === 'default') {
        const originalOrder = getOriginalGameOrder();
        
        const groupedGames = {};
        originalOrder.forEach(gameInfo => {
            const key = gameInfo.list || gameInfo.deviceKey || gameInfo.type;
            if (!groupedGames[key]) {
                groupedGames[key] = [];
            }
            groupedGames[key].push(gameInfo);
        });
        
        const sortedGames = [];
        
        if (groupedGames['blocked']) {
            groupedGames['blocked'].forEach(gameInfo => {
                const game = games.find(g => 
                    g.dataset.package === gameInfo.packageName && 
                    g.dataset.type === 'blocked'
                );
                if (game) sortedGames.push(game);
            });
        }
        
        if (groupedGames['cpu_only']) {
            groupedGames['cpu_only'].forEach(gameInfo => {
                const game = games.find(g => 
                    g.dataset.package === gameInfo.packageName && 
                    g.dataset.type === 'cpu_only'
                );
                if (game) sortedGames.push(game);
            });
        }
        
        for (const key of configKeyOrder) {
            if (key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE') && groupedGames[key]) {
                groupedGames[key].forEach(gameInfo => {
                    const game = games.find(g => 
                        g.dataset.package === gameInfo.packageName && 
                        g.dataset.device === gameInfo.deviceKey
                    );
                    if (game) sortedGames.push(game);
                });
            }
        }
        
        games.forEach(game => {
            if (!sortedGames.includes(game)) {
                sortedGames.push(game);
            }
        });
        
        gameList.innerHTML = '';
        sortedGames.forEach(game => gameList.appendChild(game));
        
    } else if (currentGameSort === 'asc') {
        games.sort((a, b) => {
            const nameA = a.querySelector('.game-name').textContent.toLowerCase();
            const nameB = b.querySelector('.game-name').textContent.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        gameList.innerHTML = '';
        games.forEach(game => gameList.appendChild(game));
    } else if (currentGameSort === 'desc') {
        games.sort((a, b) => {
            const nameA = a.querySelector('.game-name').textContent.toLowerCase();
            const nameB = b.querySelector('.game-name').textContent.toLowerCase();
            return nameB.localeCompare(nameA);
        });
        
        gameList.innerHTML = '';
        games.forEach(game => gameList.appendChild(game));
    }
    
    attachGameListeners();
    setupLongPressHandlers();
    updateFilterCounts();
}

function applyGameFilter() {
    const gameList = document.getElementById('game-list');
    if (!gameList || !activeFilter) return;
    
    const games = gameList.querySelectorAll('.game-card');
    let visibleCount = 0;
    
    games.forEach(game => {
        let shouldShow = false;
        
        switch(activeFilter) {
            case 'blocklist':
                shouldShow = game.querySelector('.blocked-globally-badge') || 
                            game.querySelector('.blocked-badge');
                break;
            case 'cpu_only':
                shouldShow = game.querySelector('.cpu-only-badge') || 
                            game.querySelector('.cpu-badge');
                break;
            case 'installed':
                shouldShow = game.querySelector('.installed-badge');
                break;
            case 'no_tweaks':
                shouldShow = game.querySelector('.no-tweaks-badge');
                break;
            default:
                shouldShow = true;
        }
        
        if (shouldShow) {
            game.style.display = 'block';
            visibleCount++;
            game.style.order = '';
        } else {
            game.style.display = 'none';
        }
    });
    
    if (visibleCount > 0 && currentGameSort !== 'default') {
        const visibleGames = Array.from(gameList.querySelectorAll('.game-card[style*="display: block"]'));
        
        if (currentGameSort === 'asc') {
            visibleGames.sort((a, b) => {
                const nameA = a.querySelector('.game-name').textContent.toLowerCase();
                const nameB = b.querySelector('.game-name').textContent.toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (currentGameSort === 'desc') {
            visibleGames.sort((a, b) => {
                const nameA = a.querySelector('.game-name').textContent.toLowerCase();
                const nameB = b.querySelector('.game-name').textContent.toLowerCase();
                return nameB.localeCompare(nameA);
            });
        }
        
        visibleGames.forEach((game, index) => {
            game.style.order = index;
        });
    }
    
    attachGameListeners();
    setupLongPressHandlers();
    
    if (visibleCount === 0) {
        appendToOutput(`No games found with ${getFilterDisplayName(activeFilter)} filter`, 'warning');
    }
    
    appendToOutput(`Filter applied: ${getFilterDisplayName(activeFilter)} (${visibleCount} games)`, 'info');
}

function removeGameFilter() {
    activeFilter = null;
    
    const gameList = document.getElementById('game-list');
    if (!gameList) return;
    
    const games = gameList.querySelectorAll('.game-card');
    games.forEach(game => {
        game.style.display = 'block';
        game.style.order = '';
    });
    
    if (currentGameSort !== 'default') {
        const sortedGames = Array.from(games);
        
        if (currentGameSort === 'asc') {
            sortedGames.sort((a, b) => {
                const nameA = a.querySelector('.game-name').textContent.toLowerCase();
                const nameB = b.querySelector('.game-name').textContent.toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (currentGameSort === 'desc') {
            sortedGames.sort((a, b) => {
                const nameA = a.querySelector('.game-name').textContent.toLowerCase();
                const nameB = b.querySelector('.game-name').textContent.toLowerCase();
                return nameB.localeCompare(nameA);
            });
        }
        
        gameList.innerHTML = '';
        sortedGames.forEach(game => gameList.appendChild(game));
    }
    
    attachGameListeners();
    setupLongPressHandlers();
}

function setGameFilter(filterType) {
    activeFilter = filterType;
    
    sortDropdown.querySelectorAll('.sort-option[data-filter]').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.filter === filterType) {
            option.classList.add('active');
        }
    });
    
    if (currentGameSort !== 'default') {
        sortDropdown.querySelectorAll('.sort-option[data-sort]').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.sort === currentGameSort) {
                option.classList.add('active');
            }
        });
    }
    
    const clearBtn = document.getElementById('clear-filter-btn');
    if (clearBtn) {
        clearBtn.style.display = 'flex';
    }
    
    const sortBtn = document.getElementById('game-sort-btn');
    sortBtn.title = `Filter: ${getFilterDisplayName(filterType)}`;
    
    applyGameFilter();
}

function clearGameFilter() {
    activeFilter = null;
    
    sortDropdown.querySelectorAll('.sort-option[data-filter]').forEach(option => {
        option.classList.remove('active');
    });
    
    const clearBtn = document.getElementById('clear-filter-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    const sortBtn = document.getElementById('game-sort-btn');
    sortBtn.title = 'Sort & Filter games';
    
    removeGameFilter();
    
    appendToOutput('Filter cleared', 'success');
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

function initializeGameSort() {
    createSortDropdown();
    
    const sortBtn = document.getElementById('game-sort-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const rect = sortBtn.getBoundingClientRect();
            sortDropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
            sortDropdown.style.right = `${window.innerWidth - rect.right}px`;
            
            sortDropdown.classList.toggle('show');
        });
    }
    
    setGameSort('default');
}

function populateDevicePicker() {
    const picker = document.getElementById('device-picker-list');
    picker.innerHTML = '';
    
    for (const [key, value] of Object.entries(currentConfig)) {
        if (key.endsWith('_DEVICE')) {
            const deviceName = value.DEVICE || key.replace('PACKAGES_', '').replace('_DEVICE', '');
            const deviceCard = templates.pickerDeviceCard({
                key: key,
                deviceName: deviceName,
                brand: value.BRAND || 'Unknown',
                model: value.MODEL || 'Unknown'
            });
            
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
        appendToOutput("Starting logcat for COPGModule... (open target app/game ...)", 'info');
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
        versionElement.textContent = `v${version.trim()}`;
    } catch (error) {
        appendToOutput("Failed to load version: " + error, 'error');
    }
}

async function loadConfig() {
    try {
        const configContent = await execCommand("cat /data/adb/modules/COPG/COPG.json");
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
        if (key.endsWith('_DEVICE') && currentConfig[key]) {
            const deviceName = currentConfig[key].DEVICE || key.replace('PACKAGES_', '').replace('_DEVICE', '');
            const packageKey = key.replace('_DEVICE', '');
            const gameCount = Array.isArray(currentConfig[packageKey]) ? currentConfig[packageKey].length : 0;
            const model = currentConfig[key].MODEL || 'Unknown';
            
            const deviceCard = templates.deviceCard({
                key: key,
                delay: Math.min(index * 0.05, 0.5),
                deviceName: deviceName,
                model: model,
                gameCount: gameCount
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
    
    const currentActiveFilter = activeFilter;
    const currentGameSortState = currentGameSort;
    
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

    const cpuSpoofData = currentConfig.cpu_spoof || {};
    const blockedList = cpuSpoofData.blacklist || [];
    const cpuOnlyList = cpuSpoofData.cpu_only_packages || [];

    const fragment = document.createDocumentFragment();
    let index = 0;
    const displayedPackages = new Set();
    
    blockedList.forEach(packageName => {
        const cleanPackageName = getPackageNameWithoutTags(packageName);
        if (displayedPackages.has(cleanPackageName)) return;
        displayedPackages.add(cleanPackageName);
        
        const isInstalled = installedPackages.includes(cleanPackageName);
        const gameName = gameNamesMap[cleanPackageName] || cleanPackageName;
        const hasBlocked = hasBlockedTag(packageName);
        
        const gameCard = templates.cpuSpoofCard({
            packageName: packageName,
            type: 'blocked',
            gameName: gameName,
            cleanPackageName: cleanPackageName,
            isInstalled: isInstalled,
            hasBlocked: hasBlocked,
            delay: Math.min(index * 0.05, 0.5),
            typeLabel: 'Global Blocklist',
            typeBadge: '<span class="blocked-globally-badge">Blocked Globally</span>'
        });
        
        fragment.appendChild(gameCard);
        index++;
    });
    
    cpuOnlyList.forEach(packageName => {
        const cleanPackageName = getPackageNameWithoutTags(packageName);
        if (displayedPackages.has(cleanPackageName)) return;
        displayedPackages.add(cleanPackageName);
        
        const isInstalled = installedPackages.includes(cleanPackageName);
        const gameName = gameNamesMap[cleanPackageName] || cleanPackageName;
        const hasBlocked = hasBlockedTag(packageName);
        
        const gameCard = templates.cpuSpoofCard({
            packageName: packageName,
            type: 'cpu_only',
            gameName: gameName,
            cleanPackageName: cleanPackageName,
            isInstalled: isInstalled,
            hasBlocked: hasBlocked,
            delay: Math.min(index * 0.05, 0.5),
            typeLabel: 'CPU Only',
            typeBadge: '<span class="cpu-only-badge">CPU</span>'
        });
        
        fragment.appendChild(gameCard);
        index++;
    });
    
    for (const key of configKeyOrder) {
        if (Array.isArray(currentConfig[key]) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
            const deviceKey = `${key}_DEVICE`;
            const deviceData = currentConfig[deviceKey] || {};
            const deviceName = deviceData.DEVICE || key.replace('PACKAGES_', '');
            
            currentConfig[key].forEach(gamePackage => {
                const cleanPackageName = getPackageNameWithoutTags(gamePackage);
                if (displayedPackages.has(cleanPackageName)) return;
                
                const hasWithCpu = hasWithCpuTag(gamePackage);
                const hasBlocked = hasBlockedTag(gamePackage);
                const isInstalled = installedPackages.includes(cleanPackageName);
                const gameName = gameNamesMap[cleanPackageName] || cleanPackageName;
                
                const isBlocked = blockedList.includes(cleanPackageName);
                const isCpuOnly = cpuOnlyList.includes(cleanPackageName);
                
                let additionalBadges = '';
                if (isBlocked) {
                    additionalBadges += '<span class="blocked-globally-badge">Blocked Globally</span>';
                }
                if (isCpuOnly) {
                    additionalBadges += '<span class="cpu-only-badge">CPU</span>';
                }
                
                const gameCard = templates.gameCard({
                    gamePackage: gamePackage,
                    deviceKey: key,
                    delay: Math.min(index * 0.05, 0.5),
                    gameName: gameName,
                    cleanPackageName: cleanPackageName,
                    deviceName: deviceName,
                    hasWithCpu: hasWithCpu,
                    hasBlocked: hasBlocked,
                    isInstalled: isInstalled,
                    additionalBadges: additionalBadges
                });
                
                fragment.appendChild(gameCard);
                displayedPackages.add(cleanPackageName);
                index++;
            });
        }
    }
    
    gameList.innerHTML = '';
    gameList.appendChild(fragment);
    attachGameListeners();
    setupLongPressHandlers();
    updateFilterCounts();
    
    if (currentGameSortState !== 'default') {
        setTimeout(() => {
            currentGameSort = currentGameSortState;
            sortGameList();
        }, 100);
    } else {
        setTimeout(() => {
            sortGameList();
        }, 100);
    }
    
    if (currentActiveFilter) {
        setTimeout(() => {
            activeFilter = currentActiveFilter;
            
            const sortBtn = document.getElementById('game-sort-btn');
            if (sortBtn && activeFilter) {
                sortBtn.title = `Filter: ${getFilterDisplayName(activeFilter)}`;
            }
            
            applyGameFilter();
            
            const clearBtn = document.getElementById('clear-filter-btn');
            if (clearBtn) {
                clearBtn.style.display = 'flex';
            }
        }, 200);
    } else if (currentFilter) {
        setTimeout(() => {
            applyGameFilter();
        }, 200);
    }
}

function showCpuSpoofInfo(packageName, type) {
    let title = '';
    let explanation = '';
    
    if (type === 'blocked') {
        title = 'Global Blocklist - Complete Protection';
        explanation = `
            <div class="explanation-text">
                <span class="highlight">Applications in this list will NOT receive:</span>
                <ul>
                    <li>CPU Spoofing</li>
                    <li>Device Spoofing</li>
                    <li>Any System Tweaks</li>
                </ul>
                
                <div class="important-note">
                    <span class="important-text">Perfect for:</span> Sensitive apps, banking apps, apps that crash on system modifications, apps sensitive to mount detection, or apps showing incorrect device information.
                </div>
                
                <div class="important-note">
                    <span class="important-text">Result:</span> These apps will always see <span class="highlight">REAL device specifications</span>.
                </div>
            </div>
        `;
    } else if (type === 'cpu_only') {
        title = 'CPU Spoof Only';
        explanation = `
            <div class="explanation-text">
                <span class="highlight">Applications in this list receive:</span>
                <ul>
                    <li>CPU Spoofing</li>
                </ul>
                
                <div class="important-note">
                    <span class="important-text">Note:</span> Only CPU information is modified. Device spoofing is disabled.
                </div>
            </div>
        `;
    }
    
    const popup = document.createElement('div');
    popup.className = 'popup no-tweaks-explanation-popup';
    popup.id = 'cpu-spoof-explanation-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3 class="explanation-title">${title}</h3>
            <div class="explanation-text">
                ${explanation}
            </div>
            <button class="action-btn">OK</button>
        </div>
    `;

    document.body.appendChild(popup);
    requestAnimationFrame(() => {
        popup.style.display = 'flex';
        popup.querySelector('.popup-content').classList.add('modal-enter');
    });

    const okBtn = popup.querySelector('.action-btn');
    okBtn.addEventListener('click', () => {
        const content = popup.querySelector('.popup-content');
        content.classList.remove('modal-enter');
        content.classList.add('popup-exit');
        content.addEventListener('animationend', () => {
            popup.remove();
        }, { once: true });
    });

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            const content = popup.querySelector('.popup-content');
            content.classList.remove('modal-enter');
            content.classList.add('popup-exit');
            content.addEventListener('animationend', () => {
                popup.remove();
            }, { once: true });
        }
    });
}

function setupLongPressHandlers() {
    let pressTimer;
    const pressDuration = 500;
    const scrollThreshold = 15;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isLongPressActive = false;

    const handleTouchStart = (e, card, packageName, deviceKey, spoofType, cleanPackageName, gameName) => {
        if (isLongPressActive) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        pressTimer = setTimeout(() => {
            showLongPressPopup(e, card, packageName, deviceKey, spoofType, cleanPackageName, gameName);
        }, pressDuration);
    };

    const handleTouchMove = (e) => {
        if (!pressTimer) return;
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = Math.abs(touchX - touchStartX);
        const deltaY = Math.abs(touchY - touchStartY);
        const elapsedTime = Date.now() - touchStartTime;

        if (elapsedTime < 100 && (deltaX > 10 || deltaY > 10)) {
            clearTimeout(pressTimer);
            pressTimer = null;
            return;
        }

        if (deltaX > scrollThreshold || deltaY > scrollThreshold) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const handleTouchEnd = (e) => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        if (isLongPressActive) {
            e.preventDefault();
            e.stopPropagation();
            isLongPressActive = false;
        }
    };

    const handleTouchCancel = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const handleMouseDown = (e, card, packageName, deviceKey, spoofType, cleanPackageName, gameName) => {
        if (e.button !== 0 || isLongPressActive) return;
        pressTimer = setTimeout(() => {
            showLongPressPopup(e, card, packageName, deviceKey, spoofType, cleanPackageName, gameName);
        }, pressDuration);
    };

    const handleMouseUp = (e) => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        if (isLongPressActive) {
            e.preventDefault();
            isLongPressActive = false;
        }
    };

    const handleMouseLeave = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const handleClick = (e) => {
        if (isLongPressActive) {
            e.preventDefault();
            e.stopPropagation();
            isLongPressActive = false;
        }
    };

    const handleContextMenu = (e) => {
        if (isLongPressActive) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    document.querySelectorAll('.game-card').forEach(card => {
        if (card._longPressHandlers) {
            Object.entries(card._longPressHandlers).forEach(([event, handler]) => {
                card.removeEventListener(event, handler);
            });
            delete card._longPressHandlers;
        }
    });

    document.querySelectorAll('.game-card').forEach(card => {
        const packageName = card.dataset.package;
        const deviceKey = card.dataset.device;
        const spoofType = card.dataset.type;
        let cleanPackageName, gameName;
        
        if (packageName) {
            cleanPackageName = getPackageNameWithoutTags(packageName);
            gameName = card.querySelector('.game-name').textContent;
        }

        const touchStartWrapper = (e) => handleTouchStart(e, card, packageName, deviceKey, spoofType, cleanPackageName, gameName);
        const mouseDownWrapper = (e) => handleMouseDown(e, card, packageName, deviceKey, spoofType, cleanPackageName, gameName);

        card.addEventListener('touchstart', touchStartWrapper, { passive: true });
        card.addEventListener('touchmove', handleTouchMove, { passive: true });
        card.addEventListener('touchend', handleTouchEnd);
        card.addEventListener('touchcancel', handleTouchCancel);
        card.addEventListener('mousedown', mouseDownWrapper);
        card.addEventListener('mouseup', handleMouseUp);
        card.addEventListener('mouseleave', handleMouseLeave);
        card.addEventListener('click', handleClick);
        card.addEventListener('contextmenu', handleContextMenu);
        
        card._longPressHandlers = {
            touchstart: touchStartWrapper,
            touchmove: handleTouchMove,
            touchend: handleTouchEnd,
            touchcancel: handleTouchCancel,
            mousedown: mouseDownWrapper,
            mouseup: handleMouseUp,
            mouseleave: handleMouseLeave,
            click: handleClick,
            contextmenu: handleContextMenu
        };
    });

    function showLongPressPopup(e, card, packageName, deviceKey, spoofType, cleanPackageName, gameName) {
        e.preventDefault();
        e.stopPropagation();
        if (!packageName) return;
        
        isLongPressActive = true;

        const popup = document.getElementById('no-tweaks-popup');
        const title = document.getElementById('no-tweaks-popup-title');
        const message = document.getElementById('no-tweaks-popup-message');
        const packageEl = document.getElementById('no-tweaks-popup-package');
        const icon = document.getElementById('no-tweaks-popup-icon');
        const confirmBtn = document.getElementById('no-tweaks-popup-confirm');

        packageEl.innerHTML = `
            <span class="game-name-popup">${gameName}</span>
            <span class="package-name-popup">${cleanPackageName}</span>
        `;

        icon.className = 'popup-icon';

        confirmBtn.dataset.package = packageName;
        confirmBtn.dataset.device = deviceKey;
        confirmBtn.dataset.type = spoofType || 'regular';

        popup.style.display = 'flex';
        requestAnimationFrame(() => {
            popup.querySelector('.popup-content').classList.add('modal-enter');
        });
    }

    const popup = document.getElementById('no-tweaks-popup');
    const cancelBtn = document.getElementById('no-tweaks-popup-cancel');
    const confirmBtn = document.getElementById('no-tweaks-popup-confirm');

    if (cancelBtn) {
        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            closePopup('no-tweaks-popup');
            isLongPressActive = false;
        };
    }

    if (confirmBtn) {
        confirmBtn.onclick = async (e) => {
            e.stopPropagation();
            const packageName = confirmBtn.dataset.package;
            const deviceKey = confirmBtn.dataset.device;
            const spoofType = confirmBtn.dataset.type;
            const action = confirmBtn.dataset.action;
            const cleanPackageName = getPackageNameWithoutTags(packageName);
            
            let success = false;
            if (spoofType && spoofType !== 'regular') {
                success = await handleCpuSpoofNoTweak(packageName, spoofType, action, cleanPackageName);
            } else {
                success = await handleRegularNoTweak(packageName, deviceKey, action, cleanPackageName);
            }
            
            if (success) {
                renderGameList();
            }
            closePopup('no-tweaks-popup');
            isLongPressActive = false;
        };
    }

    if (popup) {
        popup.onclick = (e) => {
            if (e.target === popup) {
                closePopup('no-tweaks-popup');
                isLongPressActive = false;
            }
        };
    }
}

async function handleCpuSpoofNoTweak(packageName, spoofType, action, cleanPackageName) {
    try {
        const cpuSpoofData = currentConfig.cpu_spoof || {};
        let targetList = null;
        
        if (spoofType === 'blocked') {
            targetList = cpuSpoofData.blacklist || [];
        } else if (spoofType === 'cpu_only') {
            targetList = cpuSpoofData.cpu_only_packages || [];
        }
        
        if (!targetList) {
            appendToOutput(`Invalid spoof type: ${spoofType}`, 'error');
            return false;
        }
        
        const index = targetList.findIndex(pkg => getPackageNameWithoutTags(pkg) === cleanPackageName);
        if (index === -1) {
            appendToOutput(`Package ${cleanPackageName} not found in ${spoofType} list`, 'error');
            return false;
        }
        
        let newPackageName;
        if (action === 'add') {
            newPackageName = addTagToPackage(packageName, 'notweak');
        } else {
            newPackageName = removeTagFromPackage(packageName, 'notweak');
        }
        
        targetList[index] = newPackageName;
        await saveConfig();
        appendToOutput(
            `${action === 'add' ? 'Added' : 'Removed'} no-tweaks tag for ${cleanPackageName} (${spoofType})`,
            'success'
        );
        return true;
    } catch (error) {
        appendToOutput(`Failed to update CPU Spoof package: ${error}`, 'error');
        return false;
    }
}

async function handleRegularNoTweak(packageName, deviceKey, action, cleanPackageName) {
    try {
        const packageIndex = currentConfig[deviceKey].indexOf(packageName);
        if (packageIndex === -1) {
            appendToOutput(`Package ${cleanPackageName} not found in config`, 'error');
            return false;
        }
        
        let newPackageName;
        if (action === 'add') {
            newPackageName = addTagToPackage(packageName, 'notweak');
        } else {
            newPackageName = removeTagFromPackage(packageName, 'notweak');
        }
        
        const hasWithCpu = hasWithCpuTag(newPackageName);
        const hasBlocked = hasBlockedTag(newPackageName);
        if (hasWithCpu && hasBlocked) {
            newPackageName = removeBlockedTag(newPackageName);
        }
        
        currentConfig[deviceKey][packageIndex] = newPackageName;
        await saveConfig();
        appendToOutput(
            `${action === 'add' ? 'Added' : 'Removed'} no-tweaks tag for ${cleanPackageName}`,
            'success'
        );
        return true;
    } catch (error) {
        appendToOutput(`Failed to update package: ${error}`, 'error');
        return false;
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

function attachGameListeners() {
    document.querySelectorAll('.game-card:not(.cpu-spoof-card) .edit-btn').forEach(btn => {
        btn.removeEventListener('click', editGameHandler);
        btn.addEventListener('click', editGameHandler);
    });
    document.querySelectorAll('.game-card:not(.cpu-spoof-card) .delete-btn').forEach(btn => {
        btn.removeEventListener('click', deleteGameHandler);
        btn.addEventListener('click', deleteGameHandler);
    });
    
    document.querySelectorAll('.game-card.cpu-spoof-card .edit-btn').forEach(btn => {
        btn.removeEventListener('click', editCpuSpoofGameHandler);
        btn.addEventListener('click', editCpuSpoofGameHandler);
    });
    document.querySelectorAll('.game-card.cpu-spoof-card .delete-btn').forEach(btn => {
        btn.removeEventListener('click', deleteCpuSpoofGameHandler);
        btn.addEventListener('click', deleteCpuSpoofGameHandler);
    });
}

function editGameHandler(e) {
    editGame(e.currentTarget.dataset.game, e.currentTarget.dataset.device);
}

function deleteGameHandler(e) {
    const gamePackage = e.currentTarget.dataset.game;
    const cleanPackageName = getPackageNameWithoutTags(gamePackage);
    const gameName = e.currentTarget.closest('.game-card').querySelector('.game-name').textContent;
    const deviceName = e.currentTarget.closest('.game-card').querySelector('.game-info').textContent;
    deleteGame(gamePackage, e.currentTarget.dataset.device, gameName, deviceName, cleanPackageName);
}

function editCpuSpoofGameHandler(e) {
    e.stopPropagation();
    const packageName = e.currentTarget.dataset.package;
    const type = e.currentTarget.dataset.type;
    editGame(packageName, null, type);
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

function editGame(gamePackage, deviceKey) {
    openGameModal(gamePackage, deviceKey);
}

function openGameModal(gamePackage = null, deviceKey = null, gameType = null) {
    const modal = document.getElementById('game-modal');
    const title = document.getElementById('game-modal-title');
    const form = document.getElementById('game-form');
    const packageInput = document.getElementById('game-package');
    const gameNameInput = document.getElementById('game-name');
    const typeInput = document.getElementById('game-type');
    const deviceInput = document.getElementById('game-device');
    const deviceGroup = document.getElementById('device-select-group');
    
    form.querySelectorAll('input').forEach(field => {
        field.classList.remove('error');
        let nextSibling = field.nextElementSibling;
        while (nextSibling && nextSibling.classList.contains('error-message')) {
            nextSibling.remove();
            nextSibling = field.nextElementSibling;
        }
    });

    let disableTweaksContainer = document.getElementById('disable-tweaks-container');
    if (!disableTweaksContainer) {
        disableTweaksContainer = document.createElement('div');
        disableTweaksContainer.id = 'disable-tweaks-container';
        disableTweaksContainer.className = 'form-group disable-tweaks-group';
        disableTweaksContainer.innerHTML = `
            <div class="toggle-wrapper">
                <label class="toggle-label" for="disable-tweaks-toggle">
                    <span>Disable Tweaks</span>
                    <span class="badge-container">
                        <span class="no-tweaks-badge modal-badge">No Tweaks</span>
                    </span>
                </label>
                <label class="switch small-switch">
                    <input type="checkbox" id="disable-tweaks-toggle">
                    <span class="slider"></span>
                </label>
            </div>
        `;
        const deviceGroup = document.getElementById('device-select-group');
        if (deviceGroup) {
            deviceGroup.after(disableTweaksContainer);
        } else {
            const formButtons = form.querySelector('.form-buttons');
            if (formButtons) {
                formButtons.before(disableTweaksContainer);
            }
        }
    }
    
    let cpuSpoofContainer = document.getElementById('cpu-spoof-container');
    if (!cpuSpoofContainer) {
        cpuSpoofContainer = document.createElement('div');
        cpuSpoofContainer.id = 'cpu-spoof-container';
        cpuSpoofContainer.className = 'form-group disable-tweaks-group';
        cpuSpoofContainer.innerHTML = `
            <div class="toggle-wrapper">
                <label class="toggle-label" for="cpu-spoof-toggle">
                    <span>With CPU Spoofing</span>
                    <span class="badge-container">
                        <span class="with-cpu-badge modal-badge">With CPU</span>
                    </span>
                </label>
                <label class="switch small-switch">
                    <input type="checkbox" id="cpu-spoof-toggle">
                    <span class="slider"></span>
                </label>
            </div>
        `;
        disableTweaksContainer.after(cpuSpoofContainer);
    }
    
    let blockCpuContainer = document.getElementById('block-cpu-container');
    if (!blockCpuContainer) {
        blockCpuContainer = document.createElement('div');
        blockCpuContainer.id = 'block-cpu-container';
        blockCpuContainer.className = 'form-group disable-tweaks-group';
        blockCpuContainer.innerHTML = `
            <div class="toggle-wrapper">
                <label class="toggle-label" for="block-cpu-toggle">
                    <span>Block CPU Spoofing</span>
                    <span class="badge-container">
                        <span class="blocked-cpu-badge modal-badge">Block CPU</span>
                    </span>
                </label>
                <label class="switch small-switch">
                    <input type="checkbox" id="block-cpu-toggle">
                    <span class="slider"></span>
                </label>
            </div>
        `;
        cpuSpoofContainer.after(blockCpuContainer);
    }
    
    const disableTweaksToggle = document.getElementById('disable-tweaks-toggle');
    const cpuSpoofToggle = document.getElementById('cpu-spoof-toggle');
    const blockCpuToggle = document.getElementById('block-cpu-toggle');
    const disableTweaksGroup = document.querySelector('.disable-tweaks-group');
    const cpuSpoofGroup = cpuSpoofContainer;
    const blockCpuGroup = blockCpuContainer;
    
    const handleToggleConflicts = () => {
        if (cpuSpoofToggle.checked && blockCpuToggle.checked) {
            blockCpuToggle.checked = false;
        }
        updateModalBadges(disableTweaksToggle, cpuSpoofToggle, blockCpuToggle);
    };
    
    if (gamePackage) {
        title.textContent = 'Edit Game Configuration';
        
        const cleanPackageName = getPackageNameWithoutTags(gamePackage);
        packageInput.value = cleanPackageName;
        
        let detectedType = 'device';
        if (gameType) {
            detectedType = gameType;
        } else {
            const cpuSpoofData = currentConfig.cpu_spoof || {};
            const blockedList = cpuSpoofData.blacklist || [];
            const cpuOnlyList = cpuSpoofData.cpu_only_packages || [];
            
            if (blockedList.includes(cleanPackageName)) {
                detectedType = 'blocked';
            } else if (cpuOnlyList.includes(cleanPackageName)) {
                detectedType = 'cpu_only';
            } else if (deviceKey) {
                detectedType = 'device';
            }
        }
        
        editingGame = { 
            package: gamePackage, 
            device: deviceKey,
            type: detectedType 
        };
        
        selectedGameType = detectedType;
        typeInput.value = getTypeDisplayName(detectedType);
        typeInput.dataset.type = detectedType;
        typeInput.classList.add('highlighted');
        
        const hasWithCpu = hasWithCpuTag(gamePackage);
        const hasBlocked = hasBlockedTag(gamePackage);
        
        cpuSpoofToggle.checked = hasWithCpu;
        blockCpuToggle.checked = hasBlocked;
        handleToggleConflicts();
        
        if (detectedType === 'device' && deviceKey) {
            deviceInput.value = currentConfig[`${deviceKey}_DEVICE`]?.DEVICE || '';
            deviceInput.dataset.key = `${deviceKey}_DEVICE`;
            deviceInput.classList.add('highlighted');
            deviceGroup.classList.remove('disabled');
            disableTweaksGroup.classList.remove('disabled');
            cpuSpoofGroup.classList.remove('disabled');
            blockCpuGroup.classList.remove('disabled');
            cpuSpoofToggle.disabled = false;
            blockCpuToggle.disabled = false;
        } else if (detectedType === 'cpu_only') {
            deviceGroup.classList.add('disabled');
            deviceInput.value = '';
            deviceInput.dataset.key = '';
            deviceInput.classList.remove('highlighted');
            disableTweaksGroup.classList.remove('disabled');
            cpuSpoofGroup.classList.add('disabled');
            blockCpuGroup.classList.add('disabled');
            cpuSpoofToggle.disabled = true;
            blockCpuToggle.disabled = true;
            cpuSpoofToggle.checked = false;
            blockCpuToggle.checked = false;
            updateModalBadges(disableTweaksToggle, cpuSpoofToggle, blockCpuToggle);
        } else if (detectedType === 'blocked') {
            deviceGroup.classList.add('disabled');
            deviceInput.value = '';
            deviceInput.dataset.key = '';
            deviceInput.classList.remove('highlighted');
            disableTweaksGroup.classList.add('disabled');
            cpuSpoofGroup.classList.add('disabled');
            blockCpuGroup.classList.add('disabled');
            disableTweaksToggle.disabled = true;
            cpuSpoofToggle.disabled = true;
            blockCpuToggle.disabled = true;
            disableTweaksToggle.checked = false;
            cpuSpoofToggle.checked = false;
            blockCpuToggle.checked = false;
            updateModalBadges(disableTweaksToggle, cpuSpoofToggle, blockCpuToggle);
        }
        
        execCommand("cat /data/adb/modules/COPG/list.json")
            .then(content => {
                const listData = JSON.parse(content);
                if (listData[cleanPackageName]) {
                    gameNameInput.value = listData[cleanPackageName];
                }
            })
            .catch(error => {
                console.error("Failed to load game names:", error);
            });
            
    } else {
        title.textContent = 'Add New Game';
        editingGame = null;
        form.reset();
        selectedGameType = 'device';
        typeInput.value = getTypeDisplayName('device');
        typeInput.dataset.type = 'device';
        typeInput.classList.add('highlighted');
        
        deviceGroup.classList.remove('disabled');
        disableTweaksGroup.classList.remove('disabled');
        cpuSpoofGroup.classList.remove('disabled');
        blockCpuGroup.classList.remove('disabled');
        disableTweaksToggle.checked = false;
        cpuSpoofToggle.checked = false;
        blockCpuToggle.checked = false;
        cpuSpoofToggle.disabled = false;
        blockCpuToggle.disabled = false;
        updateModalBadges(disableTweaksToggle, cpuSpoofToggle, blockCpuToggle);
        
        deviceInput.value = '';
        deviceInput.dataset.key = '';
        deviceInput.classList.remove('highlighted');
        deviceInput.placeholder = 'Select a device...';
    }
    
    disableTweaksToggle.addEventListener('change', () => {
        updateModalBadges(disableTweaksToggle, cpuSpoofToggle, blockCpuToggle);
    });
    
    cpuSpoofToggle.addEventListener('change', () => {
        handleToggleConflicts();
    });
    
    blockCpuToggle.addEventListener('change', () => {
        if (blockCpuToggle.checked && cpuSpoofToggle.checked) {
            cpuSpoofToggle.checked = false;
        }
        handleToggleConflicts();
    });
    
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
    const gamePackageInput = document.getElementById('game-package').value.trim();
    const gameNameInput = document.getElementById('game-name');
    const gameName = gameNameInput.value.trim() || gamePackageInput;
    const typeInput = document.getElementById('game-type');
    const deviceInput = document.getElementById('game-device');
    const disableTweaksToggle = document.getElementById('disable-tweaks-toggle');
    const cpuSpoofToggle = document.getElementById('cpu-spoof-toggle');
    const blockCpuToggle = document.getElementById('block-cpu-toggle');
    
    const selectedType = typeInput.dataset.type;
    const newDeviceKey = deviceInput.dataset.key;
    const disableTweaks = disableTweaksToggle ? disableTweaksToggle.checked : false;
    const withCpuSpoof = cpuSpoofToggle ? cpuSpoofToggle.checked : false;
    const blockCpuSpoof = blockCpuToggle ? blockCpuToggle.checked : false;
    
    form.querySelectorAll('input').forEach(field => {
        field.classList.remove('error');
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('error-message')) {
            existingError.remove();
        }
    });
    
    let hasError = false;
    const missingFields = [];
    
    if (!gamePackageInput) {
        const field = document.getElementById('game-package');
        field.classList.add('error');
        const errorMessage = document.createElement('span');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'This field is required';
        field.insertAdjacentElement('afterend', errorMessage);
        hasError = true;
        missingFields.push('Package Name');
    }
    
    if (!selectedType) {
        typeInput.classList.add('error');
        const errorMessage = document.createElement('span');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Please select a spoofing type';
        typeInput.insertAdjacentElement('afterend', errorMessage);
        hasError = true;
        missingFields.push('Spoofing Type');
    }
    
    if (selectedType === 'device' && !newDeviceKey) {
        deviceInput.classList.add('error');
        const errorMessage = document.createElement('span');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Please select a device';
        deviceInput.insertAdjacentElement('afterend', errorMessage);
        hasError = true;
        missingFields.push('Device Profile');
    }
    
    if (selectedType === 'device' && withCpuSpoof && blockCpuSpoof) {
        document.getElementById('error-message').textContent = 'Cannot enable both "With CPU Spoofing" and "Block CPU Spoofing" at the same time';
        showPopup('error-popup');
        hasError = true;
    }
    
    const cleanPackageForCheck = getPackageNameWithoutTags(gamePackageInput);
    
    let duplicateLocation = '';
    
    if (editingGame) {
        const oldCleanPackage = getPackageNameWithoutTags(editingGame.package);
        if (oldCleanPackage !== cleanPackageForCheck) {
            const cpuSpoofData = currentConfig.cpu_spoof || {};
            const blockedList = cpuSpoofData.blacklist || [];
            const cpuOnlyList = cpuSpoofData.cpu_only_packages || [];
            
            for (const blockedPackage of blockedList) {
                if (getPackageNameWithoutTags(blockedPackage) === cleanPackageForCheck) {
                    duplicateLocation = 'blocklist';
                    break;
                }
            }
            
            if (!duplicateLocation) {
                for (const cpuPackage of cpuOnlyList) {
                    if (getPackageNameWithoutTags(cpuPackage) === cleanPackageForCheck) {
                        duplicateLocation = 'CPU only list';
                        break;
                    }
                }
            }
            
            if (!duplicateLocation) {
                for (const [key, value] of Object.entries(currentConfig)) {
                    if (Array.isArray(value) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
                        for (const pkg of value) {
                            if (getPackageNameWithoutTags(pkg) === cleanPackageForCheck) {
                                duplicateLocation = `device "${currentConfig[`${key}_DEVICE`]?.DEVICE || key}"`;
                                break;
                            }
                        }
                        if (duplicateLocation) break;
                    }
                }
            }
            
            if (duplicateLocation) {
                const field = document.getElementById('game-package');
                field.classList.add('error');
                let parentError = field.parentNode.nextElementSibling;
                while (parentError && parentError.classList.contains('error-message')) {
                    parentError.remove();
                    parentError = field.parentNode.nextElementSibling;
                }
                
                const errorMessage = document.createElement('span');
                errorMessage.className = 'error-message';
                errorMessage.textContent = `Game package already exists in ${duplicateLocation}`;
                field.parentNode.insertAdjacentElement('afterend', errorMessage);
                
                hasError = true;
                missingFields.push('Package Name (duplicate)');
                document.getElementById('error-message').textContent = `Game package already exists in ${duplicateLocation}`;
                showPopup('error-popup');
            }
        }
    } else {
        const cpuSpoofData = currentConfig.cpu_spoof || {};
        const blockedList = cpuSpoofData.blacklist || [];
        const cpuOnlyList = cpuSpoofData.cpu_only_packages || [];
        
        for (const blockedPackage of blockedList) {
            if (getPackageNameWithoutTags(blockedPackage) === cleanPackageForCheck) {
                duplicateLocation = 'blocklist';
                break;
            }
        }
        
        if (!duplicateLocation) {
            for (const cpuPackage of cpuOnlyList) {
                if (getPackageNameWithoutTags(cpuPackage) === cleanPackageForCheck) {
                    duplicateLocation = 'CPU only list';
                    break;
                }
            }
        }
        
        if (!duplicateLocation) {
            for (const [key, value] of Object.entries(currentConfig)) {
                if (Array.isArray(value) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
                    for (const pkg of value) {
                        if (getPackageNameWithoutTags(pkg) === cleanPackageForCheck) {
                            duplicateLocation = `device "${currentConfig[`${key}_DEVICE`]?.DEVICE || key}"`;
                            break;
                        }
                    }
                    if (duplicateLocation) break;
                }
            }
        }
        
        if (duplicateLocation) {
            const field = document.getElementById('game-package');
            field.classList.add('error');
            let parentError = field.parentNode.nextElementSibling;
            while (parentError && parentError.classList.contains('error-message')) {
                parentError.remove();
                parentError = field.parentNode.nextElementSibling;
            }
            
            const errorMessage = document.createElement('span');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Game package already exists in ${duplicateLocation}`;
            field.parentNode.insertAdjacentElement('afterend', errorMessage);
            
            hasError = true;
            missingFields.push('Package Name (duplicate)');
            document.getElementById('error-message').textContent = `Game package already exists in ${duplicateLocation}`;
            showPopup('error-popup');
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
    
    try {
        if (!currentConfig.cpu_spoof) {
            currentConfig.cpu_spoof = {
                blacklist: [],
                cpu_only_packages: []
            };
            if (!configKeyOrder.includes('cpu_spoof')) {
                configKeyOrder.push('cpu_spoof');
            }
        }
        
        try {
            const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
            let listData = JSON.parse(listContent);
            if (editingGame) {
                const oldCleanPackage = getPackageNameWithoutTags(editingGame.package);
                if (oldCleanPackage !== cleanPackageForCheck) {
                    delete listData[oldCleanPackage];
                }
            }
            listData[cleanPackageForCheck] = gameName;
            await execCommand(`echo '${JSON.stringify(listData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
        } catch (error) {
            appendToOutput("Failed to update game names list: " + error, 'warning');
        }
        
        let finalPackageName = gamePackageInput;
        if (disableTweaks && selectedType !== 'blocked') {
            finalPackageName = addTagToPackage(finalPackageName, 'notweak');
        }
        
        if (withCpuSpoof && selectedType === 'device') {
            finalPackageName = addCpuSpoofTag(finalPackageName);
        }
        
        if (blockCpuSpoof && selectedType === 'device') {
            finalPackageName = addBlockedTag(finalPackageName);
        }
        
        const oldCleanPackage = editingGame ? getPackageNameWithoutTags(editingGame.package) : null;
        const oldDeviceKey = editingGame ? editingGame.device : null;
        const oldGameType = editingGame ? editingGame.type : null;
        
        const cpuSpoofData = currentConfig.cpu_spoof;
        const blockedList = cpuSpoofData.blacklist || [];
        const cpuOnlyList = cpuSpoofData.cpu_only_packages || [];
        
        let originalPosition = -1;
        let originalList = null;
        
        if (editingGame) {
            if (oldGameType === 'blocked') {
                originalPosition = blockedList.findIndex(pkg => getPackageNameWithoutTags(pkg) === oldCleanPackage);
                originalList = 'blocked';
            } else if (oldGameType === 'cpu_only') {
                originalPosition = cpuOnlyList.findIndex(pkg => getPackageNameWithoutTags(pkg) === oldCleanPackage);
                originalList = 'cpu_only';
            } else if (oldGameType === 'device' && oldDeviceKey) {
                const oldPackageList = currentConfig[oldDeviceKey];
                if (Array.isArray(oldPackageList)) {
                    originalPosition = oldPackageList.findIndex(pkg => getPackageNameWithoutTags(pkg) === oldCleanPackage);
                    originalList = oldDeviceKey;
                }
            }
        }
        
        if (oldCleanPackage) {
            const blockedIndex = blockedList.findIndex(pkg => getPackageNameWithoutTags(pkg) === oldCleanPackage);
            const cpuOnlyIndex = cpuOnlyList.findIndex(pkg => getPackageNameWithoutTags(pkg) === oldCleanPackage);
            
            if (blockedIndex !== -1 && selectedType !== 'blocked') {
                blockedList.splice(blockedIndex, 1);
                appendToOutput(`Removed package from blocklist`, 'info');
            }
            
            if (cpuOnlyIndex !== -1 && selectedType !== 'cpu_only') {
                cpuOnlyList.splice(cpuOnlyIndex, 1);
                appendToOutput(`Removed package from CPU only list`, 'info');
            }
        }
        
        if (oldDeviceKey && selectedType !== 'device') {
            const oldPackageList = currentConfig[oldDeviceKey];
            if (Array.isArray(oldPackageList)) {
                const oldIndex = oldPackageList.findIndex(pkg => getPackageNameWithoutTags(pkg) === oldCleanPackage);
                if (oldIndex !== -1) {
                    oldPackageList.splice(oldIndex, 1);
                    appendToOutput(`Removed package from old device "${oldDeviceKey}"`, 'info');
                }
            }
        } else if (selectedType === 'device' && oldDeviceKey && oldDeviceKey !== newDeviceKey.replace('_DEVICE', '')) {
            const oldPackageList = currentConfig[oldDeviceKey];
            if (Array.isArray(oldPackageList)) {
                const oldIndex = oldPackageList.findIndex(pkg => getPackageNameWithoutTags(pkg) === oldCleanPackage);
                if (oldIndex !== -1) {
                    oldPackageList.splice(oldIndex, 1);
                    appendToOutput(`Removed package from old device "${oldDeviceKey}"`, 'info');
                }
            }
        }
        
        if (selectedType === 'device') {
            const packageKey = newDeviceKey.replace('_DEVICE', '');
            if (!Array.isArray(currentConfig[packageKey])) {
                currentConfig[packageKey] = [];
                if (!configKeyOrder.includes(packageKey)) {
                    const deviceIndex = configKeyOrder.indexOf(newDeviceKey);
                    if (deviceIndex !== -1) {
                        configKeyOrder.splice(deviceIndex, 0, packageKey);
                    } else {
                        configKeyOrder.push(packageKey);
                    }
                }
            }
            
            const newPackageList = currentConfig[packageKey];
            
            const existingIndex = newPackageList.findIndex(pkg => getPackageNameWithoutTags(pkg) === getPackageNameWithoutTags(finalPackageName));
            if (existingIndex !== -1) {
                newPackageList.splice(existingIndex, 1);
            }
            
            if (editingGame && originalList === packageKey && originalPosition !== -1) {
                newPackageList.splice(originalPosition, 0, finalPackageName);
                appendToOutput(`Updated game "${gameName}" at position ${originalPosition + 1} in "${currentConfig[newDeviceKey].DEVICE}"`, 'success');
            } else {
                newPackageList.push(finalPackageName);
                
                let tweaksMessage = '';
                if (disableTweaks && withCpuSpoof) {
                    tweaksMessage = 'with no tweaks and CPU spoofing';
                } else if (disableTweaks && blockCpuSpoof) {
                    tweaksMessage = 'with no tweaks and CPU spoofing blocked';
                } else if (disableTweaks) {
                    tweaksMessage = 'with no tweaks';
                } else if (withCpuSpoof) {
                    tweaksMessage = 'with CPU spoofing';
                } else if (blockCpuSpoof) {
                    tweaksMessage = 'with CPU spoofing blocked';
                } else {
                    tweaksMessage = 'with all tweaks';
                }
                
                appendToOutput(`Game "${gameName}" ${editingGame ? 'updated' : 'added'} to "${currentConfig[newDeviceKey].DEVICE}" ${tweaksMessage}`, 'success');
            }
            
        } else if (selectedType === 'cpu_only') {
            const existingIndex = cpuOnlyList.findIndex(pkg => getPackageNameWithoutTags(pkg) === getPackageNameWithoutTags(finalPackageName));
            if (existingIndex !== -1) {
                cpuOnlyList.splice(existingIndex, 1);
            }
            
            if (editingGame && originalList === 'cpu_only' && originalPosition !== -1) {
                cpuOnlyList.splice(originalPosition, 0, finalPackageName);
                appendToOutput(`Updated game "${gameName}" at position ${originalPosition + 1} in CPU only list`, 'success');
            } else {
                cpuOnlyList.push(finalPackageName);
                
                let tweaksMessage = disableTweaks ? 'with no tweaks' : 'with all tweaks';
                appendToOutput(`Game "${gameName}" ${editingGame ? 'updated' : 'added'} to CPU only spoofing ${tweaksMessage}`, 'success');
            }
            
        } else if (selectedType === 'blocked') {
            const existingIndex = blockedList.findIndex(pkg => getPackageNameWithoutTags(pkg) === getPackageNameWithoutTags(cleanPackageForCheck));
            if (existingIndex !== -1) {
                blockedList.splice(existingIndex, 1);
            }
            
            if (editingGame && originalList === 'blocked' && originalPosition !== -1) {
                blockedList.splice(originalPosition, 0, cleanPackageForCheck);
                appendToOutput(`Updated game "${gameName}" at position ${originalPosition + 1} in blocklist`, 'success');
            } else {
                blockedList.push(cleanPackageForCheck);
                
                appendToOutput(`Game "${gameName}" ${editingGame ? 'updated' : 'added'} to blocklist`, 'success');
            }
        }
        
        await saveConfig();
        closeModal('game-modal');
        renderGameList();
        renderDeviceList();
        
    } catch (error) {
        appendToOutput(`Failed to save game: ${error}`, 'error');
        document.getElementById('error-message').textContent = `Failed to save game: ${error}`;
        showPopup('error-popup');
    }
}

function deleteCpuSpoofGameHandler(e) {
    e.stopPropagation();
    const packageName = e.currentTarget.dataset.package;
    const type = e.currentTarget.dataset.type;
    const card = e.currentTarget.closest('.game-card');
    const gameName = card.querySelector('.game-name').textContent;
    deleteCpuSpoofGame(packageName, type, gameName);
}

async function deleteCpuSpoofGame(packageName, type, gameName) {
    const card = document.querySelector(`.game-card.cpu-spoof-card[data-package="${packageName}"][data-type="${type}"]`);
    if (!card) return;

    card.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 400));

    const cleanPackageName = getPackageNameWithoutTags(packageName);
    const cpuSpoofData = currentConfig.cpu_spoof || {};
    
    let originalListData = {};
    try {
        const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
        originalListData = JSON.parse(listContent);
    } catch (error) {
        appendToOutput("Failed to load game names list: " + error, 'warning');
    }

    let originalPosition = -1;
    let originalPackage = null;
    
    if (type === 'blocked') {
        const blockedList = cpuSpoofData.blacklist || [];
        originalPosition = blockedList.findIndex(pkg => getPackageNameWithoutTags(pkg) === cleanPackageName);
        if (originalPosition !== -1) {
            originalPackage = blockedList[originalPosition];
            blockedList.splice(originalPosition, 1);
        }
    } else if (type === 'cpu_only') {
        const cpuOnlyList = cpuSpoofData.cpu_only_packages || [];
        originalPosition = cpuOnlyList.findIndex(pkg => getPackageNameWithoutTags(pkg) === cleanPackageName);
        if (originalPosition !== -1) {
            originalPackage = cpuOnlyList[originalPosition];
            cpuOnlyList.splice(originalPosition, 1);
        }
    }
    
    if (originalPosition === -1) {
        const displayPackageName = cleanPackageName;
        appendToOutput(`Package "${displayPackageName}" not found in ${type === 'blocked' ? 'blocklist' : 'CPU only list'}`, 'error');
        card.classList.remove('fade-out');
        return;
    }
    
    try {
        await saveConfig();
        try {
            const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
            let listData = JSON.parse(listContent);
            if (listData[cleanPackageName]) {
                delete listData[cleanPackageName];
                await execCommand(`echo '${JSON.stringify(listData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
            }
        } catch (error) {
            appendToOutput("Failed to update game names list: " + error, 'warning');
        }
        appendToOutput(`Removed "${cleanPackageName}" from ${type === 'blocked' ? 'blocklist' : 'CPU only list'}`, 'red');
    } catch (error) {
        appendToOutput(`Failed to delete game: ${error}`, 'error');
        if (type === 'blocked') {
            cpuSpoofData.blacklist.splice(originalPosition, 0, originalPackage);
        } else if (type === 'cpu_only') {
            cpuSpoofData.cpu_only_packages.splice(originalPosition, 0, originalPackage);
        }
        card.classList.remove('fade-out');
        renderGameList();
        return;
    }

    renderGameList();
    
    const undoData = {
        type: type,
        package: originalPackage,
        position: originalPosition,
        cleanPackageName: cleanPackageName
    };
    
    const typeName = type === 'blocked' ? 'blocklist' : 'CPU only list';
    showSnackbar(`Removed "${gameName || cleanPackageName}" from ${typeName}`, async (undoData) => {
        if (undoData.type === 'blocked') {
            cpuSpoofData.blacklist.splice(undoData.position, 0, undoData.package);
        } else if (undoData.type === 'cpu_only') {
            cpuSpoofData.cpu_only_packages.splice(undoData.position, 0, undoData.package);
        }
        
        try {
            await saveConfig();
            try {
                await execCommand(`echo '${JSON.stringify(originalListData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
            } catch (error) {
                appendToOutput("Failed to restore game names list: " + error, 'warning');
            }
            appendToOutput(`Restored game "${undoData.cleanPackageName}" to ${typeName} at position ${undoData.position + 1}`, 'success');
            renderGameList();
            
            setTimeout(() => {
                const restoredCard = document.querySelector(`.game-card.cpu-spoof-card[data-package="${packageName}"][data-type="${type}"]`);
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
            if (undoData.type === 'blocked') {
                const index = cpuSpoofData.blacklist.indexOf(undoData.package);
                if (index !== -1) cpuSpoofData.blacklist.splice(index, 1);
            } else if (undoData.type === 'cpu_only') {
                const index = cpuSpoofData.cpu_only_packages.indexOf(undoData.package);
                if (index !== -1) cpuSpoofData.cpu_only_packages.splice(index, 1);
            }
            await saveConfig();
            renderGameList();
        }
    }, undoData);
}

function showSnackbar(message, onUndo, undoData = null) {
    const snackbar = document.getElementById('snackbar');
    const messageElement = document.getElementById('snackbar-message');
    const undoButton = document.getElementById('snackbar-undo');

    resetSnackbar();

    messageElement.textContent = message;
    snackbar.classList.add('show');
    snackbar.style.transform = 'translateY(0)';
    snackbar.style.opacity = '1';

    const newUndoButton = undoButton.cloneNode(true);
    undoButton.parentNode.replaceChild(newUndoButton, undoButton);

    newUndoButton.addEventListener('click', () => {
        if (onUndo) {
            if (undoData) {
                onUndo(undoData);
            } else {
                onUndo();
            }
        }
        resetSnackbar();
    });

    let touchStartX = 0;
    let touchMoveX = 0;
    const swipeThreshold = 100;

    const handleTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        snackbar.style.transition = 'none';
        snackbar.classList.remove('show-timer');
    };

    const handleTouchMove = (e) => {
        touchMoveX = e.touches[0].clientX;
        const diffX = touchMoveX - touchStartX;
        snackbar.style.transform = `translateX(${diffX}px) translateY(0)`;
        snackbar.style.opacity = Math.max(0.2, 1 - Math.abs(diffX) / window.innerWidth);
    };

    const handleTouchEnd = () => {
        const diffX = touchMoveX - touchStartX;
        snackbar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

        if (Math.abs(diffX) > swipeThreshold) {
            const direction = diffX > 0 ? '100%' : '-100%';
            snackbar.style.transform = `translateX(${direction}) translateY(0)`;
            snackbar.style.opacity = '0';
            snackbar.addEventListener('transitionend', resetSnackbar, { once: true });
        } else {
            snackbar.style.transform = 'translateY(0)';
            snackbar.style.opacity = '1';
            restartTimerAnimation();
        }

        snackbar.removeEventListener('touchstart', handleTouchStart);
        snackbar.removeEventListener('touchmove', handleTouchMove);
        snackbar.removeEventListener('touchend', handleTouchEnd);
    };

    snackbar.addEventListener('touchstart', handleTouchStart, { passive: true });
    snackbar.addEventListener('touchmove', handleTouchMove, { passive: true });
    snackbar.addEventListener('touchend', handleTouchEnd);

    restartTimerAnimation();

    function resetSnackbar() {
        snackbar.classList.remove('show', 'show-timer');
        snackbar.style.transform = 'translateY(100px)';
        snackbar.style.opacity = '0';
        snackbar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        if (snackbarTimeout) {
            clearTimeout(snackbarTimeout);
            snackbarTimeout = null;
        }
    }

    function restartTimerAnimation() {
        snackbar.classList.remove('show-timer');
        void snackbar.offsetWidth;
        snackbar.classList.add('show-timer');
        snackbarTimeout = setTimeout(resetSnackbar, 5000);
    }
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

async function deleteGame(gamePackage, deviceKey, gameName, deviceName, cleanPackageName = null) {
    const card = document.querySelector(`.game-card[data-package="${gamePackage}"][data-device="${deviceKey}"]`);
    if (!card) return;

    card.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 400));

    const cleanPackage = cleanPackageName || getPackageNameWithoutTags(gamePackage);
    const originalIndex = currentConfig[deviceKey].indexOf(gamePackage);
    
    if (originalIndex === -1) {
        const displayPackageName = cleanPackage;
        appendToOutput(`Game "${gameName || displayPackageName}" not found in "${deviceName}"`, 'error');
        card.classList.remove('fade-out');
        return;
    }

    const deletedGameData = {
        package: gamePackage,
        deviceKey: deviceKey,
        position: originalIndex,
        cleanPackage: cleanPackage
    };

    let originalListData = {};
    try {
        const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
        originalListData = JSON.parse(listContent);
    } catch (error) {
        appendToOutput("Failed to load game names list: " + error, 'warning');
    }

    currentConfig[deviceKey].splice(originalIndex, 1);
    
    try {
        await saveConfig();
        try {
            const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
            let listData = JSON.parse(listContent);
            if (listData[cleanPackage]) {
                delete listData[cleanPackage];
                await execCommand(`echo '${JSON.stringify(listData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
            }
        } catch (error) {
            appendToOutput("Failed to update game names list: " + error, 'warning');
        }
        
        const displayPackageName = cleanPackage;
        appendToOutput(`Removed "${displayPackageName}" from "${deviceName}"`, 'red');
    } catch (error) {
        appendToOutput(`Failed to delete game: ${error}`, 'error');
        currentConfig[deviceKey].splice(originalIndex, 0, gamePackage);
        card.classList.remove('fade-out');
        renderGameList();
        renderDeviceList();
        return;
    }

    renderGameList();
    renderDeviceList();

    const displayPackageName = cleanPackage;
    showSnackbar(`Removed "${gameName || displayPackageName}" from "${deviceName}"`, async (undoData) => {
        if (!Array.isArray(currentConfig[undoData.deviceKey])) {
            currentConfig[undoData.deviceKey] = [];
        }
        
        currentConfig[undoData.deviceKey].splice(undoData.position, 0, undoData.package);
        
        try {
            await saveConfig();
            try {
                await execCommand(`echo '${JSON.stringify(originalListData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
            } catch (error) {
                appendToOutput("Failed to restore game names list: " + error, 'warning');
            }
            
            appendToOutput(`Restored game "${undoData.cleanPackage}" to "${deviceName}" at position ${undoData.position + 1}`, 'success');
            renderDeviceList();
            renderGameList();
            
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
            currentConfig[undoData.deviceKey].splice(undoData.position, 1);
            await saveConfig();
            renderDeviceList();
            renderGameList();
        }
    }, deletedGameData);
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

    let originalListData = {};
    try {
        const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
        originalListData = JSON.parse(listContent);
    } catch (error) {
        appendToOutput("Failed to load game names list during device deletion: " + error, 'warning');
    }

    try {
        const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
        let listData = JSON.parse(listContent);
        if (deletedPackageData.length > 0) {
            deletedPackageData.forEach(pkg => {
                const cleanPkg = getPackageNameWithoutTags(pkg);
                if (listData[cleanPkg]) {
                    delete listData[cleanPkg];
                }
            });
            await execCommand(`echo '${JSON.stringify(listData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
        }
    } catch (error) {
        appendToOutput("Failed to update game names list during device deletion: " + error, 'warning');
    }

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
        
        try {
            await execCommand(`echo '${JSON.stringify(originalListData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
        } catch (listError) {
            appendToOutput("Failed to restore game names list after failed deletion: " + listError, 'warning');
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
            try {
                await execCommand(`echo '${JSON.stringify(originalListData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
            } catch (error) {
                appendToOutput("Failed to restore game names list: " + error, 'warning');
            }
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
            
            try {
                const listContent = await execCommand("cat /data/adb/modules/COPG/list.json");
                let listData = JSON.parse(listContent);
                deletedPackageData.forEach(pkg => {
                    const cleanPkg = getPackageNameWithoutTags(pkg);
                    delete listData[cleanPkg];
                });
                await execCommand(`echo '${JSON.stringify(listData, null, 2).replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/list.json`);
            } catch (listError) {
                appendToOutput("Failed to clean up game names list after failed restoration: " + listError, 'warning');
            }
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
        
        await execCommand(`echo '${configStr.replace(/'/g, "'\\''")}' > /data/adb/modules/COPG/COPG.json`);
        await execCommand(`su -c 'chmod 644 /data/adb/modules/COPG/COPG.json'`);
        
        try {
            await execCommand(`su -c 'chcon u:object_r:system_file:s0 /data/adb/modules/COPG/COPG.json'`);
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
    
    document.getElementById('game-type').addEventListener('click', () => {
        showGameTypePicker();
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

    document.getElementById('game-type').addEventListener('click', () => {
        showGameTypePicker();
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

    document.getElementById('game-search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.game-card').forEach(card => {
        const packageName = card.dataset.package ? card.dataset.package.toLowerCase() : '';
        const deviceKey = card.dataset.device;
        const type = card.dataset.type;
        
        let deviceData = {};
        if (deviceKey) {
            const deviceKeyFull = `${deviceKey}_DEVICE`;
            deviceData = currentConfig[deviceKeyFull] || {};
        }
        
        const gameName = card.querySelector('.game-name').textContent.toLowerCase();
        
        let searchableText = '';
        if (type) {
            searchableText = [
                gameName, 
                packageName,
                type === 'blocked' ? 'global blocklist blocked globally' : '',
                type === 'cpu_only' ? 'cpu only cpu' : ''
            ].join(' ');
        } else {
            searchableText = [
                gameName, 
                packageName, 
                deviceData.DEVICE?.toLowerCase() || '', 
                deviceData.BRAND?.toLowerCase() || '', 
                deviceData.MODEL?.toLowerCase() || '',
                deviceData.PRODUCT?.toLowerCase() || ''
                deviceData.MANUFACTURER?.toLowerCase() || '',
                deviceData.FINGERPRINT?.toLowerCase() || '', 
                deviceData.BOARD?.toLowerCase() || '',
                deviceData.BOOTLOADER?.toLowerCase() || '',
                deviceData.HARDWARE?.toLowerCase() || '',
                deviceData.ID?.toLowerCase() || '',
                deviceData.DISPLAY?.toLowerCase() || '',
                deviceData.HOST?.toLowerCase() || ''
            ].join(' ');
        }

        const matchesSearch = searchableText.includes(searchTerm);
        const matchesFilter = shouldShowByCurrentFilter(card);
        
        card.style.display = (matchesSearch && matchesFilter) ? 'block' : 'none';
    });
    
    sortGameList();
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

    setupSwipeNavigation();
}

document.getElementById('game-package').addEventListener('input', (e) => {
    const packageInput = e.target;
    const packageValue = packageInput.value.trim();
    
    packageInput.classList.remove('error');
    let nextSibling = packageInput.nextElementSibling;
    while (nextSibling && nextSibling.classList.contains('error-message')) {
        nextSibling.remove();
        nextSibling = packageInput.nextElementSibling;
    }
    
    const parentNode = packageInput.parentNode;
    let parentError = parentNode.nextElementSibling;
    while (parentError && parentError.classList.contains('error-message')) {
        parentError.remove();
        parentError = parentNode.nextElementSibling;
    }
    
    if (packageValue) {
        const cleanPackageForCheck = getPackageNameWithoutTags(packageValue);
        if (!editingGame || getPackageNameWithoutTags(editingGame.package) !== cleanPackageForCheck) {
            for (const [key, value] of Object.entries(currentConfig)) {
                if (Array.isArray(value) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
                    for (const pkg of value) {
                        if (getPackageNameWithoutTags(pkg) === cleanPackageForCheck) {
                            packageInput.classList.add('error');
                            const errorMessage = document.createElement('span');
                            errorMessage.className = 'error-message';
                            errorMessage.textContent = 'Game package already exists';
                            parentNode.insertAdjacentElement('afterend', errorMessage);
                            break;
                        }
                    }
                    if (packageInput.classList.contains('error')) break;
                }
            }
        }
    }
});

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
    initializeGameSort(); 
    switchTab('settings');
});

const loadPackagePickerDependencies = async () => {
    if (typeof $packageManager !== 'undefined') {
        if (typeof wrapInputStream === 'undefined') {
            const { wrapInputStream } = await import("https://mui.kernelsu.org/internal/assets/ext/wrapInputStream.mjs");
            window.wrapInputStream = wrapInputStream;
        }
    }
};

async function detectAvailableAPI() {
    const apis = {
        'KernelSU New': typeof ksu !== 'undefined' && 
                      (typeof ksu.listPackages === 'function' || 
                       typeof ksu.getPackageInfo === 'function' ||
                       typeof ksu.getPackagesInfo === 'function'),
        'WebUI-X': typeof $packageManager !== 'undefined'
    };
    
    let availableAPI = null;
    for (const [apiName, isAvailable] of Object.entries(apis)) {
        if (isAvailable) {
            availableAPI = apiName;
            break;
        }
    }
    
    return availableAPI;
}

async function getInstalledPackagesNewKernelSU() {
    try {
        if (typeof ksu !== 'undefined' && typeof ksu.listPackages === 'function') {
            const packages = ksu.listPackages("all");
            if (packages) {
                if (Array.isArray(packages)) {
                    appendToOutput(`Loaded ${packages.length} packages using new KernelSU API`, 'success');
                    return packages;
                } else if (typeof packages === 'string') {
                    try {
                        const parsed = JSON.parse(packages);
                        if (Array.isArray(parsed)) {
                            appendToOutput(`Loaded ${parsed.length} packages using new KernelSU API`, 'success');
                            return parsed;
                        }
                    } catch (parseError) {
                        console.error('Failed to parse packages as JSON:', parseError);
                    }
                }
            }
        }
        
        return await getInstalledPackagesFallback();
    } catch (error) {
        console.error('Error in getInstalledPackagesNewKernelSU:', error);
        appendToOutput(`Failed to load packages with new KernelSU API: ${error}`, 'error');
        return await getInstalledPackagesFallback();
    }
}

async function getInstalledPackagesFallback() {
    try {
        if (typeof $packageManager !== 'undefined' && typeof $packageManager.getInstalledPackages === 'function') {
            const packages = JSON.parse($packageManager.getInstalledPackages(0, 0));
            if (packages && Array.isArray(packages)) {
                appendToOutput("Loaded packages using WebUI-X API (fallback)", 'info');
                return packages;
            }
        }
        
        if (typeof ksu !== 'undefined' && typeof ksu.listPackages === 'function') {
            const packages = ksu.listPackages("all");
            if (packages) {
                if (Array.isArray(packages)) {
                    appendToOutput("Loaded packages using KernelSU New API (fallback)", 'info');
                    return packages;
                } else if (typeof packages === 'string') {
                    try {
                        const parsed = JSON.parse(packages);
                        if (Array.isArray(parsed)) {
                            appendToOutput("Loaded packages using KernelSU New API (fallback)", 'info');
                            return parsed;
                        }
                    } catch (parseError) {
                        console.error('Failed to parse packages as JSON:', parseError);
                    }
                }
            }
        }
        
        const pmOutput = await execCommand("pm list packages | cut -d: -f2");
        const packages = pmOutput.trim().split('\n').filter(pkg => pkg.trim() !== '');
        appendToOutput("Loaded packages using pm command (fallback)", 'warning');
        return packages;
    } catch (error) {
        appendToOutput(`All API methods failed: ${error}`, 'error');
        throw error;
    }
}

function shouldShowByCurrentFilter(card) {
    if (!currentFilter) return true;
    
    switch(currentFilter) {
        case 'blocklist':
            return card.querySelector('.blocked-globally-badge') || 
                   card.querySelector('.blocked-badge');
        case 'cpu_only':
            return card.querySelector('.cpu-only-badge') || 
                   card.querySelector('.cpu-badge');
        case 'installed':
            return card.querySelector('.installed-badge');
        case 'no_tweaks':
            return card.querySelector('.no-tweaks-badge');
        default:
            return true;
    }
}

async function getPackageInfoNewKernelSU(packageName) {
    try {
        if (typeof ksu !== 'undefined' && typeof ksu.getPackageInfo !== 'undefined') {
            const info = ksu.getPackageInfo(packageName);
            if (info && typeof info === 'object') {
                return {
                    appLabel: info.appLabel || info.label || packageName,
                    packageName: packageName
                };
            }
        }
        
        if (typeof ksu !== 'undefined' && typeof ksu.getPackagesInfo !== 'undefined') {
            try {
                const infoJson = ksu.getPackagesInfo(JSON.stringify([packageName]));
                const infoArray = JSON.parse(infoJson);
                if (infoArray && infoArray[0]) {
                    return {
                        appLabel: infoArray[0].appLabel || infoArray[0].label || packageName,
                        packageName: packageName
                    };
                }
            } catch (parseError) {
                console.error('Failed to parse getPackagesInfo JSON:', parseError);
            }
        }
        
        if (typeof $packageManager !== 'undefined') {
            const info = $packageManager.getApplicationInfo(packageName, 0, 0);
            if (info) {
                return {
                    appLabel: info.getLabel() || packageName,
                    packageName: packageName
                };
            }
        }
        
        return { appLabel: packageName, packageName: packageName };
    } catch (error) {
        console.error(`Error getting package info for ${packageName}:`, error);
        return { appLabel: packageName, packageName: packageName };
    }
}

async function showPackagePicker() {
    appendToOutput("Loading package picker...", 'info');
    const popup = document.getElementById('package-picker-popup');
    const searchInput = document.getElementById('package-picker-search');
    const appList = document.getElementById('package-picker-list');
    
    searchInput.setAttribute('readonly', 'true');
    searchInput.value = '';
    appList.innerHTML = '<div class="loader" style="width: 100%; height: 40px; margin: 16px 0;"></div>';
    appIndex = [];

    const enableSearch = () => {
        searchInput.removeAttribute('readonly');
        searchInput.focus();
        searchContainer.removeEventListener('click', enableSearch);
    };
    const searchContainer = popup.querySelector('.search-container');
    searchContainer.addEventListener('click', enableSearch);

    try {
        const availableAPI = await detectAvailableAPI();
        appendToOutput(`Detected API: ${availableAPI || 'None, using fallback'}`, 'info');
        
        let pkgList = [];
        let apiUsed = '';
        
        if (availableAPI === 'KernelSU New') {
            try {
                pkgList = await getInstalledPackagesNewKernelSU();
                apiUsed = 'KernelSU New';
            } catch (error) {
                appendToOutput(`New KernelSU API failed: ${error}, trying fallback`, 'warning');
                pkgList = await getInstalledPackagesFallback();
                apiUsed = 'Fallback';
            }
        } else {
            pkgList = await getInstalledPackagesFallback();
            apiUsed = availableAPI || 'Fallback';
        }

        appendToOutput("Indexing apps for search...", 'info');

        for (const pkg of pkgList) {
            let label = pkg;
            try {
                if (apiUsed === 'KernelSU New') {
                    const info = await getPackageInfoNewKernelSU(pkg);
                    if (info && info.appLabel && info.appLabel !== pkg) {
                        label = info.appLabel || pkg;
                    }
                } else if (apiUsed === 'WebUI-X') {
                    if (typeof $packageManager !== 'undefined') {
                        const info = $packageManager.getApplicationInfo(pkg, 0, 0);
                        if (info && info.getLabel()) {
                            label = info.getLabel() || pkg;
                        }
                    }
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

        appIndex.sort((a, b) => a.label.localeCompare(b.label));
        const addedGames = [];
        
        for (const [key, value] of Object.entries(currentConfig)) {
            if (Array.isArray(value) && key.startsWith('PACKAGES_') && !key.endsWith('_DEVICE')) {
                value.forEach(gamePackage => {
                    const cleanPkg = getPackageNameWithoutTags(gamePackage);
                    if (!addedGames.includes(cleanPkg)) {
                        addedGames.push(cleanPkg);
                    }
                });
            }
        }
        
        const blockedGames = [];
        const cpuOnlyGames = [];
        const cpuSpoofData = currentConfig.cpu_spoof || {};
        const blockedList = cpuSpoofData.blacklist || [];
        const cpuOnlyList = cpuSpoofData.cpu_only_packages || [];
        
        blockedList.forEach(pkg => {
            const cleanPkg = getPackageNameWithoutTags(pkg);
            if (!blockedGames.includes(cleanPkg)) {
                blockedGames.push(cleanPkg);
            }
        });
        
        cpuOnlyList.forEach(pkg => {
            const cleanPkg = getPackageNameWithoutTags(pkg);
            if (!cpuOnlyGames.includes(cleanPkg)) {
                cpuOnlyGames.push(cleanPkg);
            }
        });

        appList.innerHTML = '';

        const fragment = document.createDocumentFragment();
        appIndex.forEach(app => {
            const isAdded = addedGames.includes(app.package);
            const isBlocked = blockedGames.includes(app.package);
            const isCpuOnly = cpuOnlyGames.includes(app.package);
            
            const appCard = templates.packagePickerCard({
                package: app.package,
                appLabel: app.originalLabel,
                isAdded: isAdded
            });
            
            if (isBlocked) {
                appCard.classList.add('blocked-game');
            } else if (isCpuOnly) {
                appCard.classList.add('cpuonly-game');
            }
            
            appCard.addEventListener('click', () => {
                document.getElementById('game-package').value = app.package;
                const gameName = app.originalLabel || app.label || app.package;
                document.getElementById('game-name').value = gameName;
                closePopup('package-picker-popup');
            });
            
            fragment.appendChild(appCard);
        });

        appList.appendChild(fragment);

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
        appendToOutput(`App list loaded using ${apiUsed}`, 'success');
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
            renderGameList();
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
            const files = ['COPG.json', 'list.json'];
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

function arrayBufferToBase64(buffer) {
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    uint8Array.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
}

document.addEventListener('DOMContentLoaded', () => {
    const pickerBtn = document.getElementById('package-picker-btn');
    if (pickerBtn) {
        pickerBtn.addEventListener('click', showPackagePicker);
        pickerBtn.style.padding = '0 8px';
    }
});

function showNoTweaksExplanation(e) {
    e.stopPropagation();

    const popup = document.createElement('div');
    popup.className = 'popup no-tweaks-explanation-popup';
    popup.id = 'no-tweaks-explanation-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3 class="explanation-title">About No Tweaks</h3>
            <div class="explanation-text">
                <span class="highlight">No Tweaks</span> means this app <span class="highlight">WON'T</span> receive these tweaks:
                <ul>
                    <li>Disable Logging</li>
                </ul>
                <div class="important-note">
                    <span class="important-text">Important:</span> Spoofing <span class="highlight">WILL STILL WORK</span> normally.
                </div>
            </div>
            <button class="action-btn">OK</button>
        </div>
    `;

    document.body.appendChild(popup);

    requestAnimationFrame(() => {
        popup.style.display = 'flex';
        popup.querySelector('.popup-content').classList.add('modal-enter');
    });

    popup.querySelector('.action-btn').addEventListener('click', () => {
        const content = popup.querySelector('.popup-content');
        content.classList.remove('modal-enter');
        content.classList.add('popup-exit');
        content.addEventListener('animationend', () => {
            popup.remove();
        }, { once: true });
    });

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            const content = popup.querySelector('.popup-content');
            content.classList.remove('modal-enter');
            content.classList.add('popup-exit');
            content.addEventListener('animationend', () => {
                popup.remove();
            }, { once: true });
        }
    });
}

function showWithCpuExplanation(e) {
    e.stopPropagation();

    const popup = document.createElement('div');
    popup.className = 'popup cpu-explanation-popup';
    popup.id = 'with-cpu-explanation-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3 class="explanation-title">With CPU Spoofing</h3>
            <div class="explanation-text">
                <span class="highlight">This application receives:</span>
                <ul>
                    <li>• Device Spoofing (Full device profile)</li>
                    <li>• CPU Spoofing (CPU information modification)</li>
                </ul>
                
                <div class="important-note">
                    <span class="important-text">Use case:</span> 
                    Games and applications that require both device and CPU spoofing for optimal performance and compatibility.
                </div>
                
                <div class="important-note">
                    <span class="important-text">Result:</span> 
                    The application will see a different device with modified CPU specifications.
                </div>
            </div>
            <button class="action-btn">OK</button>
        </div>
    `;

    document.body.appendChild(popup);
    requestAnimationFrame(() => {
        popup.style.display = 'flex';
        popup.querySelector('.popup-content').classList.add('modal-enter');
    });

    const okBtn = popup.querySelector('.action-btn');
    okBtn.addEventListener('click', () => {
        const content = popup.querySelector('.popup-content');
        content.classList.remove('modal-enter');
        content.classList.add('popup-exit');
        content.addEventListener('animationend', () => {
            popup.remove();
        }, { once: true });
    });

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            const content = popup.querySelector('.popup-content');
            content.classList.remove('modal-enter');
            content.classList.add('popup-exit');
            content.addEventListener('animationend', () => {
                popup.remove();
            }, { once: true });
        }
    });
}

function showGameTypePicker() {
    const popup = document.getElementById('game-type-picker-popup');
    const typeCards = document.querySelectorAll('.type-picker-card');
    const searchInput = document.getElementById('game-type-picker-search');
    
    searchInput.value = '';
    typeCards.forEach(card => {
        card.classList.remove('selected');
        card.style.display = 'flex';
    });
    
    if (selectedGameType) {
        const selectedCard = document.querySelector(`.type-picker-card[data-type="${selectedGameType}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }
    
    typeCards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            selectedGameType = type;
            
            const typeInput = document.getElementById('game-type');
            typeInput.value = getTypeDisplayName(type);
            typeInput.dataset.type = type;
            typeInput.classList.add('highlighted');
            
            const deviceGroup = document.getElementById('device-select-group');
            const deviceInput = document.getElementById('game-device');
            const disableTweaksGroup = document.querySelector('.disable-tweaks-group');
            const disableTweaksToggle = document.getElementById('disable-tweaks-toggle');
            const cpuSpoofGroup = document.getElementById('cpu-spoof-container');
            const cpuSpoofToggle = document.getElementById('cpu-spoof-toggle');
            const blockCpuGroup = document.getElementById('block-cpu-container');
            const blockCpuToggle = document.getElementById('block-cpu-toggle');
            
            if (type === 'device') {
                deviceGroup.classList.remove('disabled');
                deviceInput.removeAttribute('readonly');
                deviceInput.style.cursor = 'pointer';
                deviceInput.placeholder = 'Select a device...';
                
                if (deviceInput.dataset.key) {
                    const deviceData = currentConfig[deviceInput.dataset.key];
                    if (deviceData) {
                        deviceInput.value = deviceData.DEVICE || '';
                    }
                }
                
                disableTweaksGroup.classList.remove('disabled');
                disableTweaksToggle.disabled = false;
                cpuSpoofGroup.classList.remove('disabled');
                cpuSpoofToggle.disabled = false;
                blockCpuGroup.classList.remove('disabled');
                blockCpuToggle.disabled = false;
                
                if (!cpuSpoofToggle.checked && !blockCpuToggle.checked) {
                    cpuSpoofToggle.checked = false;
                    blockCpuToggle.checked = false;
                }
                
            }

            closePopup('game-type-picker-popup');
        });
    });
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        typeCards.forEach(card => {
            const type = card.dataset.type;
            const displayName = getTypeDisplayName(type).toLowerCase();
            const description = card.querySelector('.type-info p').textContent.toLowerCase();
            
            const match = displayName.includes(searchTerm) || description.includes(searchTerm);
            card.style.display = match ? 'flex' : 'none';
        });
    });
    
    popup.querySelector('.cancel-btn').addEventListener('click', () => {
        closePopup('game-type-picker-popup');
    });
    
    showPopup('game-type-picker-popup');
}

function getTypeDisplayName(type) {
    switch(type) {
        case 'device': return 'Device Spoof';
        default: return type;
    }
}
