#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <thread>
#include <chrono>
#include <atomic>
#include <memory>
#include <csignal>
#include <functional>
#include <system_error>
#include <dirent.h>
#include "json.hpp"

#ifdef __linux__
    #include <sys/inotify.h>
    #include <unistd.h>
    #include <poll.h>
    #include <errno.h>
#endif

using json = nlohmann::json;

namespace xwatcher {
    enum class FileEvent {
        Unspecified, Removed, Created, Modified, Opened, 
        AttributesChanged, None, Renamed, Moved
    };

    class Watcher {
    private:
        struct File {
            std::string name;
            int context;
            void* additional_data;
            std::function<void(FileEvent, const std::string&, int, void*)> callback;
        };

        struct Directory {
            std::vector<File> files;
            std::string path;
            int context;
            void* additional_data;
            std::function<void(FileEvent, const std::string&, int, void*)> callback;

            #ifdef __linux__
                int inotify_watch_fd = -1;
            #endif
        };

        std::vector<Directory> directories;
        std::thread worker_thread;
        std::atomic<bool> alive{false};
        std::atomic<bool> initialized{false};

        #ifdef __linux__
            int inotify_fd = -1;
        #endif

        void process_events() {
            #ifdef __linux__
                constexpr size_t EVENT_SIZE = sizeof(struct inotify_event);
                constexpr size_t BUF_LEN = 1024 * (EVENT_SIZE + 16);
                char buffer[BUF_LEN];
                
                while (alive.load()) {
                    if (inotify_fd < 0) {
                        std::this_thread::sleep_for(std::chrono::milliseconds(100));
                        continue;
                    }

                    struct pollfd pfd = { inotify_fd, POLLIN, 0 };
                    int ret = poll(&pfd, 1, 100);

                    if (ret < 0) {
                        if (errno == EINTR) continue;
                        std::this_thread::sleep_for(std::chrono::seconds(1));
                        continue;
                    } else if (ret == 0) {
                        continue;
                    }

                    ssize_t length = read(inotify_fd, buffer, BUF_LEN);
                    if (length < 0) {
                        continue;
                    }

                    ssize_t i = 0;
                    while (i < length) {
                        struct inotify_event* event = reinterpret_cast<struct inotify_event*>(&buffer[i]);
                        
                        if (event->mask & IN_IGNORED) {
                            i += EVENT_SIZE + event->len;
                            continue;
                        }

                        Directory* directory = nullptr;
                        for (auto& dir : directories) {
                            if (dir.inotify_watch_fd == event->wd) {
                                directory = &dir;
                                break;
                            }
                        }

                        if (!directory) {
                            i += EVENT_SIZE + event->len;
                            continue;
                        }

                        FileEvent file_event = FileEvent::None;
                        
                        if (event->mask & IN_CREATE) file_event = FileEvent::Created;
                        else if (event->mask & IN_MODIFY) file_event = FileEvent::Modified;
                        else if (event->mask & IN_DELETE) file_event = FileEvent::Removed;
                        else if (event->mask & IN_DELETE_SELF) file_event = FileEvent::Removed;
                        else if (event->mask & IN_MOVE_SELF) file_event = FileEvent::Moved;
                        else if (event->mask & IN_MOVED_FROM) file_event = FileEvent::Moved;
                        else if (event->mask & IN_MOVED_TO) file_event = FileEvent::Created;
                        else if (event->mask & (IN_CLOSE_WRITE | IN_CLOSE_NOWRITE)) file_event = FileEvent::Opened;
                        else if (event->mask & IN_ATTRIB) file_event = FileEvent::AttributesChanged;
                        else if (event->mask & IN_OPEN) file_event = FileEvent::Opened;

                        if (file_event != FileEvent::None) {
                            try {
                                if (event->len > 0) {
                                    File* file = nullptr;
                                    for (auto& f : directory->files) {
                                        if (f.name == event->name) {
                                            file = &f;
                                            break;
                                        }
                                    }

                                    if (file && file->callback) {
                                        std::string full_path = directory->path + "/" + file->name;
                                        file->callback(file_event, full_path, file->context, file->additional_data);
                                    } else if (directory->callback) {
                                        std::string full_path = directory->path + "/" + event->name;
                                        directory->callback(file_event, full_path, directory->context, directory->additional_data);
                                    }
                                }
                            } catch (const std::exception& e) {
                                std::cerr << "Error in file event callback: " << e.what() << std::endl;
                            }
                        }

                        i += EVENT_SIZE + event->len;
                    }
                }
            #endif
        }

