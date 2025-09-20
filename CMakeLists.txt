cmake_minimum_required(VERSION 3.21)
project(SpoofModule)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_compile_options(-Wall -Wextra -Werror)

set(CMAKE_CXX_FLAGS_RELEASE "-Os -flto -ffunction-sections -fdata-sections -DNDEBUG")
set(CMAKE_EXE_LINKER_FLAGS_RELEASE "-flto -Wl,--gc-sections -s")
set(CMAKE_SHARED_LINKER_FLAGS_RELEASE "-flto -Wl,--gc-sections -s")

set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -DDEBUG")
set(CMAKE_EXE_LINKER_FLAGS_DEBUG "")
set(CMAKE_SHARED_LINKER_FLAGS_DEBUG "")

add_library(spoof SHARED
            spoof_module.cpp
            atexit.cpp)

find_library(log-lib log)

include_directories(${CMAKE_SOURCE_DIR}/zygisk)
include_directories(${CMAKE_SOURCE_DIR}/include)

target_link_libraries(spoof ${log-lib})

set_target_properties(spoof PROPERTIES
    RELEASE_LINK_FLAGS "-Wl,--exclude-libs,ALL"
)
