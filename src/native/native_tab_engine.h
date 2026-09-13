#ifndef ANTIGRAVITY_NATIVE_TAB_ENGINE_H_
#define ANTIGRAVITY_NATIVE_TAB_ENGINE_H_

#define _WIN32_WINNT 0x0600
#include <windows.h>
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <algorithm>

#include "../core/mutex_compat.h"

namespace antigravity {
namespace native {

// =============================================================================
// 1. NATIVE DATA ARCHITECTURE
// =============================================================================

enum class Workspace {
    DEFAULT = 0,
    WORK,
    PERSONAL,
    RESEARCH
};

class BlinkWebContents;

struct BrowserTab {
    std::string id;
    Workspace workspace = Workspace::DEFAULT;
    std::string title;
    std::string url;
    bool isActive = false;
    bool isPinned = false;
    bool isSuspended = false; // Memory-saving sleep state
    bool isAudioPlaying = false;
    bool isMuted = false;
    
    // Native webview instance
    BlinkWebContents* webView = nullptr;
    HWND webViewHwnd = NULL;
    RECT tabRect = {0, 0, 0, 0};
    
    size_t memoryAllocatedBytes = 0;
    std::vector<std::string> navigationHistory;
    int historyIndex = -1;
};

class BlinkWebContents {
public:
    explicit BlinkWebContents(const std::string& initialUrl, HWND parentHwnd);
    ~BlinkWebContents();

    void LoadURL(const std::string& url);
    void SetVisible(bool visible);
    void SuspendProcess();
    void RehydrateProcess();
    bool IsSuspended() const { return is_suspended_; }
    HWND GetHwnd() const { return hwnd_; }
    void Resize(int x, int y, int width, int height);

private:
    std::string current_url_;
    HWND parent_hwnd_;
    HWND hwnd_;
    bool is_suspended_ = false;
};

// =============================================================================
// 2. NATIVE TAB MANAGER SINGLETON
// =============================================================================

class NativeTabManager {
public:
    static NativeTabManager& GetInstance();

    void Initialize(HWND mainAppWindow, HWND tabStripWindow, HWND toolbarWindow);
    void Shutdown();

    BrowserTab* CreateNewTab(const std::string& url = "about:blank",
                             const std::string& title = "New Tab",
                             Workspace workspace = Workspace::DEFAULT,
                             bool isPinned = false);
    
    bool CloseTab(const std::string& tabId);
    bool CloseTabAtIndex(size_t index);
    bool CloseRandomTab();
    bool SwitchToTab(const std::string& tabId);
    void SwitchWorkspace(Workspace workspace);
    void DuplicateTab(const std::string& tabId);
    void TogglePin(const std::string& tabId);
    void ToggleMute(const std::string& tabId);
    void CloseOtherTabs(const std::string& tabId);
    void CloseTabsToRight(const std::string& tabId);
    void CloseDuplicateTabs();

    void SuspendInactiveTabs();
    void ResumeTab(const std::string& tabId);

    // Custom Painting (Active Tab merges with Toolbar)
    void PaintTabStrip(HDC hdc, const RECT& stripRect);

    // OS Drag-and-Drop & Window Detachment
    void OnLButtonDown(POINT pt);
    void OnMouseMove(POINT pt);
    void OnLButtonUp(POINT pt);
    bool IsDragging() const { return is_dragging_; }

    // Win32 Right-Click Context Menu
    void ShowNativeContextMenu(HWND hwnd, POINT screenPt, const std::string& tabId);

    std::vector<BrowserTab*> GetTabsInCurrentWorkspace();
    BrowserTab* GetActiveTab();
    Workspace GetCurrentWorkspace() const { return current_workspace_; }
    size_t GetTotalOpenTabsCount();

private:
    NativeTabManager();
    ~NativeTabManager();

    NativeTabManager(const NativeTabManager&) = delete;
    NativeTabManager& operator=(const NativeTabManager&) = delete;

    int FindTabIndexById(const std::string& tabId);
    void UpdateTabLayout();
    HWND SpawnDetachedWindow(BrowserTab* detachedTab, POINT spawnScreenPt);

    CRITICAL_SECTION cs_lock_;
    std::vector<std::unique_ptr<BrowserTab>> all_tabs_;
    std::string active_tab_id_;
    Workspace current_workspace_ = Workspace::DEFAULT;

    HWND main_app_hwnd_ = NULL;
    HWND tab_strip_hwnd_ = NULL;
    HWND toolbar_hwnd_ = NULL;

    bool is_dragging_ = false;
    std::string dragging_tab_id_;
    POINT drag_start_point_ = {0, 0};
    bool drag_detached_threshold_passed_ = false;

    static const int PINNED_TAB_WIDTH = 40;
    static const int TAB_HEIGHT = 36;
    static const int MIN_TAB_WIDTH = 48;
    static const int MAX_TAB_WIDTH = 220;
};

enum NativeTabMenuCommands {
    CMD_TAB_PIN = 2001,
    CMD_TAB_DUPLICATE,
    CMD_TAB_MUTE,
    CMD_TAB_SUSPEND,
    CMD_TAB_CLOSE_OTHERS,
    CMD_TAB_CLOSE_RIGHT,
    CMD_TAB_CLOSE_DUPLICATES,
    CMD_TAB_REOPEN_CLOSED,
    CMD_TAB_CLOSE
};

} // namespace native
} // namespace antigravity

#endif // ANTIGRAVITY_NATIVE_TAB_ENGINE_H_
