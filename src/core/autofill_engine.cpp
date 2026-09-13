#include "autofill_engine.h"
#include <regex>
#include <algorithm>
#include <iostream>

namespace ai_browser {

namespace {

std::string ToLower(const std::string& str) {
    std::string lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return lower;
}

bool Contains(const std::string& haystack, const std::string& needle) {
    return haystack.find(needle) != std::string::npos;
}

} // namespace

AutofillEngine::AutofillEngine() = default;
AutofillEngine::~AutofillEngine() = default;

AutofillFieldType AutofillEngine::ClassifyField(const FormFieldData& field) const {
    std::string ac = ToLower(field.autocomplete_attribute);
    std::string name = ToLower(field.name);
    std::string id = ToLower(field.id);
    std::string label = ToLower(field.label);
    std::string type = ToLower(field.form_control_type);

    // 1. Autocomplete attribute matches (Chromium Autofill primary signals)
    if (ac == "name") return AutofillFieldType::FullName;
    if (ac == "given-name") return AutofillFieldType::FirstName;
    if (ac == "family-name") return AutofillFieldType::LastName;
    if (ac == "email") return AutofillFieldType::Email;
    if (ac == "tel" || ac == "phone") return AutofillFieldType::Phone;
    if (ac == "address-line1") return AutofillFieldType::AddressLine1;
    if (ac == "address-line2") return AutofillFieldType::AddressLine2;
    if (ac == "address-level2") return AutofillFieldType::City;
    if (ac == "address-level1") return AutofillFieldType::State;
    if (ac == "postal-code") return AutofillFieldType::PostalCode;
    if (ac == "country" || ac == "country-name") return AutofillFieldType::Country;
    if (ac == "cc-number") return AutofillFieldType::CreditCardNumber;
    if (ac == "cc-exp-month") return AutofillFieldType::CreditCardExpMonth;
    if (ac == "cc-exp-year") return AutofillFieldType::CreditCardExpYear;
    if (ac == "cc-csc") return AutofillFieldType::CreditCardCvc;

    // 2. Control type matches
    if (type == "email") return AutofillFieldType::Email;
    if (type == "tel") return AutofillFieldType::Phone;

    // 3. Name / Label / Id Heuristic matches (Chromium pattern heuristics)
    std::string combined = name + " " + id + " " + label;

    if (Contains(combined, "email") || Contains(combined, "e-mail")) {
        return AutofillFieldType::Email;
    }
    if (Contains(combined, "first name") || Contains(combined, "firstname") || Contains(combined, "fname")) {
        return AutofillFieldType::FirstName;
    }
    if (Contains(combined, "last name") || Contains(combined, "lastname") || Contains(combined, "lname")) {
        return AutofillFieldType::LastName;
    }
    if (Contains(combined, "full name") || Contains(combined, "fullname") || combined.find("name") != std::string::npos) {
        if (!Contains(combined, "user") && !Contains(combined, "company")) {
            return AutofillFieldType::FullName;
        }
    }
    if (Contains(combined, "phone") || Contains(combined, "mobile") || Contains(combined, "telephone")) {
        return AutofillFieldType::Phone;
    }
    if (Contains(combined, "card number") || Contains(combined, "cardnumber") || Contains(combined, "cc_number") || Contains(combined, "card-element")) {
        return AutofillFieldType::CreditCardNumber;
    }
    if (Contains(combined, "cvv") || Contains(combined, "cvc") || Contains(combined, "security code")) {
        return AutofillFieldType::CreditCardCvc;
    }
    if (Contains(combined, "exp month") || Contains(combined, "expiry month") || Contains(combined, "exp_month")) {
        return AutofillFieldType::CreditCardExpMonth;
    }
    if (Contains(combined, "exp year") || Contains(combined, "expiry year") || Contains(combined, "exp_year")) {
        return AutofillFieldType::CreditCardExpYear;
    }
    if (Contains(combined, "zip") || Contains(combined, "postal") || Contains(combined, "postcode")) {
        return AutofillFieldType::PostalCode;
    }
    if (Contains(combined, "city") || Contains(combined, "town")) {
        return AutofillFieldType::City;
    }
    if (Contains(combined, "state") || Contains(combined, "province")) {
        return AutofillFieldType::State;
    }
    if (Contains(combined, "address line 2") || Contains(combined, "apt") || Contains(combined, "suite")) {
        return AutofillFieldType::AddressLine2;
    }
    if (Contains(combined, "address") || Contains(combined, "street")) {
        return AutofillFieldType::AddressLine1;
    }
    if (Contains(combined, "country")) {
        return AutofillFieldType::Country;
    }

    return AutofillFieldType::FullName;
}

std::vector<FormStructure> AutofillEngine::ParseForms(const std::string& html) {
    std::vector<FormStructure> forms;

    // Fast regex parser for <form> ... </form> and input elements
    std::regex form_regex(R"(<form\b([^>]*)>([\s\S]*?)<\/form>)", std::regex_constants::icase);
    std::regex input_regex(R"(<input\b([^>]*)>)", std::regex_constants::icase);
    std::regex attr_regex(R"((\w+)=["']([^"']*)["'])");

