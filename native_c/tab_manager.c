/**
 * ============================================================================
 * Browser Tab Management Engine (Native C Implementation)
 * Full implementation of lifecycle, state machines, and doubly linked list.
 * ============================================================================
 */

#include "tab_manager.h"

TabManager* tab_manager_create(void) {
    TabManager* tm = (TabManager*)malloc(sizeof(TabManager));
    if (!tm) return NULL;

    tm->head = NULL;
    tm->tail = NULL;
    tm->active_tab = NULL;
    tm->tab_count = 0;
    tm->next_tab_id = 1;
    tm->group_count = 0;
    tm->history_top = 0;

    return tm;
}

void tab_manager_destroy(TabManager* tm) {
    if (!tm) return;

    BrowserTab* curr = tm->head;
    while (curr) {
        BrowserTab* next = curr->next;
        free(curr);
        curr = next;
    }

    free(tm);
}

BrowserTab* tab_manager_create_tab(TabManager* tm, const char* title, const char* url, bool is_pinned, bool make_active) {
    if (!tm) return NULL;

    BrowserTab* tab = (BrowserTab*)calloc(1, sizeof(BrowserTab));
    if (!tab) return NULL;

    tab->id = tm->next_tab_id++;
    strncpy(tab->title, title ? title : "New Tab", sizeof(tab->title) - 1);
    strncpy(tab->url, url ? url : "about:blank", sizeof(tab->url) - 1);
    tab->is_pinned = is_pinned;
    tab->is_muted = false;
    tab->is_sleeping = false;
    tab->is_playing_audio = false;
    tab->group_id = -1;
    tab->last_accessed = 0;

    /* Insertion Logic */
    if (!tm->head) {
        /* First tab */
        tm->head = tab;
        tm->tail = tab;
        tab->prev = NULL;
        tab->next = NULL;
    } else if (is_pinned) {
        /* Pinned tabs are placed right after existing pinned tabs */
        BrowserTab* curr = tm->head;
        BrowserTab* last_pinned = NULL;
        while (curr && curr->is_pinned) {
            last_pinned = curr;
            curr = curr->next;
        }

        if (!last_pinned) {
            /* Insert at head */
            tab->next = tm->head;
            tab->prev = NULL;
            tm->head->prev = tab;
            tm->head = tab;
        } else {
            /* Insert after last_pinned */
            tab->next = last_pinned->next;
            tab->prev = last_pinned;
            if (last_pinned->next) {
                last_pinned->next->prev = tab;
            } else {
                tm->tail = tab;
            }
            last_pinned->next = tab;
        }
    } else {
        /* Append to tail */
        tab->prev = tm->tail;
        tab->next = NULL;
        tm->tail->next = tab;
        tm->tail = tab;
    }

    tm->tab_count++;

    if (make_active || tm->tab_count == 1) {
        tab_manager_activate_tab(tm, tab->id);
    }

    return tab;
}

int tab_manager_get_tab_index(const TabManager* tm, unsigned int tab_id) {
    if (!tm) return -1;
    int idx = 0;
    BrowserTab* curr = tm->head;
    while (curr) {
        if (curr->id == tab_id) return idx;
        idx++;
        curr = curr->next;
    }
    return -1;
}

bool tab_manager_close_tab(TabManager* tm, unsigned int tab_id) {
    if (!tm) return false;

    BrowserTab* tab = tab_manager_find_tab(tm, tab_id);
    if (!tab) return false;

    /* Record to history stack for Ctrl+Shift+T (Undo close) */
    if (tm->history_top < MAX_HISTORY) {
        TabHistoryRecord* rec = &tm->history_stack[tm->history_top++];
        rec->id = tab->id;
        strncpy(rec->title, tab->title, sizeof(rec->title) - 1);
        strncpy(rec->url, tab->url, sizeof(rec->url) - 1);
        rec->was_pinned = tab->is_pinned;
        rec->original_index = tab_manager_get_tab_index(tm, tab_id);
    }

    /* If closing the active tab, activate neighbor */
    if (tm->active_tab == tab) {
        if (tab->next) {
            tm->active_tab = tab->next;
        } else if (tab->prev) {
            tm->active_tab = tab->prev;
        } else {
            tm->active_tab = NULL;
        }
    }

    /* Unlink from list */
    if (tab->prev) {
        tab->prev->next = tab->next;
    } else {
        tm->head = tab->next;
    }

    if (tab->next) {
        tab->next->prev = tab->prev;
    } else {
        tm->tail = tab->prev;
    }

    free(tab);
    tm->tab_count--;

    /* Wake newly active tab if it was sleeping */
    if (tm->active_tab && tm->active_tab->is_sleeping) {
        tm->active_tab->is_sleeping = false;
    }

    return true;
}

