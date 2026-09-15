cmake_minimum_required(VERSION 3.21)
project(SpoofModule)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_compile_options(-Os -flto -ffunction-sections -fdata-sections)
# Nothing is exported except what zygisk.hpp marks visibility("default") - the two entry
# points. Fewer symbols in .dynsym is less to read for whoever opens the library, and
# --icf=all folds identical code. Deliberately NOT here: -fno-unwind-tables (the std::sto*
# calls are caught by a try, and unwinding needs the tables) and -z norelro (hardening).
add_compile_options(-fvisibility=hidden -fvisibility-inlines-hidden)
add_link_options(-flto -Wl,--gc-sections -Wl,--icf=all)


if(NOT DEBUG)
    add_compile_options(-g0 -DNDEBUG)
    add_link_options(-s)
endif()

set(ZYGISK_SOURCES
    spoof_module.cpp
    atexit.cpp
)

add_library(spoof SHARED ${ZYGISK_SOURCES})

find_library(log-lib log)

include_directories(${CMAKE_SOURCE_DIR})

target_link_libraries(spoof ${log-lib})

set_target_properties(spoof PROPERTIES
    LINK_FLAGS "-Wl,--exclude-libs,ALL"
)
