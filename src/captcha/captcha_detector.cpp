#include "captcha_detector.h"
#include <regex>
#include <algorithm>

namespace ai_browser {

namespace {

std::string ExtractMatch(const std::string& text, const std::string& pattern) {
    std::regex r(pattern, std::regex::icase);
    std::smatch m;
    if (std::regex_search(text, m, r) && m.size() > 1) {
        return m[1].str();
    }
    return "";
}

} // namespace

CaptchaDetector::CaptchaDetector() = default;
CaptchaDetector::~CaptchaDetector() = default;

bool CaptchaDetector::HasChallengeSignatures(const std::string& text) const {
    return text.find("cf-turnstile") != std::string::npos ||
           text.find("challenges.cloudflare.com") != std::string::npos ||
           text.find("recaptcha") != std::string::npos ||
           text.find("hcaptcha") != std::string::npos ||
           text.find("datadome") != std::string::npos ||
           text.find("aws-waf") != std::string::npos;
}

CaptchaDetectionResult CaptchaDetector::Detect(const std::string& html, const std::string& page_url) const {
    CaptchaDetectionResult result;
    result.challenge_url = page_url;

    // 1. Cloudflare Turnstile
    if (html.find("cf-turnstile") != std::string::npos || html.find("challenges.cloudflare.com") != std::string::npos) {
        result.detected = true;
        result.type = CaptchaType::CloudflareTurnstile;
        result.type_name = "Cloudflare Turnstile";
        result.frame_selector = "iframe[src*='challenges.cloudflare.com'], .cf-turnstile";
        result.sitekey = ExtractMatch(html, R"(data-sitekey=["']([^"']+)["'])");
        if (result.sitekey.empty()) {
            result.sitekey = ExtractMatch(html, R"(sitekey:\s*["']([^"']+)["'])");
        }
        result.is_behavioral_invisible = (html.find("data-action=") != std::string::npos);
        return result;
    }

    // 2. Google reCAPTCHA v2 / v3
    if (html.find("recaptcha") != std::string::npos || html.find("www.google.com/recaptcha") != std::string::npos) {
        result.detected = true;
        result.frame_selector = "iframe[src*='recaptcha/api2'], .g-recaptcha";
        result.sitekey = ExtractMatch(html, R"(data-sitekey=["']([^"']+)["'])");
        if (result.sitekey.empty()) {
            result.sitekey = ExtractMatch(html, R"(render:\s*["']([^"']+)["'])");
        }

        if (html.find("recaptcha/api.js?render=") != std::string::npos || html.find("grecaptcha.execute") != std::string::npos) {
            result.type = CaptchaType::GoogleReCaptchaV3;
            result.type_name = "Google reCAPTCHA v3";
            result.is_behavioral_invisible = true;
        } else {
            result.type = CaptchaType::GoogleReCaptchaV2;
            result.type_name = "Google reCAPTCHA v2";
            result.is_behavioral_invisible = false;
        }
        return result;
    }

    // 3. hCaptcha
    if (html.find("hcaptcha.com") != std::string::npos || html.find("h-captcha") != std::string::npos) {
        result.detected = true;
        result.type = CaptchaType::HCaptcha;
        result.type_name = "hCaptcha";
        result.frame_selector = "iframe[src*='hcaptcha.com'], .h-captcha";
        result.sitekey = ExtractMatch(html, R"(data-sitekey=["']([^"']+)["'])");
        return result;
    }

    // 4. DataDome
    if (html.find("datadome.js") != std::string::npos || html.find("dd.js") != std::string::npos || html.find("datadome-captcha") != std::string::npos) {
        result.detected = true;
        result.type = CaptchaType::DataDome;
        result.type_name = "DataDome";
        result.frame_selector = "#datadome-captcha, iframe[src*='datadome']";
        return result;
    }

    // 5. AWS WAF Captcha
    if (html.find("token.awswaf.com") != std::string::npos || html.find("aws-waf-captcha") != std::string::npos) {
        result.detected = true;
        result.type = CaptchaType::AwsWaf;
        result.type_name = "AWS WAF Captcha";
        result.frame_selector = "#aws-waf-captcha";
        return result;
    }

    return result;
}

} // namespace ai_browser