        std::string extract_filename(const std::string& path) {
            size_t pos = path.find_last_of("/\\");
            return (pos != std::string::npos) ? path.substr(pos + 1) : path;
        }

    public:
        Watcher() {
            #ifdef __linux__
                inotify_fd = inotify_init1(O_NONBLOCK);
                if (inotify_fd >= 0) {
                    initialized.store(true);
                }
            #endif
        }

        ~Watcher() {
            stop();
            #ifdef __linux__
                if (inotify_fd >= 0) {
                    close(inotify_fd);
                }
            #endif
        }

        bool is_initialized() const {
            return initialized.load();
        }

        bool add_file(const std::string& path, 
                     std::function<void(FileEvent, const std::string&, int, void*)> callback,
                     int context = 0, void* additional_data = nullptr) {
            
            if (!initialized.load()) {
                std::cerr << "Watcher not initialized" << std::endl;
                return false;
            }

            std::string clean_path = path;
            if (!clean_path.empty() && (clean_path.back() == '/' || clean_path.back() == '\\')) {
                clean_path.pop_back();
            }

            std::ifstream test_file(clean_path);
            if (!test_file.good()) {
                std::cout << "File does not exist (may be created later): " << clean_path << std::endl;
            }

            std::string filename = extract_filename(clean_path);
            std::string directory_path = clean_path.substr(0, clean_path.length() - filename.length() - 1);

            Directory* directory = nullptr;
            for (auto& dir : directories) {
                if (dir.path == directory_path) {
                    directory = &dir;
                    break;
                }
            }

            if (!directory) {
                Directory new_dir;
                new_dir.path = directory_path;
                new_dir.context = 0;
                new_dir.additional_data = nullptr;
                new_dir.callback = nullptr;

                #ifdef __linux__
                    new_dir.inotify_watch_fd = inotify_add_watch(inotify_fd, directory_path.c_str(), 
                        IN_CREATE | IN_MODIFY | IN_DELETE | IN_DELETE_SELF | IN_MOVE_SELF | 
                        IN_MOVED_FROM | IN_MOVED_TO | IN_CLOSE_WRITE | IN_ATTRIB | IN_OPEN);
                    if (new_dir.inotify_watch_fd == -1) {
                        std::cerr << "Failed to add inotify watch for: " << directory_path << std::endl;
                        return false;
                    }
                #endif

                directories.push_back(std::move(new_dir));
                directory = &directories.back();
            }

            for (const auto& file : directory->files) {
                if (file.name == filename) {
                    std::cout << "File already being watched: " << filename << std::endl;
                    return false;
                }
            }

            File new_file;
            new_file.name = filename;
            new_file.context = context;
            new_file.additional_data = additional_data;
            new_file.callback = callback;

            directory->files.push_back(std::move(new_file));
            return true;
        }

        bool start() {
            if (alive.load()) {
                return false;
            }

            if (directories.empty()) {
                std::cerr << "No files to watch" << std::endl;
                return false;
            }

            if (!initialized.load()) {
                std::cerr << "Watcher not initialized properly" << std::endl;
                return false;
            }

            alive.store(true);
            worker_thread = std::thread(&Watcher::process_events, this);
            return true;
        }

        void stop() {
            alive.store(false);
            if (worker_thread.joinable()) {
                worker_thread.join();
            }
        }
    };
}

class AdvancedAppController {
private:
    const std::string CONFIG_JSON = "/data/adb/modules/COPG/config.json";
    const std::string TOGGLE_FILE = "/data/adb/copg_state";
    const std::string DEFAULTS_FILE = "/data/adb/copg_defaults";
    const std::string IGNORE_LIST = "/data/adb/modules/COPG/ignorelist.txt";
    
    std::set<std::string> monitored_packages;
    std::set<std::string> ignored_packages;
    std::atomic<bool> running{true};
    std::atomic<bool> config_loaded{false};
    std::atomic<bool> states_saved{false};

