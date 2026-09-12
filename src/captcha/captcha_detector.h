#pragma once

#include "agent_types.h"
#include <string>

namespace ai_browser {

// Layer 2: Real-time CAPTCHA and Bot Challenge Signature Detector
class CaptchaDetector {
public:
    CaptchaDetector();
    ~CaptchaDetector();

    // Scans page HTML, iframes, and script tags for anti-bot challenge signatures
    CaptchaDetectionResult Detect(const std::string& html, const std::string& page_url = "") const;

    // Helper to check if a specific string contains Cloudflare, reCAPTCHA, hCaptcha, etc.
    bool HasChallengeSignatures(const std::string& text) const;
};

} // namespace ai_browser
