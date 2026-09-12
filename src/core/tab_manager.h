#pragma once

#include "agent_types.h"
#include <string>
#include <vector>
#include <memory>
#include <functional>

namespace ai_browser {

// Representation of in-process WebContents
class WebContents {
public:
    explicit WebContents(uint32_t id, const std::string& initial_url = "about:blank");
    uint32_t GetId() const { return id_; }
    const std::string& GetURL() const { return current_url_; }
    void SetURL(const std::string& url) { current_url_ = url; }
    const std::string& GetTitle() const { return title_; }
    void SetTitle(const std::string& title) { title_ = title; }
    const std::string& GetSourceHTML() const { return source_html_; }
    void SetSourceHTML(const std::string& html) { source_html_ = html; }

private:
    uint32_t id_;
    std::string current_url_;
    std::string title_;
    std::string source_html_;
};

// In-process abstraction of Chromium's TabStripModel (chrome/browser/ui/tabs/tab_strip_model.h)
class TabStripModel {
public:
    TabStripModel();
    ~TabStripModel();

    // Direct C++ in-process calls matching Chromium API
    int InsertWebContentsAt(int index, std::shared_ptr<WebContents> contents, bool make_active = true);
    bool CloseWebContentsAt(int index);
    bool ActivateTabAt(int index);

    int GetTabCount() const;
    int GetActiveIndex() const;
    std::shared_ptr<WebContents> GetActiveWebContents() const;
    std::shared_ptr<WebContents> GetWebContentsAt(int index) const;

    // Callbacks for agent observing tab lifecycle
    void SetTabActivatedCallback(std::function<void(int index, std::shared_ptr<WebContents>)> callback);

private:
    std::vector<std::shared_ptr<WebContents>> tabs_;
    int active_index_ = -1;
    uint32_t next_tab_id_ = 1;
    std::function<void(int, std::shared_ptr<WebContents>)> on_tab_activated_;
};

} // namespace ai_browser
