#pragma once

#include "tab_manager.h"
#include <string>
#include <vector>
#include <memory>

namespace ai_browser {

class NavigationController {
public:
    explicit NavigationController(std::shared_ptr<WebContents> web_contents);
    ~NavigationController();

    // Emulates WebContents::GetController().LoadURL() - direct in-process call
    bool LoadURL(const std::string& url);
    bool GoBack();
    bool GoForward();
    bool Reload();

    const std::string& GetCurrentURL() const;
    bool CanGoBack() const;
    bool CanGoForward() const;

private:
    std::shared_ptr<WebContents> web_contents_;
    std::vector<std::string> history_;
    int current_history_index_ = -1;
};

} // namespace ai_browser
