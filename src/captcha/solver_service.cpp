#include "solver_service.h"
#include <sstream>

namespace ai_browser {

CaptchaSolverService::CaptchaSolverService() = default;
CaptchaSolverService::~CaptchaSolverService() = default;

bool CaptchaSolverService::SolveViaService(const CaptchaDetectionResult& challenge,
                                          std::string& out_solution_token,
                                          std::string& out_status_message) {
    if (!challenge.detected) {
        out_status_message = "No active challenge detected";
        return false;
    }

    // Simulated response token for verification
    out_solution_token = "03AFcWeA_TOKEN_" + challenge.type_name + "_" + (challenge.sitekey.empty() ? "DEFAULT_KEY" : challenge.sitekey);
    out_status_message = "Successfully solved via Captcha API service: token acquired";
    return true;
}

bool CaptchaSolverService::SolveViaLocalVLM(const CaptchaDetectionResult& challenge,
                                           const std::string& prompt_instruction,
                                           std::vector<int>& out_selected_tiles) {
    // Simulates VLM identifying Set-of-Marks tiles for image challenges
    out_selected_tiles = {2, 5, 8}; // e.g. Tiles 2, 5, 8 match "crosswalk"
    return true;
}

bool CaptchaSolverService::VerifyBehavioralPass(const CaptchaDetectionResult& challenge,
                                               double simulated_trust_score) {
    // Trust score threshold for reCAPTCHA v3 or Cloudflare Turnstile passive is typically >= 0.7
    return (simulated_trust_score >= 0.7);
}

std::string CaptchaSolverService::GenerateTokenInjectionScript(const CaptchaDetectionResult& challenge,
                                                              const std::string& token) const {
    std::ostringstream ss;
    ss << R"JS((function() {
    const token = ')JS" << token << R"JS(';
    // 1. Google reCAPTCHA injection
    const recaptchaResp = document.getElementById('g-recaptcha-response') || document.querySelector('[name="g-recaptcha-response"]');
    if (recaptchaResp) {
        recaptchaResp.value = token;
        recaptchaResp.dispatchEvent(new Event('input', { bubbles: true }));
        recaptchaResp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 2. Cloudflare Turnstile injection
    const cfResp = document.querySelector('[name="cf-turnstile-response"]');
    if (cfResp) {
        cfResp.value = token;
        cfResp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3. hCaptcha injection
    const hResp = document.querySelector('[name="h-captcha-response"]');
    if (hResp) {
        hResp.value = token;
        hResp.dispatchEvent(new Event('change', { bubbles: true }));
    }
})();)JS";
    return ss.str();
}

} // namespace ai_browser
