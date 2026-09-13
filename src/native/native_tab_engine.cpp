#include "native_tab_engine.h"
#include <iostream>
#include <sstream>
#include <cmath>

namespace antigravity {
namespace native {

// =============================================================================
// BlinkWebContents Implementation
// =============================================================================

BlinkWebContents::BlinkWebContents(const std::string& initialUrl, HWND parentHwnd)
    : current_url_(initialUrl), parent_hwnd_(parentHwnd), hwnd_(NULL), is_suspended_(false) {
    if (parent_hwnd_ != NULL) {
        hwnd_ = CreateWindowExA(
            0,
            "STATIC",
            current_url_.c_str(),
            WS_CHILD | WS_VISIBLE | WS_CLIPCHILDREN | WS_CLIPSIBLINGS,
            0, 0, 800, 600,
            parent_hwnd_,
            NULL,
            GetModuleHandle(NULL),
            NULL
        );
    }
}

BlinkWebContents::~BlinkWebContents() {
    if (hwnd_ != NULL) {
        DestroyWindow(hwnd_);
        hwnd_ = NULL;
    }
}

void BlinkWebContents::LoadURL(const std::string& url) {
    current_url_ = url;
    if (hwnd_ != NULL) {
        SetWindowTextA(hwnd_, url.c_str());
        InvalidateRect(hwnd_, NULL, TRUE);
    }
}

void BlinkWebContents::SetVisible(bool visible) {
    if (hwnd_ != NULL) {
        ShowWindow(hwnd_, visible ? SW_SHOW : SW_HIDE);
        if (visible) {
            BringWindowToTop(hwnd_);
        }
    }
}

void BlinkWebContents::SuspendProcess() {
    if (is_suspended_) return;
    is_suspended_ = true;
    if (hwnd_ != NULL) {
        ShowWindow(hwnd_, SW_HIDE);
    }
}

void BlinkWebContents::RehydrateProcess() {
    if (!is_suspended_) return;
    is_suspended_ = false;
    if (hwnd_ != NULL) {
        ShowWindow(hwnd_, SW_SHOW);
        InvalidateRect(hwnd_, NULL, TRUE);
    }
}

void BlinkWebContents::Resize(int x, int y, int width, int height) {
    if (hwnd_ != NULL) {
        MoveWindow(hwnd_, x, y, width, height, TRUE);
    }
}

// =============================================================================
// NativeTabManager Implementation
// =============================================================================

NativeTabManager& NativeTabManager::GetInstance() {
    static NativeTabManager instance;
    return instance;
}

NativeTabManager::NativeTabManager() {
    InitializeCriticalSection(&cs_lock_);
}

NativeTabManager::~NativeTabManager() {
    Shutdown();
    DeleteCriticalSection(&cs_lock_);
}

void NativeTabManager::Initialize(HWND mainAppWindow, HWND tabStripWindow, HWND toolbarWindow) {
    EnterCriticalSection(&cs_lock_);
    main_app_hwnd_ = mainAppWindow;
    tab_strip_hwnd_ = tabStripWindow;
    toolbar_hwnd_ = toolbarWindow;
    CreateNewTab("https://news.ycombinator.com", "Hacker News", Workspace::DEFAULT, true);
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::Shutdown() {
    EnterCriticalSection(&cs_lock_);
    all_tabs_.clear();
    active_tab_id_.clear();
    LeaveCriticalSection(&cs_lock_);
}

BrowserTab* NativeTabManager::CreateNewTab(const std::string& url,
                                          const std::string& title,
                                          Workspace workspace,
                                          bool isPinned) {
    EnterCriticalSection(&cs_lock_);

    auto tab = std::unique_ptr<BrowserTab>(new BrowserTab());
    static int id_counter = 100;
    std::ostringstream ss;
    ss << "tab-" << ++id_counter;
    tab->id = ss.str();
    tab->url = url;
    tab->title = title;
    tab->workspace = workspace;
    tab->isPinned = isPinned;
    tab->isActive = true;
    tab->isSuspended = false;
    tab->memoryAllocatedBytes = 95 * 1024 * 1024;
    tab->navigationHistory.push_back(url);
    tab->historyIndex = 0;

    tab->webView = new BlinkWebContents(url, main_app_hwnd_);
    tab->webViewHwnd = tab->webView->GetHwnd();

    for (auto& t : all_tabs_) {
        if (t->isActive) {
            t->isActive = false;
            if (t->webView) t->webView->SetVisible(false);
        }
    }

    active_tab_id_ = tab->id;
    BrowserTab* raw_ptr = tab.get();
    
    if (isPinned) {
        all_tabs_.insert(all_tabs_.begin(), std::move(tab));
    } else {
        all_tabs_.push_back(std::move(tab));
    }

    UpdateTabLayout();

    if (raw_ptr->webView) {
        raw_ptr->webView->SetVisible(true);
    }

    if (tab_strip_hwnd_) {
        InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
    }

    LeaveCriticalSection(&cs_lock_);
    return raw_ptr;
}

bool NativeTabManager::CloseTab(const std::string& tabId) {
    EnterCriticalSection(&cs_lock_);

    int idx = FindTabIndexById(tabId);
    if (idx == -1) {
        LeaveCriticalSection(&cs_lock_);
        return false;
    }

    bool was_active = all_tabs_[idx]->isActive;
    Workspace closed_workspace = all_tabs_[idx]->workspace;

    if (all_tabs_[idx]->webView) {
        delete all_tabs_[idx]->webView;
        all_tabs_[idx]->webView = nullptr;
    }

    all_tabs_.erase(all_tabs_.begin() + idx);

    if (was_active) {
        std::vector<BrowserTab*> ws_tabs = GetTabsInCurrentWorkspace();
        if (!ws_tabs.empty()) {
            int new_idx = std::min(idx, static_cast<int>(ws_tabs.size()) - 1);
            if (new_idx < 0) new_idx = 0;
            active_tab_id_ = ws_tabs[new_idx]->id;
            ws_tabs[new_idx]->isActive = true;
            if (ws_tabs[new_idx]->webView) {
                ws_tabs[new_idx]->webView->SetVisible(true);
            }
        } else {
            CreateNewTab("about:blank", "New Tab", closed_workspace, false);
        }
    }

    UpdateTabLayout();

    if (tab_strip_hwnd_) {
        InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
    }

    LeaveCriticalSection(&cs_lock_);
    return true;
}

bool NativeTabManager::CloseTabAtIndex(size_t index) {
    EnterCriticalSection(&cs_lock_);
    std::vector<BrowserTab*> ws_tabs = GetTabsInCurrentWorkspace();
    if (index >= ws_tabs.size()) {
        LeaveCriticalSection(&cs_lock_);
        return false;
    }
    std::string id_to_close = ws_tabs[index]->id;
    LeaveCriticalSection(&cs_lock_);
    return CloseTab(id_to_close);
}

bool NativeTabManager::CloseRandomTab() {
    EnterCriticalSection(&cs_lock_);
    std::vector<BrowserTab*> ws_tabs = GetTabsInCurrentWorkspace();
    if (ws_tabs.empty()) {
        LeaveCriticalSection(&cs_lock_);
        return false;
    }
    size_t random_idx = rand() % ws_tabs.size();
    std::string id_to_close = ws_tabs[random_idx]->id;
    LeaveCriticalSection(&cs_lock_);
    return CloseTab(id_to_close);
}

bool NativeTabManager::SwitchToTab(const std::string& tabId) {
    EnterCriticalSection(&cs_lock_);

    int target_idx = FindTabIndexById(tabId);
    if (target_idx == -1) {
        LeaveCriticalSection(&cs_lock_);
        return false;
    }

    for (auto& tab : all_tabs_) {
        if (tab->id == tabId) {
            tab->isActive = true;
            active_tab_id_ = tabId;
            if (!tab->isPinned) {
                current_workspace_ = tab->workspace;
            }
            if (tab->isSuspended) {
                tab->isSuspended = false;
                if (tab->webView) tab->webView->RehydrateProcess();
            }
            if (tab->webView) {
                tab->webView->SetVisible(true);
            }
        } else {
            tab->isActive = false;
            if (tab->webView) {
                tab->webView->SetVisible(false);
            }
        }
    }

    UpdateTabLayout();

    if (tab_strip_hwnd_) {
        InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
    }

    LeaveCriticalSection(&cs_lock_);
    return true;
}

void NativeTabManager::SwitchWorkspace(Workspace workspace) {
    EnterCriticalSection(&cs_lock_);
    current_workspace_ = workspace;
    
    // If the currently active tab is already in this workspace, keep it!
    BrowserTab* active = GetActiveTab();
    if (active && (active->isPinned || active->workspace == workspace)) {
        UpdateTabLayout();
        if (tab_strip_hwnd_) InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
        LeaveCriticalSection(&cs_lock_);
        return;
    }

    BrowserTab* target = nullptr;
    for (auto& tab : all_tabs_) {
        if (!tab->isPinned && tab->workspace == workspace) {
            target = tab.get();
            break;
        }
    }
    if (!target && !all_tabs_.empty()) {
        target = all_tabs_[0].get();
    }

    if (target) {
        for (auto& tab : all_tabs_) {
            if (tab->id == target->id) {
                tab->isActive = true;
                active_tab_id_ = tab->id;
                if (tab->isSuspended) {
                    tab->isSuspended = false;
                    if (tab->webView) tab->webView->RehydrateProcess();
                }
                if (tab->webView) tab->webView->SetVisible(true);
            } else {
                tab->isActive = false;
                if (tab->webView) tab->webView->SetVisible(false);
            }
        }
    } else {
        CreateNewTab("about:blank", "New Tab", workspace, false);
    }

    UpdateTabLayout();

    if (tab_strip_hwnd_) {
        InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
    }

    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::DuplicateTab(const std::string& tabId) {
    EnterCriticalSection(&cs_lock_);
    int idx = FindTabIndexById(tabId);
    if (idx != -1) {
        BrowserTab* orig = all_tabs_[idx].get();
        CreateNewTab(orig->url, orig->title + " (Copy)", orig->workspace, false);
    }
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::TogglePin(const std::string& tabId) {
    EnterCriticalSection(&cs_lock_);
    int idx = FindTabIndexById(tabId);
    if (idx != -1) {
        all_tabs_[idx]->isPinned = !all_tabs_[idx]->isPinned;
        std::stable_sort(all_tabs_.begin(), all_tabs_.end(),
            [](const std::unique_ptr<BrowserTab>& a, const std::unique_ptr<BrowserTab>& b) {
                return a->isPinned && !b->isPinned;
            });
        UpdateTabLayout();
        if (tab_strip_hwnd_) InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
    }
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::ToggleMute(const std::string& tabId) {
    EnterCriticalSection(&cs_lock_);
    int idx = FindTabIndexById(tabId);
    if (idx != -1) {
        all_tabs_[idx]->isMuted = !all_tabs_[idx]->isMuted;
        if (tab_strip_hwnd_) InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
    }
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::CloseOtherTabs(const std::string& tabId) {
    EnterCriticalSection(&cs_lock_);
    int keep_idx = FindTabIndexById(tabId);
    if (keep_idx == -1) {
        LeaveCriticalSection(&cs_lock_);
        return;
    }
    
    Workspace ws = all_tabs_[keep_idx]->workspace;
    std::vector<std::string> to_close;
    for (const auto& t : all_tabs_) {
        if (t->workspace == ws && t->id != tabId && !t->isPinned) {
            to_close.push_back(t->id);
        }
    }
    for (const auto& id : to_close) {
        CloseTab(id);
    }
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::CloseTabsToRight(const std::string& tabId) {
    EnterCriticalSection(&cs_lock_);
    std::vector<BrowserTab*> ws_tabs = GetTabsInCurrentWorkspace();
    bool found = false;
    std::vector<std::string> to_close;
    for (auto* t : ws_tabs) {
        if (found && !t->isPinned) {
            to_close.push_back(t->id);
        } else if (t->id == tabId) {
            found = true;
        }
    }
    for (const auto& id : to_close) {
        CloseTab(id);
    }
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::CloseDuplicateTabs() {
    EnterCriticalSection(&cs_lock_);
    std::vector<std::string> seen_urls;
    std::vector<std::string> to_close;
    for (const auto& tab : all_tabs_) {
        if (!tab->isPinned) {
            bool found = false;
            for (const auto& url : seen_urls) {
                if (url == tab->url) {
                    found = true;
                    break;
                }
            }
            if (found) {
                to_close.push_back(tab->id);
            } else {
                seen_urls.push_back(tab->url);
            }
        }
    }
    for (const auto& id : to_close) {
        CloseTab(id);
    }
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::SuspendInactiveTabs() {
    EnterCriticalSection(&cs_lock_);
    for (auto& tab : all_tabs_) {
        if (!tab->isActive && !tab->isPinned && !tab->isAudioPlaying) {
            tab->isSuspended = true;
            tab->memoryAllocatedBytes = 12 * 1024 * 1024;
            if (tab->webView) {
                tab->webView->SuspendProcess();
            }
        }
    }
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::ResumeTab(const std::string& tabId) {
    SwitchToTab(tabId);
}

void NativeTabManager::PaintTabStrip(HDC hdc, const RECT& stripRect) {
    EnterCriticalSection(&cs_lock_);

    HBRUSH bgBrush = CreateSolidBrush(RGB(9, 13, 22));
    FillRect(hdc, &stripRect, bgBrush);
    DeleteObject(bgBrush);

    COLORREF activeTabBg = RGB(15, 23, 42);
    COLORREF inactiveTabBg = RGB(30, 41, 59);
    COLORREF activeBorder = RGB(6, 182, 212);
    COLORREF inactiveBorder = RGB(51, 65, 85);
    COLORREF textColor = RGB(248, 250, 252);

    SetBkMode(hdc, TRANSPARENT);
    SetTextColor(hdc, textColor);

    std::vector<BrowserTab*> tabs = GetTabsInCurrentWorkspace();

    for (auto* tab : tabs) {
        RECT r = tab->tabRect;

        if (tab->isActive) {
            // Seamless merge into the toolbar below
            HBRUSH activeBrush = CreateSolidBrush(activeTabBg);
            FillRect(hdc, &r, activeBrush);
            DeleteObject(activeBrush);

            HPEN accentPen = CreatePen(PS_SOLID, 2, activeBorder);
            HPEN oldPen = (HPEN)SelectObject(hdc, accentPen);
            MoveToEx(hdc, r.left, r.top, NULL);
            LineTo(hdc, r.right, r.top);

            HPEN borderPen = CreatePen(PS_SOLID, 1, inactiveBorder);
            SelectObject(hdc, borderPen);
            MoveToEx(hdc, r.left, r.top, NULL);
            LineTo(hdc, r.left, r.bottom);
            MoveToEx(hdc, r.right - 1, r.top, NULL);
            LineTo(hdc, r.right - 1, r.bottom);

            // Erase bottom border line to visually merge with toolbar
            HPEN mergePen = CreatePen(PS_SOLID, 2, activeTabBg);
            SelectObject(hdc, mergePen);
            MoveToEx(hdc, r.left + 1, r.bottom, NULL);
            LineTo(hdc, r.right - 1, r.bottom);

            SelectObject(hdc, oldPen);
            DeleteObject(accentPen);
            DeleteObject(borderPen);
            DeleteObject(mergePen);
        } else {
            HBRUSH inactBrush = CreateSolidBrush(inactiveTabBg);
            FillRect(hdc, &r, inactBrush);
            DeleteObject(inactBrush);

            HPEN pen = CreatePen(PS_SOLID, 1, inactiveBorder);
            HPEN oldPen = (HPEN)SelectObject(hdc, pen);
            MoveToEx(hdc, r.left, r.bottom, NULL);
            LineTo(hdc, r.left, r.top);
            LineTo(hdc, r.right, r.top);
            LineTo(hdc, r.right, r.bottom);
            SelectObject(hdc, oldPen);
            DeleteObject(pen);
        }

        RECT textRect = r;
        textRect.left += (tab->isPinned ? 10 : 28);
        textRect.right -= 24;
        textRect.top += 8;

        if (!tab->isPinned) {
            std::string displayTitle = tab->isSuspended ? ("(Zzz) " + tab->title) : tab->title;
            DrawTextA(hdc, displayTitle.c_str(), -1, &textRect, DT_LEFT | DT_SINGLELINE | DT_END_ELLIPSIS | DT_VCENTER);
        } else {
            DrawTextA(hdc, "P", -1, &r, DT_CENTER | DT_SINGLELINE | DT_VCENTER);
        }
    }

    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::OnLButtonDown(POINT pt) {
    EnterCriticalSection(&cs_lock_);
    std::vector<BrowserTab*> tabs = GetTabsInCurrentWorkspace();
    for (auto* t : tabs) {
        if (PtInRect(&t->tabRect, pt)) {
            is_dragging_ = true;
            dragging_tab_id_ = t->id;
            drag_start_point_ = pt;
            drag_detached_threshold_passed_ = false;
            SwitchToTab(t->id);
            break;
        }
    }
    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::OnMouseMove(POINT pt) {
    if (!is_dragging_) return;

    EnterCriticalSection(&cs_lock_);
    
    int dy = std::abs(pt.y - drag_start_point_.y);
    if (dy > 45 && !drag_detached_threshold_passed_) {
        drag_detached_threshold_passed_ = true;
        int idx = FindTabIndexById(dragging_tab_id_);
        if (idx != -1) {
            BrowserTab* tab = all_tabs_[idx].get();
            POINT screenPt = pt;
            ClientToScreen(tab_strip_hwnd_, &screenPt);
            SpawnDetachedWindow(tab, screenPt);
            is_dragging_ = false;
        }
    } else if (!drag_detached_threshold_passed_) {
        std::vector<BrowserTab*> tabs = GetTabsInCurrentWorkspace();
        for (auto* t : tabs) {
            if (t->id != dragging_tab_id_ && PtInRect(&t->tabRect, pt)) {
                int srcIdx = FindTabIndexById(dragging_tab_id_);
                int tgtIdx = FindTabIndexById(t->id);
                if (srcIdx != -1 && tgtIdx != -1) {
                    auto moved = std::move(all_tabs_[srcIdx]);
                    all_tabs_.erase(all_tabs_.begin() + srcIdx);
                    all_tabs_.insert(all_tabs_.begin() + tgtIdx, std::move(moved));
                    UpdateTabLayout();
                    if (tab_strip_hwnd_) InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
                    break;
                }
            }
        }
    }

    LeaveCriticalSection(&cs_lock_);
}

void NativeTabManager::OnLButtonUp(POINT pt) {
    is_dragging_ = false;
    dragging_tab_id_.clear();
}

HWND NativeTabManager::SpawnDetachedWindow(BrowserTab* detachedTab, POINT spawnScreenPt) {
    HWND newWindow = CreateWindowExA(
        WS_EX_APPWINDOW,
        "STATIC",
        detachedTab->title.c_str(),
        WS_OVERLAPPEDWINDOW | WS_VISIBLE,
        spawnScreenPt.x, spawnScreenPt.y, 1000, 700,
        NULL,
        NULL,
        GetModuleHandle(NULL),
        NULL
    );

    if (newWindow && detachedTab->webView) {
        SetParent(detachedTab->webViewHwnd, newWindow);
        detachedTab->webView->Resize(0, 0, 1000, 700);
        ShowWindow(newWindow, SW_SHOW);
    }

    return newWindow;
}

void NativeTabManager::ShowNativeContextMenu(HWND hwnd, POINT screenPt, const std::string& tabId) {
    HMENU hMenu = CreatePopupMenu();
    if (!hMenu) return;

    int idx = FindTabIndexById(tabId);
    bool is_pinned = (idx != -1) ? all_tabs_[idx]->isPinned : false;
    bool is_muted = (idx != -1) ? all_tabs_[idx]->isMuted : false;

    AppendMenuA(hMenu, MF_STRING, CMD_TAB_PIN, is_pinned ? "Unpin Tab" : "Pin Tab");
    AppendMenuA(hMenu, MF_STRING, CMD_TAB_DUPLICATE, "Duplicate Tab");
    AppendMenuA(hMenu, MF_STRING, CMD_TAB_MUTE, is_muted ? "Unmute Audio" : "Mute Audio");
    AppendMenuA(hMenu, MF_STRING, CMD_TAB_SUSPEND, "Toggle Sleep (Memory Saver)");
    AppendMenuA(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenuA(hMenu, MF_STRING, CMD_TAB_CLOSE_DUPLICATES, "Close Duplicate Tabs");
    AppendMenuA(hMenu, MF_STRING, CMD_TAB_CLOSE_OTHERS, "Close Other Tabs");
    AppendMenuA(hMenu, MF_STRING, CMD_TAB_CLOSE_RIGHT, "Close Tabs to the Right");
    AppendMenuA(hMenu, MF_STRING, CMD_TAB_REOPEN_CLOSED, "Reopen Closed Tab\tCtrl+Shift+T");
    AppendMenuA(hMenu, MF_STRING, CMD_TAB_CLOSE, "Close Tab\tCtrl+W");

    int cmd = TrackPopupMenuEx(
        hMenu,
        TPM_RETURNCMD | TPM_NONOTIFY | TPM_RIGHTBUTTON,
        screenPt.x, screenPt.y,
        hwnd,
        NULL
    );

    DestroyMenu(hMenu);

    switch (cmd) {
        case CMD_TAB_PIN:              TogglePin(tabId); break;
        case CMD_TAB_DUPLICATE:        DuplicateTab(tabId); break;
        case CMD_TAB_MUTE:             ToggleMute(tabId); break;
        case CMD_TAB_SUSPEND:      
            if (idx != -1) {
                all_tabs_[idx]->isSuspended = !all_tabs_[idx]->isSuspended;
                if (tab_strip_hwnd_) InvalidateRect(tab_strip_hwnd_, NULL, TRUE);
            }
            break;
        case CMD_TAB_CLOSE_DUPLICATES: CloseDuplicateTabs(); break;
        case CMD_TAB_CLOSE_OTHERS:     CloseOtherTabs(tabId); break;
        case CMD_TAB_CLOSE_RIGHT:      CloseTabsToRight(tabId); break;
        case CMD_TAB_REOPEN_CLOSED:    break; // Handled in UI process
        case CMD_TAB_CLOSE:            CloseTab(tabId); break;
    }
}

void NativeTabManager::UpdateTabLayout() {
    std::vector<BrowserTab*> tabs = GetTabsInCurrentWorkspace();
    if (tabs.empty()) return;

    int current_x = 8;
    int pinned_count = 0;
    int standard_count = 0;

    for (auto* t : tabs) {
        if (t->isPinned) pinned_count++;
        else standard_count++;
    }

    int available_width = 1200 - (pinned_count * PINNED_TAB_WIDTH) - 40;
    int tab_width = MAX_TAB_WIDTH;
    if (standard_count > 0) {
        tab_width = available_width / standard_count;
        if (tab_width > MAX_TAB_WIDTH) tab_width = MAX_TAB_WIDTH;
        if (tab_width < MIN_TAB_WIDTH) tab_width = MIN_TAB_WIDTH;
    }

    for (auto* t : tabs) {
        int w = t->isPinned ? PINNED_TAB_WIDTH : tab_width;
        t->tabRect.left = current_x;
        t->tabRect.top = 4;
        t->tabRect.right = current_x + w;
        t->tabRect.bottom = TAB_HEIGHT;
        current_x += w + 4;
    }
}

int NativeTabManager::FindTabIndexById(const std::string& tabId) {
    for (size_t i = 0; i < all_tabs_.size(); ++i) {
        if (all_tabs_[i]->id == tabId) return static_cast<int>(i);
    }
    return -1;
}

std::vector<BrowserTab*> NativeTabManager::GetTabsInCurrentWorkspace() {
    std::vector<BrowserTab*> result;
    for (auto& tab : all_tabs_) {
        if (tab->isPinned || tab->workspace == current_workspace_) {
            result.push_back(tab.get());
        }
    }
    return result;
}

BrowserTab* NativeTabManager::GetActiveTab() {
    for (auto& tab : all_tabs_) {
        if (tab->isActive) return tab.get();
    }
    return all_tabs_.empty() ? nullptr : all_tabs_[0].get();
}

size_t NativeTabManager::GetTotalOpenTabsCount() {
    return all_tabs_.size();
}

} // namespace native
} // namespace antigravity
