cmake_minimum_required(VERSION 3.21)
project(SpoofModule)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Define the shared library (libspoof.so)
add_library(spoof SHARED spoof_module.cpp)

# Find the Android log library
find_library(log-lib log)

# Include directories for headers
include_directories(${CMAKE_SOURCE_DIR}/zygisk)         # For zygisk.hpp
include_directories(${CMAKE_SOURCE_DIR}/include/nlohmann)  # For json.hpp
include_directories(${CMAKE_SOURCE_DIR}/include/dobby)  # For dobby.h

# Link against the prebuilt libdobby.a and log library
target_link_libraries(spoof PRIVATE
    ${DOBBY_LIB}  # Path to libdobby.a, set by the workflow
    ${log-lib}    # Android log library
)
