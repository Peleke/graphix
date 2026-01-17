//! Graphix Desktop Entry Point
//! 
//! This is the main entry point for the Graphix desktop application.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    graphix_lib::run();
}