bool tab_manager_reopen_last_closed(TabManager* tm) {
    if (!tm || tm->history_top == 0) return false;

    TabHistoryRecord* rec = &tm->history_stack[--tm->history_top];
    BrowserTab* restored = tab_manager_create_tab(tm, rec->title, rec->url, rec->was_pinned, true);
    return restored != NULL;
}

bool tab_manager_activate_tab(TabManager* tm, unsigned int tab_id) {
    if (!tm) return false;

    BrowserTab* tab = tab_manager_find_tab(tm, tab_id);
    if (!tab) return false;

    tm->active_tab = tab;
    if (tab->is_sleeping) {
        tab->is_sleeping = false;
    }

    return true;
}

BrowserTab* tab_manager_duplicate_tab(TabManager* tm, unsigned int tab_id) {
    if (!tm) return NULL;

    BrowserTab* original = tab_manager_find_tab(tm, tab_id);
    if (!original) return NULL;

    return tab_manager_create_tab(tm, original->title, original->url, original->is_pinned, true);
}

bool tab_manager_toggle_pin(TabManager* tm, unsigned int tab_id) {
    if (!tm) return false;

    BrowserTab* tab = tab_manager_find_tab(tm, tab_id);
    if (!tab) return false;

    tab->is_pinned = !tab->is_pinned;

    /* Re-sort position: unlink tab and re-insert according to pinned state */
    if (tab->prev) tab->prev->next = tab->next;
    else tm->head = tab->next;

    if (tab->next) tab->next->prev = tab->prev;
    else tm->tail = tab->prev;

    tm->tab_count--; /* Temporarily decrement for reinsertion */

    if (tab->is_pinned) {
        /* Insert after last pinned */
        BrowserTab* curr = tm->head;
        BrowserTab* last_pinned = NULL;
        while (curr && curr->is_pinned) {
            last_pinned = curr;
            curr = curr->next;
        }

        if (!last_pinned) {
            tab->next = tm->head;
            tab->prev = NULL;
            if (tm->head) tm->head->prev = tab;
            tm->head = tab;
            if (!tm->tail) tm->tail = tab;
        } else {
            tab->next = last_pinned->next;
            tab->prev = last_pinned;
            if (last_pinned->next) last_pinned->next->prev = tab;
            else tm->tail = tab;
            last_pinned->next = tab;
        }
    } else {
        /* Move to tail */
        tab->prev = tm->tail;
        tab->next = NULL;
        if (tm->tail) tm->tail->next = tab;
        else tm->head = tab;
        tm->tail = tab;
    }

    tm->tab_count++;
    return true;
}

bool tab_manager_toggle_mute(TabManager* tm, unsigned int tab_id) {
    if (!tm) return false;
    BrowserTab* tab = tab_manager_find_tab(tm, tab_id);
    if (!tab) return false;
    tab->is_muted = !tab->is_muted;
    return true;
}

bool tab_manager_set_audio_playing(TabManager* tm, unsigned int tab_id, bool is_playing) {
    if (!tm) return false;
    BrowserTab* tab = tab_manager_find_tab(tm, tab_id);
    if (!tab) return false;
    tab->is_playing_audio = is_playing;
    return true;
}

bool tab_manager_discard_tab(TabManager* tm, unsigned int tab_id) {
    if (!tm) return false;
    BrowserTab* tab = tab_manager_find_tab(tm, tab_id);
    if (!tab || tab == tm->active_tab) return false; /* Cannot sleep active tab */
    tab->is_sleeping = true;
    return true;
}

