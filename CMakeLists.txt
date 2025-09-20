cmake_minimum_required(VERSION 3.21)
project(SpoofModule)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2 -fno-rtti -fno-exceptions -fvisibility=hidden -ffunction-sections -fdata-sections")
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,--gc-sections")


add_library(spoof SHARED
            spoof_module.cpp
            atexit.cpp)

find_library(log-lib log)

include_directories(${CMAKE_SOURCE_DIR}/zygisk)
include_directories(${CMAKE_SOURCE_DIR}/include)

target_link_libraries(spoof ${log-lib})
