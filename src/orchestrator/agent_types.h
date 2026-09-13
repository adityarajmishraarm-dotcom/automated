#pragma once

#include <string>
#include <vector>
#include "optional_compat.h"
#include <cstdint>
#include <map>

namespace ai_browser {

using ElementId = uint32_t;

struct Rect {
    double x = 0.0;
    double y = 0.0;
    double width = 0.0;
    double height = 0.0;
};

struct Point {
    double x = 0.0;
    double y = 0.0;
};

// Layer 2: Extracted Interactive Element
struct InteractiveElement {
    ElementId id = 0;                     // 1-indexed monotonic ID (e.g., 1, 2, 3...)
    int64_t backend_node_id = 0;          // Engine-level internal node ID
    std::string tag;                     // 'BUTTON', 'A', 'INPUT', etc.
    std::string role;                    // 'button', 'link', 'textbox', etc.
    std::string name;                    // Accessible name / aria-label / title / text
    std::string placeholder;             // Optional placeholder for inputs
    std::string input_type;              // 'text', 'password', 'email', etc.
    std::string value;                   // Current value or href
    Rect rect;                           // Bounding box
    Point center;                        // Center coordinate for clicking
    bool is_scrollable = false;
    bool is_focused = false;
    bool is_clickable = false;
    bool is_typable = false;
};

// Layer 2: Grep Result with ±10 context lines & pagination
struct GrepMatch {
    size_t line_number = 0;
    std::string matched_line;
    std::vector<std::string> top_10_lines;     // Up to 10 preceding lines
    std::vector<std::string> bottom_10_lines;  // Up to 10 succeeding lines
};

struct GrepResult {
    std::string query;
    size_t total_matches = 0;
    size_t current_offset = 0;
    size_t returned_count = 0;
    bool has_more = false;
    size_t next_offset = 0;
    std::vector<GrepMatch> matches;
};

// Layer 1/2: Autofill Profile for components/autofill
enum class AutofillFieldType {
    FullName,
    FirstName,
    LastName,
    Email,
    Phone,
    AddressLine1,
    AddressLine2,
    City,
    State,
    PostalCode,
    Country,
    CreditCardNumber,
    CreditCardExpMonth,
    CreditCardExpYear,
    CreditCardCvc
};

struct AutofillProfile {
    std::map<AutofillFieldType, std::string> fields;

    void Set(AutofillFieldType type, const std::string& val) {
        fields[type] = val;
    }

    std::optional<std::string> Get(AutofillFieldType type) const {
        auto it = fields.find(type);
        if (it != fields.end()) return it->second;
        return std::nullopt;
    }
};

// Layer 3: CAPTCHA Classification
enum class CaptchaType {
    None,
    CloudflareTurnstile,
    GoogleReCaptchaV2,
    GoogleReCaptchaV3,
    HCaptcha,
    DataDome,
    AwsWaf
};

struct CaptchaDetectionResult {
    bool detected = false;
    CaptchaType type = CaptchaType::None;
    std::string type_name = "None";
    std::string sitekey;
    std::string challenge_url;
    std::string frame_selector;
    bool is_behavioral_invisible = false;
};

// Layer 3: Action Dispatching
enum class ActionType {
    Click,
    Type,
    Scroll,
    Autofill,
    Navigate,
    NewTab,
    CloseTab,
    SwitchTab,
    GrepSource,
    SolveCaptcha,
    HumanTakeover
};

struct ActionCommand {
    ActionType type = ActionType::Click;
    ElementId target_id = 0;
    std::string text_payload;
    double scroll_dy = 0.0;
    std::string navigate_url;
    AutofillProfile autofill_profile;
    std::string grep_query;
    size_t grep_offset = 0;
    size_t grep_limit = 10;
};

struct ExecutionResult {
    bool success = false;
    bool precondition_met = false;
    bool state_diff_detected = false;
    bool url_changed = false;
    bool dom_mutated = false;
    std::string new_url;
    std::string message;
};

} // namespace ai_browser
