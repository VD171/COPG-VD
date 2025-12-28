cmake_minimum_required(VERSION 3.21)
project(SpoofModule)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_compile_options(-Os -flto -ffunction-sections -fdata-sections)
add_link_options(-flto -Wl,--gc-sections)

if(NOT DEBUG)
    add_compile_options(-g0 -DNDEBUG)
    add_link_options(-s)
endif()

add_subdirectory(dobby)

set(ZYGISK_SOURCES
    zygisk/spoof_module.cpp
    zygisk/atexit.cpp
)

add_library(spoof SHARED ${ZYGISK_SOURCES})

find_library(log-lib log)

include_directories(${CMAKE_SOURCE_DIR}/zygisk)
include_directories(${CMAKE_SOURCE_DIR}/include)
include_directories(${CMAKE_SOURCE_DIR}/dobby/include)

target_link_libraries(spoof 
    ${log-lib}
    dobby
)

set_target_properties(spoof PROPERTIES
    LINK_FLAGS "-Wl,--exclude-libs,ALL"
)