bool tab_manager_wake_tab(TabManager* tm, unsigned int tab_id) {
    if (!tm) return false;
    BrowserTab* tab = tab_manager_find_tab(tm, tab_id);
    if (!tab) return false;
    tab->is_sleeping = false;
    return true;
}

void tab_manager_close_other_tabs(TabManager* tm, unsigned int tab_id) {
    if (!tm) return;

    BrowserTab* curr = tm->head;
    while (curr) {
        BrowserTab* next = curr->next;
        if (curr->id != tab_id && !curr->is_pinned) {
            tab_manager_close_tab(tm, curr->id);
        }
        curr = next;
    }
}

void tab_manager_close_tabs_to_right(TabManager* tm, unsigned int tab_id) {
    if (!tm) return;

    BrowserTab* target = tab_manager_find_tab(tm, tab_id);
    if (!target) return;

    BrowserTab* curr = target->next;
    while (curr) {
        BrowserTab* next = curr->next;
        if (!curr->is_pinned) {
            tab_manager_close_tab(tm, curr->id);
        }
        curr = next;
    }
}

int tab_manager_create_group(TabManager* tm, const char* name, const char* color) {
    if (!tm || tm->group_count >= MAX_GROUPS) return -1;

    int gid = (int)tm->group_count + 1;
    TabGroup* grp = &tm->groups[tm->group_count++];
    grp->group_id = gid;
    strncpy(grp->name, name ? name : "Group", sizeof(grp->name) - 1);
    strncpy(grp->color, color ? color : "#6366f1", sizeof(grp->color) - 1);
    grp->is_collapsed = false;

    return gid;
}

bool tab_manager_add_to_group(TabManager* tm, unsigned int tab_id, int group_id) {
    if (!tm) return false;
    BrowserTab* tab = tab_manager_find_tab(tm, tab_id);
    if (!tab) return false;
    tab->group_id = group_id;
    return true;
}

bool tab_manager_toggle_group_collapse(TabManager* tm, int group_id) {
    if (!tm) return false;
    for (size_t i = 0; i < tm->group_count; i++) {
        if (tm->groups[i].group_id == group_id) {
            tm->groups[i].is_collapsed = !tm->groups[i].is_collapsed;
            return true;
        }
    }
    return false;
}

BrowserTab* tab_manager_get_active_tab(const TabManager* tm) {
    return tm ? tm->active_tab : NULL;
}

BrowserTab* tab_manager_find_tab(const TabManager* tm, unsigned int tab_id) {
    if (!tm) return NULL;
    BrowserTab* curr = tm->head;
    while (curr) {
        if (curr->id == tab_id) return curr;
        curr = curr->next;
    }
    return NULL;
}

void tab_manager_print_tabs(const TabManager* tm) {
    if (!tm) return;

    printf("\n=======================================================\n");
    printf(" TAB STRIP OVERVIEW [%u Tabs Open]\n", (unsigned int)tm->tab_count);
    printf("=======================================================\n");

    BrowserTab* curr = tm->head;
    int idx = 1;
    while (curr) {
        bool is_active = (curr == tm->active_tab);
        printf("%s[%d] ID:%u | %s%s\n",
            is_active ? " -> " : "    ",
            idx++,
            curr->id,
            curr->title,
            is_active ? " (ACTIVE)" : "");

        printf("       URL: %s\n", curr->url);
        printf("       Flags: [%s] [%s] [%s] [%s]\n",
            curr->is_pinned ? "PINNED" : "NORMAL",
            curr->is_muted ? "MUTED" : (curr->is_playing_audio ? "PLAYING AUDIO" : "QUIET"),
            curr->is_sleeping ? "SLEEPING" : "AWAKE",
            curr->group_id != -1 ? "GROUPED" : "NO GROUP");

        if (curr->group_id != -1) {
            for (size_t g = 0; g < tm->group_count; g++) {
                if (tm->groups[g].group_id == curr->group_id) {
                    printf("       Group: '%s' (%s)%s\n",
                        tm->groups[g].name,
                        tm->groups[g].color,
                        tm->groups[g].is_collapsed ? " [COLLAPSED]" : "");
                    break;
                }
            }
        }
        printf("-------------------------------------------------------\n");
        curr = curr->next;
    }
    printf("\n");
}