    xwatcher::Watcher config_watcher;

    enum class AppState {
        FOREGROUND,
        BACKGROUND,
        PAUSED,
        CLOSED,
        UNKNOWN
    };

    struct StateTracker {
        std::map<std::string, AppState> last_states;
        std::string last_active_app;
        bool last_toggle_state{false};
        int no_change_counter{0};
        
        void reset() {
            last_states.clear();
            last_active_app.clear();
            last_toggle_state = false;
            no_change_counter = 0;
        }
    } state_tracker;

public:
    AdvancedAppController() {
        std::cout << "🚀 Initializing Advanced App Controller..." << std::endl;
        
        if (!config_watcher.is_initialized()) {
            std::cerr << "❌ Config watcher failed to initialize" << std::endl;
            return;
        }

        if (!load_config()) {
            std::cerr << "❌ Failed to load initial configuration" << std::endl;
            return;
        }

        load_ignore_list();
        
        restore_saved_states();
        
        if (!setup_config_watcher()) {
            std::cerr << "❌ Failed to setup config watcher" << std::endl;
            return;
        }

        config_loaded.store(true);
        std::cout << "✅ Controller initialized successfully" << std::endl;
    }

    ~AdvancedAppController() {
        stop();
    }

    void stop() {
        running = false;
        config_watcher.stop();
    }

    bool is_ready() const {
        return config_loaded.load();
    }

private:
    bool setup_config_watcher() {
        auto callback = [this](xwatcher::FileEvent event, const std::string& path, int context, void* additional_data) {
            if (event == xwatcher::FileEvent::Modified || event == xwatcher::FileEvent::Created) {
                std::cout << "🔄 Config file changed - reloading..." << std::endl;
                safe_reload_config();
            }
        };

        if (!config_watcher.add_file(CONFIG_JSON, callback)) {
            std::cerr << "❌ Failed to add config file to watcher" << std::endl;
            return false;
        }

        if (!config_watcher.start()) {
            std::cerr << "❌ Failed to start config watcher" << std::endl;
            return false;
        }

        std::cout << "👀 Built-in config watcher started" << std::endl;
        return true;
    }

    void safe_reload_config() {
        for (int attempt = 0; attempt < 3; attempt++) {
            if (load_config()) {
                load_ignore_list();
                state_tracker.reset();
                std::cout << "✅ Configuration reloaded successfully" << std::endl;
                return;
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(100 * (attempt + 1)));
        }
        std::cerr << "❌ Failed to reload configuration" << std::endl;
    }

    bool load_config() {
        try {
            std::ifstream config_file(CONFIG_JSON);
            if (!config_file.is_open()) {
                std::cerr << "❌ Cannot open config.json" << std::endl;
                return false;
            }
            
            json config;
            config_file >> config;
            
            std::set<std::string> new_packages;
            
            for (auto& [key, value] : config.items()) {
                if (value.is_array()) {
                    for (auto& package : value) {
                        if (package.is_string()) {
                            new_packages.insert(package.get<std::string>());
                        }
                    }
                }
            }
            
            monitored_packages = std::move(new_packages);
            std::cout << "📦 Loaded " << monitored_packages.size() << " packages" << std::endl;
            return true;
            
        } catch (const std::exception& e) {
            std::cerr << "❌ Error loading config: " << e.what() << std::endl;
            return false;
        }
    }

    void load_ignore_list() {
        ignored_packages.clear();
        std::ifstream ignore_file(IGNORE_LIST);
        if (!ignore_file.is_open()) {
            return;
        }
        
        std::string package;
        while (std::getline(ignore_file, package)) {
            if (!package.empty()) {
                ignored_packages.insert(package);
            }
        }
        
        if (!ignored_packages.empty()) {
            std::cout << "🚫 Ignoring " << ignored_packages.size() << " packages" << std::endl;
        }
    }

    bool is_ignored(const std::string& package) {
        return ignored_packages.find(package) != ignored_packages.end();
    }

