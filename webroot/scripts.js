let actionRunning = false;

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

function appendToOutput(content) {
    const output = document.getElementById('output');
    const logContent = document.getElementById('log-content');
    const logEntry = document.createElement('div');
    logEntry.textContent = `${new Date().toLocaleTimeString()} - ${content}`;
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
        appendToOutput("[!] Failed to load version");
    }
}

async function loadToggleStates() {
    try {
        const autoBrightnessToggle = document.getElementById('toggle-auto-brightness');
        const dndToggle = document.getElementById('toggle-dnd');
        const loggingToggle = document.getElementById('toggle-logging');
        const state = await execCommand("cat /data/adb/copg_state || echo ''");
        autoBrightnessToggle.checked = state.includes("AUTO_BRIGHTNESS_OFF=1") || !state.includes("AUTO_BRIGHTNESS_OFF=");
        dndToggle.checked = state.includes("DND_ON=1") || !state.includes("DND_ON=");
        loggingToggle.checked = state.includes("DISABLE_LOGGING=1") || !state.includes("DISABLE_LOGGING=");
    } catch (error) {
        appendToOutput("[!] Failed to load toggle states");
    }
}

function showPopup(popupId) {
    const popup = document.getElementById(popupId);
    popup.style.display = 'flex';
}

function hidePopup(popupId) {
    const popup = document.getElementById(popupId);
    popup.style.display = 'none';
}

async function rebootDevice() {
    appendToOutput("[+] Rebooting device...");
    try {
        await execCommand("su -c reboot");
    } catch (error) {
        appendToOutput("[!] Failed to reboot: " + error);
    }
}

function toggleLogSection() {
    const logContent = document.getElementById('log-content');
    const toggleIcon = document.querySelector('.toggle-icon');
    logContent.classList.toggle('collapsed');
    toggleIcon.textContent = logContent.classList.contains('collapsed') ? '▲' : '▼';
    if (!logContent.classList.contains('collapsed')) {
        const output = document.getElementById('output');
        const lastEntry = output.lastElementChild;
        if (lastEntry) {
            lastEntry.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }
}

function applyEventListeners() {
    document.getElementById('toggle-auto-brightness').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/AUTO_BRIGHTNESS_OFF=/d' /data/adb/copg_state; echo "AUTO_BRIGHTNESS_OFF=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "✅ Auto-Brightness Disabled" : "❌ Auto-Brightness Enabled");
    });

    document.getElementById('toggle-dnd').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/DND_ON=/d' /data/adb/copg_state; echo "DND_ON=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "✅ DND Enabled" : "❌ DND Disabled");
    });

    document.getElementById('toggle-logging').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/DISABLE_LOGGING=/d' /data/adb/copg_state; echo "DISABLE_LOGGING=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "✅ Logging Disabled" : "❌ Logging Enabled");
    });

    document.getElementById('update-config').addEventListener('click', async () => {
        if (actionRunning) return;
        actionRunning = true;
        appendToOutput("[+] Updating game list...");
        try {
            const output = await execCommand("sh /data/adb/modules/COPG/action.sh");
            output.split('\n').forEach(line => {
                if (line.trim()) appendToOutput(line);
            });
            if (output.includes("Reboot required to apply changes")) {
                showPopup('reboot-popup');
            }
        } catch (error) {
            appendToOutput("[!] Failed to update game list: " + error);
        }
        actionRunning = false;
    });

    document.getElementById('reboot-yes').addEventListener('click', async () => {
        hidePopup('reboot-popup');
        await rebootDevice();
    });

    document.getElementById('reboot-no').addEventListener('click', () => {
        hidePopup('reboot-popup');
        appendToOutput("[+] Reboot canceled");
    });

    document.getElementById('log-header').addEventListener('click', toggleLogSection);

    document.getElementById('clear-log').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent toggle when clicking "Clear"
        document.getElementById('output').textContent = '';
        appendToOutput("[+] Log cleared");
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    appendToOutput("UI initialized");
    loadVersion();
    loadToggleStates();
    applyEventListeners();
});
