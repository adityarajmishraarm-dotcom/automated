#include "tab_manager.h"
#include <algorithm>
#include <iostream>

namespace ai_browser {

WebContents::WebContents(uint32_t id, const std::string& initial_url)
    : id_(id), current_url_(initial_url), title_("New Tab") {}

TabStripModel::TabStripModel() = default;
TabStripModel::~TabStripModel() = default;

int TabStripModel::InsertWebContentsAt(int index, std::shared_ptr<WebContents> contents, bool make_active) {
    if (!contents) return -1;
    if (index < 0 || index > static_cast<int>(tabs_.size())) {
        index = static_cast<int>(tabs_.size());
    }

    tabs_.insert(tabs_.begin() + index, contents);

    if (make_active || active_index_ == -1) {
        ActivateTabAt(index);
    } else if (index <= active_index_) {
        active_index_++;
    }

    return index;
}

bool TabStripModel::CloseWebContentsAt(int index) {
    if (index < 0 || index >= static_cast<int>(tabs_.size())) {
        return false;
    }

    tabs_.erase(tabs_.begin() + index);

    if (tabs_.empty()) {
        active_index_ = -1;
    } else if (active_index_ >= static_cast<int>(tabs_.size())) {
        ActivateTabAt(static_cast<int>(tabs_.size()) - 1);
    } else if (index < active_index_) {
        active_index_--;
    } else if (index == active_index_) {
        ActivateTabAt(std::min(index, static_cast<int>(tabs_.size()) - 1));
    }

    return true;
}

bool TabStripModel::ActivateTabAt(int index) {
    if (index < 0 || index >= static_cast<int>(tabs_.size())) {
        return false;
    }
    active_index_ = index;
    if (on_tab_activated_) {
        on_tab_activated_(active_index_, tabs_[active_index_]);
    }
    return true;
}

int TabStripModel::GetTabCount() const {
    return static_cast<int>(tabs_.size());
}

int TabStripModel::GetActiveIndex() const {
    return active_index_;
}

std::shared_ptr<WebContents> TabStripModel::GetActiveWebContents() const {
    if (active_index_ >= 0 && active_index_ < static_cast<int>(tabs_.size())) {
        return tabs_[active_index_];
    }
    return nullptr;
}

std::shared_ptr<WebContents> TabStripModel::GetWebContentsAt(int index) const {
    if (index >= 0 && index < static_cast<int>(tabs_.size())) {
        return tabs_[index];
    }
    return nullptr;
}

void TabStripModel::SetTabActivatedCallback(std::function<void(int, std::shared_ptr<WebContents>)> callback) {
    on_tab_activated_ = std::move(callback);
}

} // namespace ai_browser
