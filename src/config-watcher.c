#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/inotify.h>
#include <fcntl.h>
#include <string.h>
#include <errno.h>

#define CONFIG_PATH "/data/adb/modules/COPG/config.json"
#define TRIGGER_PATH "/data/adb/copg_trigger"
#define EVENT_SIZE (sizeof(struct inotify_event))
#define BUF_LEN (1024 * (EVENT_SIZE + 16))

int main() {
    int fd, wd;
    char buffer[BUF_LEN];
    FILE *trigger_file;

    // Initialize inotify
    fd = inotify_init();
    if (fd < 0) {
        fprintf(stderr, "Failed to initialize inotify: %s\n", strerror(errno));
        return 1;
    }

    // Watch config.json for modify, create, delete events
    wd = inotify_add_watch(fd, CONFIG_PATH, IN_MODIFY | IN_CREATE | IN_DELETE);
    if (wd < 0) {
        fprintf(stderr, "Failed to add watch for %s: %s\n", CONFIG_PATH, strerror(errno));
        close(fd);
        return 1;
    }

    printf("Watching %s for changes...\n", CONFIG_PATH);

    // Main loop: Read inotify events
    while (1) {
        ssize_t len = read(fd, buffer, BUF_LEN);
        if (len < 0) {
            fprintf(stderr, "Error reading inotify events: %s\n", strerror(errno));
            continue;
        }

        // Process events
        for (char *ptr = buffer; ptr < buffer + len; ptr += EVENT_SIZE + ((struct inotify_event*)ptr)->len) {
            struct inotify_event *event = (struct inotify_event*)ptr;

            if (event->mask & (IN_MODIFY | IN_CREATE | IN_DELETE)) {
                printf("Change detected on %s (event: %d)\n", CONFIG_PATH, event->mask);

                // Create or update trigger file
                trigger_file = fopen(TRIGGER_PATH, "w");
                if (trigger_file) {
                    fprintf(trigger_file, "reload\n");
                    fclose(trigger_file);
                    printf("Wrote trigger file: %s\n", TRIGGER_PATH);
                } else {
                    fprintf(stderr, "Failed to write trigger file %s: %s\n", TRIGGER_PATH, strerror(errno));
                }
            }
        }
    }

    // Cleanup (unreachable due to infinite loop)
    inotify_rm_watch(fd, wd);
    close(fd);
    return 0;
}
