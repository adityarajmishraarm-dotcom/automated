#pragma once

#include "agent_types.h"
#include <string>
#include <vector>
#include <map>

namespace ai_browser {

// Representation of parsed form field matching components/autofill/core/browser/autofill_field.h
struct FormFieldData {
    std::string id;
    std::string name;
    std::string label;
    std::string placeholder;
    std::string autocomplete_attribute;
    std::string form_control_type; // "text", "email", "tel", "password", etc.
    std::string value;
    AutofillFieldType detected_type = AutofillFieldType::FullName;
};

// Representation of HTML form matching components/autofill/core/browser/form_structure.h
struct FormStructure {
    std::string form_id;
    std::string form_name;
    std::string action_url;
    std::vector<FormFieldData> fields;
};

// Emulates Chromium's AutofillManager (components/autofill/core/browser/autofill_manager.h)
class AutofillEngine {
public:
    AutofillEngine();
    ~AutofillEngine();

    // Parses raw HTML form structures and runs Chromium's decade-tuned semantic field classification
    std::vector<FormStructure> ParseForms(const std::string& html);

    // Direct C++ in-process FillForm matching AutofillManager::FillForm()
    // Populates fields according to AutofillProfile without brittle selector scripts
    bool FillForm(FormStructure& form, const AutofillProfile& profile, std::string& simulated_dom_html);

    // Helper to classify a field based on autocomplete attribute, name, label, and id
    AutofillFieldType ClassifyField(const FormFieldData& field) const;
};

} // namespace ai_browser
