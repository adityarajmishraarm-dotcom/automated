#pragma once

#include "agent_types.h"
#include <string>
#include <vector>

namespace ai_browser {

// Layer 3: CAPTCHA Solving Dispatcher
class CaptchaSolverService {
public:
    CaptchaSolverService();
    ~CaptchaSolverService();

    // Strategy A: External Solving Service / MCP Tool (CapSolver, 2Captcha, CapMonster)
    bool SolveViaService(const CaptchaDetectionResult& challenge,
                         std::string& out_solution_token,
                         std::string& out_status_message);

    // Strategy B: Local AI Multimodal Solver via Set-of-Marks (SoM) coordinates
    bool SolveViaLocalVLM(const CaptchaDetectionResult& challenge,
                          const std::string& prompt_instruction,
                          std::vector<int>& out_selected_tiles);

    // Strategy C: Invisible Trust Verification (Cloudflare Turnstile passive, reCAPTCHA v3)
    bool VerifyBehavioralPass(const CaptchaDetectionResult& challenge,
                              double simulated_trust_score = 0.95);

    // Generates DOM token injection script
    std::string GenerateTokenInjectionScript(const CaptchaDetectionResult& challenge,
                                             const std::string& token) const;
};

} // namespace ai_browser
