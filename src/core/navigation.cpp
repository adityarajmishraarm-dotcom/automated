#include "navigation.h"

namespace ai_browser {

NavigationController::NavigationController(std::shared_ptr<WebContents> web_contents)
    : web_contents_(std::move(web_contents)) {
    if (web_contents_) {
        history_.push_back(web_contents_->GetURL());
        current_history_index_ = 0;
    }
}

NavigationController::~NavigationController() = default;

bool NavigationController::LoadURL(const std::string& url) {
    if (!web_contents_) return false;

    // Direct in-process URL update
    web_contents_->SetURL(url);

    // Truncate forward history and push new entry
    if (current_history_index_ >= 0 && current_history_index_ < static_cast<int>(history_.size()) - 1) {
        history_.erase(history_.begin() + current_history_index_ + 1, history_.end());
    }

    history_.push_back(url);
    current_history_index_ = static_cast<int>(history_.size()) - 1;
    return true;
}

bool NavigationController::GoBack() {
    if (!CanGoBack()) return false;
    current_history_index_--;
    web_contents_->SetURL(history_[current_history_index_]);
    return true;
}

bool NavigationController::GoForward() {
    if (!CanGoForward()) return false;
    current_history_index_++;
    web_contents_->SetURL(history_[current_history_index_]);
    return true;
}

bool NavigationController::Reload() {
    if (!web_contents_ || current_history_index_ < 0) return false;
    return LoadURL(history_[current_history_index_]);
}

const std::string& NavigationController::GetCurrentURL() const {
    static const std::string empty;
    return web_contents_ ? web_contents_->GetURL() : empty;
}

bool NavigationController::CanGoBack() const {
    return current_history_index_ > 0;
}

bool NavigationController::CanGoForward() const {
    return current_history_index_ >= 0 && current_history_index_ < static_cast<int>(history_.size()) - 1;
}

} // namespace ai_browser
