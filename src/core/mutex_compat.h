#pragma once

#if defined(_GLIBCXX_HAS_GTHREADS) || defined(_MSC_VER)
  #include <mutex>
#else
  // Win32 native CriticalSection mutex for MinGW win32 thread model
  #ifndef WIN32_LEAN_AND_MEAN
  #define WIN32_LEAN_AND_MEAN
  #endif
  #include <windows.h>

  namespace std {
  class mutex {
  public:
      mutex() { InitializeCriticalSection(&cs_); }
      ~mutex() { DeleteCriticalSection(&cs_); }
      mutex(const mutex&) = delete;
      mutex& operator=(const mutex&) = delete;

      void lock() { EnterCriticalSection(&cs_); }
      void unlock() { LeaveCriticalSection(&cs_); }
      bool try_lock() { return TryEnterCriticalSection(&cs_) != 0; }

  private:
      CRITICAL_SECTION cs_;
  };

  template <typename MutexType>
  class lock_guard {
  public:
      explicit lock_guard(MutexType& m) : m_(m) { m_.lock(); }
      ~lock_guard() { m_.unlock(); }
      lock_guard(const lock_guard&) = delete;
      lock_guard& operator=(const lock_guard&) = delete;

  private:
      MutexType& m_;
  };
  } // namespace std
#endif
