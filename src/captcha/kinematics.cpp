#include "kinematics.h"
#include <cmath>
#include <random>

namespace ai_browser {

HumanizedKinematics::HumanizedKinematics() = default;
HumanizedKinematics::~HumanizedKinematics() = default;

std::vector<Point> HumanizedKinematics::GenerateBezierPath(Point start, Point end, int steps) const {
    std::vector<Point> path;
    if (steps <= 0) steps = 20;

    // Generate randomized control points for cubic Bezier curve
    double dx = end.x - start.x;
    double dy = end.y - start.y;
    double dist = std::hypot(dx, dy);

    // Random deflection offset
    double curve_intensity = std::min(dist * 0.25, 60.0);

    Point c1{
        start.x + dx * 0.33 + (curve_intensity * 0.5),
        start.y + dy * 0.33 - (curve_intensity * 0.8)
    };

    Point c2{
        start.x + dx * 0.66 - (curve_intensity * 0.3),
        start.y + dy * 0.66 + (curve_intensity * 0.4)
    };

    for (int i = 0; i <= steps; ++i) {
        double t = static_cast<double>(i) / steps;
        // Ease in / ease out transformation: t' = 3t^2 - 2t^3
        double ease_t = t * t * (3.0 - 2.0 * t);

        double u = 1.0 - ease_t;
        double tt = ease_t * ease_t;
        double uu = u * u;
        double uuu = uu * u;
        double ttt = tt * ease_t;

        Point p;
        p.x = uuu * start.x + 3.0 * uu * ease_t * c1.x + 3.0 * u * tt * c2.x + ttt * end.x;
        p.y = uuu * start.y + 3.0 * uu * ease_t * c1.y + 3.0 * u * tt * c2.y + ttt * end.y;
        path.push_back(p);
    }

    return path;
}

std::vector<int> HumanizedKinematics::GenerateKeystrokeDelays(const std::string& text) const {
    std::vector<int> delays;
    std::mt19937 rng(42); // Deterministic seed for testing
    std::normal_distribution<double> dist(85.0, 25.0);

    for (char c : text) {
        int delay = static_cast<int>(dist(rng));
        // Clamp between 50ms and 180ms
        if (delay < 50) delay = 50;
        if (delay > 180) delay = 180;

        // Space / punctuation keys naturally take longer
        if (c == ' ' || c == '.' || c == ',') {
            delay += 40;
        }
        delays.push_back(delay);
    }

    return delays;
}

Point HumanizedKinematics::ComputeOvershoot(Point target) const {
    return Point{target.x + 2.5, target.y - 1.8};
}

} // namespace ai_browser
