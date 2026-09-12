cmake_minimum_required(VERSION 3.20)
project(NativeAIBrowser VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core
    ${CMAKE_CURRENT_SOURCE_DIR}/src/extractor
    ${CMAKE_CURRENT_SOURCE_DIR}/src/som
    ${CMAKE_CURRENT_SOURCE_DIR}/src/grep
    ${CMAKE_CURRENT_SOURCE_DIR}/src/captcha
    ${CMAKE_CURRENT_SOURCE_DIR}/src/orchestrator
)

# Source files
set(SOURCES
    src/core/tab_manager.cpp
    src/core/navigation.cpp
    src/core/autofill_engine.cpp
    src/core/devtools_host.cpp
    src/core/adblock_engine.cpp
    src/extractor/element_extractor.cpp
    src/extractor/ax_sanitizer.cpp
    src/som/som_engine.cpp
    src/grep/in_memory_grep.cpp
    src/captcha/captcha_detector.cpp
    src/captcha/kinematics.cpp
    src/captcha/solver_service.cpp
    src/captcha/hitl_controller.cpp
    src/orchestrator/closed_loop_agent.cpp
    src/orchestrator/dual_model_router.cpp
)

# Build static library for browser core
add_library(ai_browser_core STATIC ${SOURCES})

# Build comprehensive test & verification suite
add_executable(ai_browser_tests tests/test_suite.cpp)
target_link_libraries(ai_browser_tests PRIVATE ai_browser_core)

# Build main browser agent executable
add_executable(ai_browser_runner src/main.cpp)
target_link_libraries(ai_browser_runner PRIVATE ai_browser_core)
