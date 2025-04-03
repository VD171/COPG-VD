cmake_minimum_required(VERSION 3.21)
project(SpoofModule)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(spoof SHARED spoof_module.cpp)

find_library(log-lib log)

include_directories(${CMAKE_SOURCE_DIR}/zygisk)
include_directories(${CMAKE_SOURCE_DIR}/include)
include_directories(${DOBBY_DIR}/include)

add_library(dobby_static STATIC IMPORTED)
set_target_properties(dobby_static PROPERTIES
    IMPORTED_LOCATION ${DOBBY_LIB}
)

target_link_libraries(spoof PRIVATE ${log-lib} dobby_static)
