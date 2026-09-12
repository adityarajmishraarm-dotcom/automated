#pragma once

#include "agent_types.h"
#include <vector>
#include <chrono>

namespace ai_browser {

// Layer 1 Prevention: Humanized Mouse Kinematics & Typing Jitter
class HumanizedKinematics {
public:
    HumanizedKinematics();
    ~HumanizedKinematics();

    // Generates a smooth, natural cubic Bezier trajectory with acceleration and deceleration
    std::vector<Point> GenerateBezierPath(Point start, Point end, int steps = 25) const;

    // Generates human-like typing keystroke delays with natural jitter (50ms - 180ms)
    std::vector<int> GenerateKeystrokeDelays(const std::string& text) const;

    // Computes micro-overshoot offset to simulate organic hand-eye correction
    Point ComputeOvershoot(Point target) const;
};

} // namespace ai_browser
