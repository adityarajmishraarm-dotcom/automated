#include "undo_close_stack.h"
#include <algorithm>

namespace ai_browser {

UndoCloseStack::UndoCloseStack(size_t max_capacity)
    : max_capacity_(max_capacity == 0 ? 50 : max_capacity) {}

UndoCloseStack::~UndoCloseStack() = default;

void UndoCloseStack::Push(const TabStateSnapshot& snapshot) {
    std::lock_guard<std::mutex> lock(mutex_);
    stack_.push_front(snapshot);

    while (stack_.size() > max_capacity_) {
        stack_.pop_back();
    }
}

std::optional<TabStateSnapshot> UndoCloseStack::Pop(WindowId window_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    for (auto it = stack_.begin(); it != stack_.end(); ++it) {
        if (it->window_id == window_id) {
            TabStateSnapshot snapshot = *it;
            stack_.erase(it);
            return snapshot;
        }
    }
    return std::nullopt;
}

std::optional<TabStateSnapshot> UndoCloseStack::PopGlobal() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (stack_.empty()) {
        return std::nullopt;
    }
    TabStateSnapshot snapshot = stack_.front();
    stack_.pop_front();
    return snapshot;
}

std::optional<TabStateSnapshot> UndoCloseStack::Peek(WindowId window_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    for (const auto& item : stack_) {
        if (item.window_id == window_id) {
            return item;
        }
    }
    return std::nullopt;
}

std::optional<TabStateSnapshot> UndoCloseStack::PeekGlobal() const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (stack_.empty()) {
        return std::nullopt;
    }
    return stack_.front();
}

size_t UndoCloseStack::GetCount(WindowId window_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    size_t count = 0;
    for (const auto& item : stack_) {
        if (item.window_id == window_id) {
            count++;
        }
    }
    return count;
}

size_t UndoCloseStack::GetTotalCount() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return stack_.size();
}

void UndoCloseStack::SetCapacity(size_t capacity) {
    std::lock_guard<std::mutex> lock(mutex_);
    max_capacity_ = (capacity == 0 ? 1 : capacity);
    while (stack_.size() > max_capacity_) {
        stack_.pop_back();
    }
}

void UndoCloseStack::Clear() {
    std::lock_guard<std::mutex> lock(mutex_);
    stack_.clear();
}

void UndoCloseStack::ClearForWindow(WindowId window_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = stack_.begin();
    while (it != stack_.end()) {
        if (it->window_id == window_id) {
            it = stack_.erase(it);
        } else {
            ++it;
        }
    }
}

std::vector<TabStateSnapshot> UndoCloseStack::GetAllSnapshots() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return std::vector<TabStateSnapshot>(stack_.begin(), stack_.end());
}

void UndoCloseStack::RestoreSnapshots(const std::vector<TabStateSnapshot>& snapshots) {
    std::lock_guard<std::mutex> lock(mutex_);
    stack_.clear();
    for (const auto& s : snapshots) {
        stack_.push_back(s);
        if (stack_.size() >= max_capacity_) {
            break;
        }
    }
}

} // namespace ai_browser