    std::string execute_command(const std::string& cmd) {
        std::string full_cmd = "su -c \"" + cmd + "\"";
        FILE* pipe = popen(full_cmd.c_str(), "r");
        if (!pipe) {
            return "";
        }
        
        char buffer[128];
        std::string result = "";
        while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
            result += buffer;
        }
        pclose(pipe);
        
        result.erase(std::remove(result.begin(), result.end(), '\n'), result.end());
        result.erase(std::remove(result.begin(), result.end(), '\r'), result.end());
        
        return result;
    }

    bool execute_command_bool(const std::string& cmd) {
        std::string full_cmd = "su -c \"" + cmd + "\"";
        return system(full_cmd.c_str()) == 0;
    }

    bool is_package_process_running(const std::string& package) {
        std::string result = execute_command("pidof " + package);
        if (!result.empty()) return true;
        
        result = execute_command("ps -A | grep " + package);
        return !result.empty();
    }

    AppState get_exact_app_state(const std::string& package) {
        if (is_ignored(package)) {
            return AppState::UNKNOWN;
        }

        std::string visible_cmd = "dumpsys window visible-apps 2>/dev/null | grep -o -E 'package=[^ ]+' | cut -d'=' -f2 | grep '" + package + "'";
        if (!execute_command(visible_cmd).empty()) {
            return AppState::FOREGROUND;
        }

        std::string recent_cmd = "dumpsys activity recents 2>/dev/null | grep -E '" + package + "' | head -1";
        if (!execute_command(recent_cmd).empty()) {
            return AppState::BACKGROUND;
        }

        if (is_package_process_running(package)) {
            return AppState::PAUSED;
        }

        return AppState::CLOSED;
    }

    std::map<std::string, AppState> get_active_monitored_apps() {
        std::map<std::string, AppState> active_apps;
        
        for (const auto& package : monitored_packages) {
            if (is_ignored(package)) continue;
            
            AppState state = get_exact_app_state(package);
            if (state != AppState::CLOSED && state != AppState::UNKNOWN) {
                active_apps[package] = state;
            }
        }
        
        return active_apps;
    }

    bool should_apply_toggles(const std::map<std::string, AppState>& active_apps) {
        for (const auto& [package, state] : active_apps) {
            if (state == AppState::FOREGROUND || state == AppState::BACKGROUND) {
                return true;
            }
        }
        return false;
    }

    bool should_restore_states(const std::map<std::string, AppState>& active_apps) {
        if (active_apps.empty()) {
            return true;
        }
        
        for (const auto& [package, state] : active_apps) {
            if (state == AppState::FOREGROUND || state == AppState::BACKGROUND) {
                return false;
            }
        }
        
        return true;
    }

    bool has_state_changed(const std::map<std::string, AppState>& current_states) {
        if (current_states.size() != state_tracker.last_states.size()) {
            return true;
        }
        
        for (const auto& [package, state] : current_states) {
            auto it = state_tracker.last_states.find(package);
            if (it == state_tracker.last_states.end() || it->second != state) {
                return true;
            }
        }
        
        return false;
    }

    void log_state_changes(const std::map<std::string, AppState>& current_states) {
        if (!has_state_changed(current_states)) {
            state_tracker.no_change_counter++;
            if (state_tracker.no_change_counter % 20 == 0) {
                std::cout << "📱 System stable - No state changes (" << state_tracker.no_change_counter << " cycles)" << std::endl;
            }
            return;
        }
        
        state_tracker.no_change_counter = 0;
        
        std::cout << "🔄 State changes detected:" << std::endl;
        
        for (const auto& [package, state] : current_states) {
            auto it = state_tracker.last_states.find(package);
            if (it == state_tracker.last_states.end()) {
                std::cout << "   ➕ " << package << ": " << state_to_string(state) << std::endl;
            } else if (it->second != state) {
                std::cout << "   🔄 " << package << ": " << state_to_string(it->second) 
                          << " → " << state_to_string(state) << std::endl;
            } else {
                if (state == AppState::FOREGROUND || state == AppState::BACKGROUND) {
                    std::cout << "   📍 " << package << ": " << state_to_string(state) << " (active)" << std::endl;
                }
            }
        }
        
        for (const auto& [package, old_state] : state_tracker.last_states) {
            if (current_states.find(package) == current_states.end()) {
                std::cout << "   ❌ " << package << ": CLOSED" << std::endl;
            }
        }
        
        state_tracker.last_states = current_states;
    }

    bool save_current_states() {
        std::string brightness_val = execute_command("settings get system screen_brightness_mode");
        std::string dnd_val = execute_command("settings get global zen_mode");
        std::string timeout_val = execute_command("settings get system screen_off_timeout");
        
        if (brightness_val.empty() || dnd_val.empty() || timeout_val.empty()) {
            std::cerr << "❌ Failed to read system states" << std::endl;
            return false;
        }
        
        try {
            std::ofstream brightness_file(DEFAULTS_FILE + ".brightness");
            std::ofstream dnd_file(DEFAULTS_FILE + ".dnd");
            std::ofstream timeout_file(DEFAULTS_FILE + ".timeout");
            
            if (brightness_file && dnd_file && timeout_file) {
                brightness_file << brightness_val;
                dnd_file << dnd_val;
                timeout_file << timeout_val;
                
                execute_command_bool("chmod 644 " + DEFAULTS_FILE + ".brightness");
                execute_command_bool("chmod 644 " + DEFAULTS_FILE + ".dnd");
                execute_command_bool("chmod 644 " + DEFAULTS_FILE + ".timeout");
                execute_command_bool("sync");
                
                std::cout << "💾 System states saved" << std::endl;
                return true;
            }
        } catch (const std::exception& e) {
            std::cerr << "❌ Error saving system state: " << e.what() << std::endl;
        }
        
        return false;
    }

    void apply_toggles() {
        std::ifstream toggle_file(TOGGLE_FILE);
        if (!toggle_file.is_open()) {
            return;
        }
        
        std::map<std::string, std::string> toggles;
        std::string line;
        
        while (std::getline(toggle_file, line)) {
            size_t pos = line.find('=');
            if (pos != std::string::npos) {
                std::string key = line.substr(0, pos);
                std::string value = line.substr(pos + 1);
                toggles[key] = value;
            }
        }
        
        if (toggles["AUTO_BRIGHTNESS_OFF"] == "1") {
            execute_command_bool("settings put system screen_brightness_mode 0");
        }
        if (toggles["DND_ON"] == "1") {
            execute_command_bool("cmd notification set_dnd priority");
        }
        if (toggles["DISABLE_LOGGING"] == "1") {
            execute_command_bool("stop logd");
        }
        if (toggles["KEEP_SCREEN_ON"] == "1") {
            execute_command_bool("settings put system screen_off_timeout 300000000");
        }
        
        std::cout << "🎛️ Toggles applied" << std::endl;
    }

    void restore_saved_states() {
        std::ifstream brightness_file(DEFAULTS_FILE + ".brightness");
        std::ifstream dnd_file(DEFAULTS_FILE + ".dnd");
        std::ifstream timeout_file(DEFAULTS_FILE + ".timeout");
        
        if (!brightness_file || !dnd_file || !timeout_file) {
            return;
        }
        
        std::cout << "🔄 Restoring saved system states..." << std::endl;
        
        std::string brightness_str;
        brightness_file >> brightness_str;
        if (!brightness_str.empty()) {
            bool brightness_restored = false;
            for (int i = 0; i < 5; i++) {
                if (execute_command_bool("settings put system screen_brightness_mode " + brightness_str)) {
                    brightness_restored = true;
                    break;
                }
                std::this_thread::sleep_for(std::chrono::seconds(2));
            }
            
            if (!brightness_restored) {
                execute_command_bool("settings put system screen_brightness 128");
            }
        }
        
        std::string dnd_str;
        dnd_file >> dnd_str;
        if (!dnd_str.empty()) {
            for (int i = 0; i < 5; i++) {
                std::string dnd_cmd;
                if (dnd_str == "0") dnd_cmd = "cmd notification set_dnd off";
                else if (dnd_str == "1") dnd_cmd = "cmd notification set_dnd priority";
                else if (dnd_str == "2") dnd_cmd = "cmd notification set_dnd total";
                else if (dnd_str == "3") dnd_cmd = "cmd notification set_dnd alarms";
                else continue;
                
                if (execute_command_bool(dnd_cmd)) {
                    break;
                }
                std::this_thread::sleep_for(std::chrono::seconds(2));
            }
        }
        
        std::string timeout_str;
        timeout_file >> timeout_str;
        if (!timeout_str.empty()) {
            execute_command_bool("settings put system screen_off_timeout " + timeout_str);
        }
        
        std::ifstream toggle_file(TOGGLE_FILE);
        if (toggle_file.is_open()) {
            std::string line;
            while (std::getline(toggle_file, line)) {
                if (line.find("DISABLE_LOGGING=1") != std::string::npos) {
                    execute_command_bool("start logd");
                    break;
                }
            }
        }
        
        execute_command_bool("rm -f " + DEFAULTS_FILE + ".brightness " + 
                           DEFAULTS_FILE + ".dnd " + DEFAULTS_FILE + ".timeout");
        
        std::cout << "✅ System states restored" << std::endl;
    }

    std::string state_to_string(AppState state) {
        switch (state) {
            case AppState::FOREGROUND: return "✅ FOREGROUND";
            case AppState::BACKGROUND: return "🔵 BACKGROUND"; 
            case AppState::PAUSED: return "⏸️ PAUSED";
            case AppState::CLOSED: return "❌ CLOSED";
            default: return "❓ UNKNOWN";
        }
    }

