/**
 * ============================================================================
 * Browser Tab Management Engine (Native C Implementation)
 * Provides high-performance doubly-linked list tab state, undo-close history,
 * tab groups, audio state, memory discard/hibernation, and pinning.
 * ============================================================================
 */

#ifndef TAB_MANAGER_H
#define TAB_MANAGER_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define MAX_TITLE_LEN 128
#define MAX_URL_LEN 512
#define MAX_GROUPS 16
#define MAX_HISTORY 32

/* Represents an individual Browser Tab */
typedef struct BrowserTab {
    unsigned int id;
    char title[MAX_TITLE_LEN];
    char url[MAX_URL_LEN];
    bool is_pinned;
    bool is_muted;
    bool is_sleeping;
    bool is_playing_audio;
    int group_id; /* -1 if no group */
    unsigned long long last_accessed;

    struct BrowserTab* prev;
    struct BrowserTab* next;
} BrowserTab;

/* Represents a Tab Group (Chrome/Arc style) */
typedef struct {
    int group_id;
    char name[64];
    char color[16]; /* e.g. "#6366f1" */
    bool is_collapsed;
} TabGroup;

/* Represents a closed tab record for Undo-Close (Ctrl+Shift+T) */
typedef struct {
    unsigned int id;
    char title[MAX_TITLE_LEN];
    char url[MAX_URL_LEN];
    int original_index;
    bool was_pinned;
} TabHistoryRecord;

/* Represents the Tab Manager Engine */
typedef struct {
    BrowserTab* head;
    BrowserTab* tail;
    BrowserTab* active_tab;
    size_t tab_count;
    unsigned int next_tab_id;

    /* Tab Groups */
    TabGroup groups[MAX_GROUPS];
    size_t group_count;

    /* Closed Tabs History Stack */
    TabHistoryRecord history_stack[MAX_HISTORY];
    size_t history_top;
} TabManager;

/* Lifecycle Management */
TabManager* tab_manager_create(void);
void tab_manager_destroy(TabManager* tm);

/* Core Tab Operations */
BrowserTab* tab_manager_create_tab(TabManager* tm, const char* title, const char* url, bool is_pinned, bool make_active);
bool tab_manager_close_tab(TabManager* tm, unsigned int tab_id);
bool tab_manager_reopen_last_closed(TabManager* tm);
bool tab_manager_activate_tab(TabManager* tm, unsigned int tab_id);
BrowserTab* tab_manager_duplicate_tab(TabManager* tm, unsigned int tab_id);

/* Tab State Modifiers */
bool tab_manager_toggle_pin(TabManager* tm, unsigned int tab_id);
bool tab_manager_toggle_mute(TabManager* tm, unsigned int tab_id);
bool tab_manager_set_audio_playing(TabManager* tm, unsigned int tab_id, bool is_playing);
bool tab_manager_discard_tab(TabManager* tm, unsigned int tab_id); /* Sleep tab to save memory */
bool tab_manager_wake_tab(TabManager* tm, unsigned int tab_id);

/* Bulk Tab Operations */
void tab_manager_close_other_tabs(TabManager* tm, unsigned int tab_id);
void tab_manager_close_tabs_to_right(TabManager* tm, unsigned int tab_id);

/* Tab Groups */
int tab_manager_create_group(TabManager* tm, const char* name, const char* color);
bool tab_manager_add_to_group(TabManager* tm, unsigned int tab_id, int group_id);
bool tab_manager_toggle_group_collapse(TabManager* tm, int group_id);

/* Lookups & Helpers */
BrowserTab* tab_manager_get_active_tab(const TabManager* tm);
BrowserTab* tab_manager_find_tab(const TabManager* tm, unsigned int tab_id);
int tab_manager_get_tab_index(const TabManager* tm, unsigned int tab_id);
void tab_manager_print_tabs(const TabManager* tm);

#endif /* TAB_MANAGER_H */
