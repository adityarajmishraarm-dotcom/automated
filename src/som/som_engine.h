#pragma once

#include "agent_types.h"
#include <string>
#include <vector>

namespace ai_browser {

// Set-of-Marks (SoM) Injection Engine for Visual-Language Models (VLM)
// Dynamically renders neon yellow bounding boxes and [id] badges over interactive elements
class SoMEngine {
public:
    SoMEngine();
    ~SoMEngine();

    // Generates the client-side JavaScript overlay to inject into isolated world
    std::string GenerateOverlayScript(const std::vector<InteractiveElement>& elements) const;

    // Generates cleanup script to remove overlay instantly (<16ms)
    std::string GenerateCleanupScript() const;

    // Simulated atomic capture pipeline: injects, signals capture, and purges
    bool ExecuteAtomicCaptureSequence(const std::vector<InteractiveElement>& elements, std::string& out_status);
};

} // namespace ai_browser
