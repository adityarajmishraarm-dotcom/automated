#pragma once

#if defined(__has_include)
  #if __has_include(<optional>) && (__cplusplus >= 201703L)
    #include <optional>
  #elif __has_include(<experimental/optional>)
    #include <experimental/optional>
    namespace std {
      using experimental::optional;
      using experimental::nullopt;
      using experimental::nullopt_t;
      using experimental::make_optional;
    }
  #endif
#else
  #include <experimental/optional>
  namespace std {
    using experimental::optional;
    using experimental::nullopt;
    using experimental::nullopt_t;
    using experimental::make_optional;
  }
#endif
