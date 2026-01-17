//! Graphix Desktop Application
//! 
//! Tauri backend for the Graphix AI-native graphic novel creation tool.
//! This provides the desktop shell and native capabilities.

use tauri::Manager;

/// Custom Tauri commands can be added here
/// Example: #[tauri::command]
/// fn greet(name: &str) -> String {
///     format!("Hello, {}! Welcome to Graphix!", name)
/// }

/// Initialize the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Get the main window
            let window = app.get_webview_window("main").unwrap();
            
            // Set window title with version
            let version = app.package_info().version.to_string();
            window.set_title(&format!("Graphix v{}", version)).ok();
            
            // macOS: Use visible titlebar (not overlay) for proper spacing
            // Change to TitleBarStyle::Overlay for frameless look later
            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                window.set_title_bar_style(TitleBarStyle::Visible).ok();
            }
            
            Ok(())
        })
        // Register custom commands here:
        // .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running Graphix");
}
