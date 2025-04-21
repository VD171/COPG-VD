cmake_minimum_required(VERSION 3.21...3.31)
project(SpoofModule)

# Set C++ standard to 17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Ensure Android API level supports inotify and threading (API 21+)
set(CMAKE_ANDROID_API 21)

# Explicitly set C++ standard library to c++_shared for std::thread support
set(CMAKE_ANDROID_STL_TYPE c++_shared)

# Build the shared library
add_library(spoof SHARED spoof_module.cpp)

# Find the Android log library
find_library(log-lib log)

# Include directories for Zygisk and nlohmann/json.hpp
include_directories(${CMAKE_SOURCE_DIR}/zygisk)
include_directories(${CMAKE_SOURCE_DIR}/include)

# Enable threading support
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -pthread")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -pthread")

# Link libraries (log and implicitly libc++ for threading)
target_link_libraries(spoof ${log-lib})

# Add debug symbols for easier debugging
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -g")
