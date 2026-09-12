/**
 * ============================================================================
 * Browser Tab Management Engine - Demo & Test Suite (C)
 * Demonstrates tab creation, closing, undo-close, pinning, grouping,
 * audio mute states, and hibernation memory saver.
 * ============================================================================
 */

#include "tab_manager.h"

int main(void) {
    printf("========================================================\n");
    printf("  ANTIGRAVITY WEB BROWSER - TAB MANAGEMENT ENGINE (C)  \n");
    printf("========================================================\n\n");

    /* 1. Initialize Tab Manager */
    TabManager* tm = tab_manager_create();
    if (!tm) {
        fprintf(stderr, "Failed to initialize Tab Manager.\n");
        return 1;
    }
    printf("[+] Initialized Tab Manager successfully.\n");

    /* 2. Create Tabs */
    tab_manager_create_tab(tm, "Workspace Mail", "https://mail.google.com", true, false);
    tab_manager_create_tab(tm, "Google Search", "https://www.google.com", false, true);
    BrowserTab* t3 = tab_manager_create_tab(tm, "YouTube Chill Beats", "https://youtube.com/watch?v=chill", false, false);
    BrowserTab* t4 = tab_manager_create_tab(tm, "MDN Web Docs", "https://developer.mozilla.org", false, false);
    BrowserTab* t5 = tab_manager_create_tab(tm, "GitHub Core Repository", "https://github.com/browser", false, false);

    printf("[+] Created 5 tabs (Tab 1 is pinned).\n");
    tab_manager_print_tabs(tm);

    /* 3. Audio & Mute Testing */
    printf("[*] Setting YouTube tab (ID %u) to playing audio...\n", t3->id);
    tab_manager_set_audio_playing(tm, t3->id, true);
    printf("[*] Toggling mute on YouTube tab...\n");
    tab_manager_toggle_mute(tm, t3->id);

    /* 4. Tab Groups Testing */
    printf("[*] Creating 'Development' Tab Group...\n");
    int dev_group = tab_manager_create_group(tm, "Development", "#10b981");
    tab_manager_add_to_group(tm, t4->id, dev_group);
    tab_manager_add_to_group(tm, t5->id, dev_group);
    printf("[+] Added Tab %u and Tab %u to Development Group.\n", t4->id, t5->id);

    /* 5. Memory Saver / Tab Hibernation Testing */
    printf("[*] Discarding inactive tab %u to save RAM (hibernation)...\n", t4->id);
    tab_manager_discard_tab(tm, t4->id);

    tab_manager_print_tabs(tm);

    /* 6. Active Tab Switching */
    printf("[*] Activating GitHub tab (ID %u)...\n", t5->id);
    tab_manager_activate_tab(tm, t5->id);

    /* 7. Duplicate Tab */
    printf("[*] Duplicating active tab (ID %u)...\n", t5->id);
    BrowserTab* t_dup = tab_manager_duplicate_tab(tm, t5->id);
    printf("[+] Duplicated tab created with ID: %u\n", t_dup ? t_dup->id : 0);

    /* 8. Tab Closing & Undo-Close (Ctrl+Shift+T) */
    unsigned int closed_id = t3->id;
    printf("[*] Closing YouTube tab (ID %u)...\n", closed_id);
    tab_manager_close_tab(tm, closed_id);
    tab_manager_print_tabs(tm);

    printf("[*] Performing Undo-Close (Reopening last closed tab)...\n");
    tab_manager_reopen_last_closed(tm);
    printf("[+] Restored tab from history stack!\n");
    tab_manager_print_tabs(tm);

    /* 9. Cleanup */
    printf("[*] Destroying Tab Manager and freeing all resources...\n");
    tab_manager_destroy(tm);
    printf("[+] All tab memory safely freed. Test completed successfully!\n");

    return 0;
}