    auto form_begin = std::sregex_iterator(html.begin(), html.end(), form_regex);
    auto form_end = std::sregex_iterator();

    int form_idx = 1;
    for (auto it = form_begin; it != form_end; ++it) {
        std::smatch match = *it;
        std::string form_attrs = match[1].str();
        std::string form_content = match[2].str();

        FormStructure form;
        form.form_id = "form_" + std::to_string(form_idx++);

        // Parse form attributes
        auto attr_begin = std::sregex_iterator(form_attrs.begin(), form_attrs.end(), attr_regex);
        auto attr_end = std::sregex_iterator();
        for (auto a = attr_begin; a != attr_end; ++a) {
            std::string attr_name = ToLower((*a)[1].str());
            std::string attr_val = (*a)[2].str();
            if (attr_name == "id") form.form_id = attr_val;
            else if (attr_name == "name") form.form_name = attr_val;
            else if (attr_name == "action") form.action_url = attr_val;
        }

        // Parse form inputs
        auto in_begin = std::sregex_iterator(form_content.begin(), form_content.end(), input_regex);
        auto in_end = std::sregex_iterator();

        for (auto i = in_begin; i != in_end; ++i) {
            std::string input_attrs = (*i)[1].str();
            FormFieldData field;
            field.form_control_type = "text";

            auto f_attr_begin = std::sregex_iterator(input_attrs.begin(), input_attrs.end(), attr_regex);
            auto f_attr_end = std::sregex_iterator();
            for (auto fa = f_attr_begin; fa != f_attr_end; ++fa) {
                std::string k = ToLower((*fa)[1].str());
                std::string v = (*fa)[2].str();
                if (k == "id") field.id = v;
                else if (k == "name") field.name = v;
                else if (k == "type") field.form_control_type = v;
                else if (k == "placeholder") field.placeholder = v;
                else if (k == "autocomplete") field.autocomplete_attribute = v;
                else if (k == "value") field.value = v;
            }

            // Skip hidden or submit buttons
            if (field.form_control_type != "hidden" && field.form_control_type != "submit" && field.form_control_type != "button") {
                field.detected_type = ClassifyField(field);
                form.fields.push_back(field);
            }
        }

        if (!form.fields.empty()) {
            forms.push_back(form);
        }
    }

    return forms;
}

bool AutofillEngine::FillForm(FormStructure& form, const AutofillProfile& profile, std::string& simulated_dom_html) {
    if (form.fields.empty()) return false;

    for (auto& field : form.fields) {
        auto val = profile.Get(field.detected_type);
        if (val) {
            field.value = *val;

            // Direct in-memory simulated DOM update (matching C++ AutofillManager::FillForm)
            if (!field.id.empty()) {
                std::string target_id_attr = "id=\"" + field.id + "\"";
                size_t pos = simulated_dom_html.find(target_id_attr);
                if (pos != std::string::npos) {
                    // Update value attribute in simulated DOM
                    simulated_dom_html.insert(pos + target_id_attr.length(), " value=\"" + val.value() + "\"");
                }
            }
        }
    }

    return true;
}

} // namespace ai_browser
