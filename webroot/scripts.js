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
    output.textContent += `${new Date().toLocaleTimeString()} - ${content}\n`;
    output.scrollTop = output.scrollHeight;
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
        const state = await execCommand("cat /data/adb/copg_state || echo ''");
        autoBrightnessToggle.checked = state.includes("AUTO_BRIGHTNESS_OFF=1") || !state.includes("AUTO_BRIGHTNESS_OFF=");
        dndToggle.checked = state.includes("DND_ON=1") || !state.includes("DND_ON=");
    } catch (error) {
        appendToOutput("[!] Failed to load toggle states");
    }
}

function applyEventListeners() {
    document.getElementById('toggle-auto-brightness').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/AUTO_BRIGHTNESS_OFF=/d' /data/adb/copg_state; echo "AUTO_BRIGHTNESS_OFF=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "✅ Auto-Brightness Disable for Games Enabled" : "❌ Auto-Brightness Disable for Games Disabled");
    });

    document.getElementById('toggle-dnd').addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await execCommand(`sed -i '/DND_ON=/d' /data/adb/copg_state; echo "DND_ON=${isChecked ? 1 : 0}" >> /data/adb/copg_state`);
        appendToOutput(isChecked ? "✅ DND for Games Enabled" : "❌ DND for Games Disabled");
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
        } catch (error) {
            appendToOutput("[!] Failed to update game list: " + error);
        }
        actionRunning = false;
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    appendToOutput("UI initialized");
    loadVersion();
    loadToggleStates();
    applyEventListeners();
});