public:
    void run_controller() {
        if (!is_ready()) {
            std::cerr << "❌ Controller not ready" << std::endl;
            return;
        }

        std::cout << "🚀 Advanced App Controller Started" << std::endl;
        std::cout << "📊 Monitoring " << monitored_packages.size() << " packages" << std::endl;
        std::cout << "🎯 States: FOREGROUND, BACKGROUND, PAUSED, CLOSED" << std::endl;
        std::cout << "🔧 Toggles apply only in FOREGROUND/BACKGROUND states" << std::endl;
        std::cout << "📝 Logging: Only state changes and important events" << std::endl;
        
        int debounce_count = 0;
        const int DEBOUNCE_THRESHOLD = 3;
        
        while (running.load()) {
            try {
                auto active_apps = get_active_monitored_apps();
                
                log_state_changes(active_apps);
                
                bool current_toggle_state = should_apply_toggles(active_apps);
                
                if (current_toggle_state && !state_tracker.last_toggle_state && !states_saved.load()) {
                    debounce_count++;
                    if (debounce_count >= DEBOUNCE_THRESHOLD) {
                        std::cout << "🎯 Active app detected - Applying toggles" << std::endl;
                        if (save_current_states()) {
                            apply_toggles();
                            states_saved.store(true);
                            state_tracker.last_toggle_state = true;
                        }
                        debounce_count = 0;
                    }
                } 
                else if (!current_toggle_state && state_tracker.last_toggle_state && states_saved.load()) {
                    debounce_count++;
                    if (debounce_count >= DEBOUNCE_THRESHOLD) {
                        if (should_restore_states(active_apps)) {
                            std::cout << "🏁 All apps closed/paused - Restoring system states" << std::endl;
                            restore_saved_states();
                            states_saved.store(false);
                            state_tracker.last_toggle_state = false;
                        }
                        debounce_count = 0;
                    }
                } 
                else {
                    debounce_count = 0;
                }
                
                std::this_thread::sleep_for(std::chrono::milliseconds(500));
            } catch (const std::exception& e) {
                std::cerr << "❌ Error in main loop: " << e.what() << std::endl;
                std::this_thread::sleep_for(std::chrono::seconds(1));
            }
        }
    }
};

std::unique_ptr<AdvancedAppController> g_controller = nullptr;

void signal_handler(int signal) {
    std::cout << "\n🛑 Received signal " << signal << ", shutting down..." << std::endl;
    if (g_controller) {
        g_controller->stop();
    }
}

int main() {
    std::cout << "🎮 Starting Advanced App Controller..." << std::endl;
    
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);
    
    try {
        g_controller = std::make_unique<AdvancedAppController>();
        
        if (!g_controller->is_ready()) {
            std::cerr << "💥 Controller initialization failed" << std::endl;
            return 1;
        }
        
        g_controller->run_controller();
        
        std::cout << "✅ Shutdown complete" << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "💥 Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
