# Building Cross-Platform Desktop Apps with Tauri 2.0: A Complete Guide

> **From Web to Desktop in Minutes: Why Tauri is Replacing Electron**

*A comprehensive guide to setting up Tauri 2.0 for your web application, covering architecture, configuration, and production deployment.*

---

## Table of Contents

1. [Introduction: Why Tauri?](#introduction-why-tauri)
2. [Tauri vs Electron: The Technical Deep-Dive](#tauri-vs-electron)
3. [Prerequisites and System Requirements](#prerequisites)
4. [Project Architecture](#project-architecture)
5. [Step-by-Step Setup](#step-by-step-setup)
6. [Configuration Deep-Dive](#configuration-deep-dive)
7. [The Rust Backend](#the-rust-backend)
8. [Building for Production](#building-for-production)
9. [Advanced Topics](#advanced-topics)
10. [Troubleshooting](#troubleshooting)

---

## Introduction: Why Tauri? {#introduction-why-tauri}

### The Desktop App Renaissance

The web vs native debate has raged for over a decade. Web technologies won the development experience battle—React, Vue, and modern tooling make building UIs a joy. But native apps still win on performance, system integration, and that intangible "feels right" quality.

**Tauri bridges this gap**, and it does so more elegantly than any previous solution.

### What is Tauri?

Tauri is a framework for building tiny, fast binaries for all major desktop platforms. It's fundamentally different from Electron:

| Aspect | Tauri | Electron |
|--------|-------|----------|
| **Runtime** | System WebView | Bundled Chromium |
| **Backend** | Rust | Node.js |
| **Binary Size** | ~3-10 MB | ~150-300 MB |
| **Memory Usage** | ~30-50 MB | ~150-500 MB |
| **Startup Time** | Instant | 2-5 seconds |
| **Security** | Rust's memory safety + CSP | V8 sandbox |

### Why We Chose Tauri for Graphix

Graphix is an AI-native graphic novel creation tool. Our requirements:

1. **Performance**: Canvas manipulation, real-time generation previews
2. **Cross-platform**: macOS, Windows, Linux
3. **Small footprint**: Users shouldn't download 300MB for an app
4. **Security**: We handle user content and API keys
5. **Modern stack**: We're already using React + TypeScript + Vite

Tauri checks every box. The 10x smaller binary size alone is worth it.

---

## Tauri vs Electron: The Technical Deep-Dive {#tauri-vs-electron}

### Architecture Comparison

**Electron's Architecture:**
```
┌─────────────────────────────────────────┐
│              Your App                    │
├─────────────────────────────────────────┤
│            Node.js Runtime              │
├─────────────────────────────────────────┤
│         Chromium (Entire Browser)       │
├─────────────────────────────────────────┤
│              Operating System            │
└─────────────────────────────────────────┘
```

Electron bundles an entire copy of Chromium and Node.js. Every Electron app is essentially shipping a complete web browser.

**Tauri's Architecture:**
```
┌─────────────────────────────────────────┐
│              Your App                    │
├─────────────────────────────────────────┤
│            Rust Binary (~2MB)           │
├─────────────────────────────────────────┤
│         System WebView (already exists) │
├─────────────────────────────────────────┤
│              Operating System            │
└─────────────────────────────────────────┘
```

Tauri uses the operating system's built-in WebView:
- **macOS**: WKWebView (Safari's engine)
- **Windows**: WebView2 (Edge/Chromium, auto-updated by Microsoft)
- **Linux**: WebKitGTK

### The Rust Advantage

Electron uses Node.js for its backend. Tauri uses Rust.

```rust
// Tauri command - runs at native speed
#[tauri::command]
fn process_image(path: String) -> Result<ImageData, String> {
    // This runs at native Rust speed
    // Memory-safe by default
    // No garbage collection pauses
    image::open(&path)
        .map_err(|e| e.to_string())?
        .resize(1024, 1024, FilterType::Lanczos3)
        .into()
}
```

```javascript
// Electron equivalent - Node.js with native modules
const sharp = require('sharp'); // Native dependency, build issues galore

async function processImage(path) {
  // V8 garbage collection can cause frame drops
  return await sharp(path)
    .resize(1024, 1024)
    .toBuffer();
}
```

**Real-world implications:**
- Tauri binaries start instantly; Electron takes 2-5 seconds
- Tauri uses ~30-50MB RAM idle; Electron uses ~150-500MB
- Tauri binaries are ~3-10MB; Electron is ~150-300MB

### Security Model

**Tauri's Security Philosophy:**

1. **Allowlist by default**: Commands must be explicitly exposed
2. **Rust's memory safety**: No buffer overflows, use-after-free
3. **CSP enforcement**: Content Security Policy is enforced
4. **Capability-based permissions**: Fine-grained access control

```json
// tauri.conf.json - explicit security configuration
{
  "app": {
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: blob:; script-src 'self'"
    }
  },
  "plugins": {
    "shell": {
      "open": true  // Explicitly enable shell:open
    }
  }
}
```

---

## Prerequisites and System Requirements {#prerequisites}

### Required Software

#### All Platforms
- **Node.js 18+** or **Bun** (we use Bun)
- **Rust** (via rustup)

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Windows
1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Select "Desktop development with C++"
2. Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)
3. Install Rust: Download from [rustup.rs](https://rustup.rs)

#### Linux (Ubuntu/Debian)
```bash
# Install system dependencies
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Verify Installation

```bash
# Check Rust
rustc --version  # Should be 1.70+
cargo --version

# Check Node/Bun
node --version  # 18+ or
bun --version   # 1.0+
```

---

## Project Architecture {#project-architecture}

### Directory Structure

Here's our Tauri + React + Vite project structure:

```
packages/ui/
├── src/                    # React application source
│   ├── components/         # React components
│   ├── routes/             # TanStack Router routes
│   ├── theme/              # Panda CSS theme system
│   └── main.tsx            # React entry point
├── src-tauri/              # Tauri/Rust source (NEW)
│   ├── src/
│   │   ├── lib.rs          # Rust library (commands, setup)
│   │   └── main.rs         # Rust entry point
│   ├── icons/              # App icons for all platforms
│   ├── Cargo.toml          # Rust dependencies
│   ├── build.rs            # Tauri build script
│   └── tauri.conf.json     # Tauri configuration
├── dist/                   # Vite build output (gitignored)
├── index.html              # HTML entry point
├── package.json            # Node dependencies + scripts
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

### How It Works

1. **Development Mode** (`bun run tauri:dev`):
   - Vite dev server starts on `localhost:5173`
   - Tauri opens a native window pointing to the dev server
   - Hot Module Replacement (HMR) works as normal
   - Rust code can be modified and recompiled

2. **Production Build** (`bun run tauri:build`):
   - Vite builds the React app to `dist/`
   - Tauri compiles the Rust code
   - Frontend assets are bundled into the binary
   - Platform-specific installer is generated

---

## Step-by-Step Setup {#step-by-step-setup}

### Step 1: Install Tauri CLI

```bash
# In your UI package directory
cd packages/ui

# Install Tauri CLI and API
bun add -D @tauri-apps/cli
bun add @tauri-apps/api
```

### Step 2: Initialize Tauri

```bash
# This creates the src-tauri directory
bunx tauri init
```

You'll be prompted for:
- **App name**: `Graphix`
- **Window title**: `Graphix`
- **Dev server URL**: `http://localhost:5173`
- **Dev command**: `bun run dev`
- **Build command**: `bun run build`
- **Frontend dist**: `../dist`

### Step 3: Configure tauri.conf.json

Here's our production-ready configuration:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Graphix",
  "version": "0.1.0",
  "identifier": "com.graphix.app",
  "build": {
    "beforeDevCommand": "bun run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "bun run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Graphix",
        "width": 1400,
        "height": 900,
        "minWidth": 900,
        "minHeight": 600,
        "center": true,
        "decorations": true,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "category": "Graphics",
    "shortDescription": "AI-native graphic novel creation tool"
  }
}
```

### Step 4: Set Up Rust Backend

**Cargo.toml:**
```toml
[package]
name = "graphix"
version = "0.1.0"
description = "AI-native graphic novel and comic creation tool"
edition = "2021"

[lib]
name = "graphix_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
codegen-units = 1
lto = true
opt-level = "s"
panic = "abort"
strip = true
```

**src/lib.rs:**
```rust
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let version = app.package_info().version.to_string();
            window.set_title(&format!("Graphix v{}", version)).ok();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Graphix");
}
```

**src/main.rs:**
```rust
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    graphix_lib::run();
}
```

### Step 5: Add Scripts to package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:icon": "tauri icon"
  }
}
```

### Step 6: Generate App Icons

```bash
# Create a 1024x1024 PNG icon, then:
bunx tauri icon ./path/to/icon.png
```

This generates all required icon formats in `src-tauri/icons/`.

### Step 7: Run in Development

```bash
bun run tauri:dev
```

This will:
1. Start Vite dev server
2. Compile the Rust code
3. Open a native window with your app
4. Enable HMR for instant updates

---

## Configuration Deep-Dive {#configuration-deep-dive}

### Window Configuration

```json
{
  "app": {
    "windows": [
      {
        "title": "Graphix",
        "width": 1400,
        "height": 900,
        "minWidth": 900,
        "minHeight": 600,
        "maxWidth": null,          // null = no max
        "maxHeight": null,
        "x": null,                 // null = system decides
        "y": null,
        "center": true,            // Center on screen
        "resizable": true,
        "fullscreen": false,
        "alwaysOnTop": false,
        "decorations": true,       // Native title bar
        "transparent": false,
        "visible": true,
        "focus": true,
        "skipTaskbar": false,
        "closable": true,
        "maximizable": true,
        "minimizable": true
      }
    ]
  }
}
```

### Security Configuration

```json
{
  "app": {
    "security": {
      // Content Security Policy
      "csp": "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self'; style-src 'self' 'unsafe-inline'",
      
      // Freeze the prototype (security hardening)
      "freezePrototype": true,
      
      // Dangerous - disable if you need custom protocols
      "dangerousDisableAssetCspModification": false
    }
  }
}
```

### Bundle Configuration

```json
{
  "bundle": {
    "active": true,
    "targets": "all",  // or ["dmg", "msi", "deb", "appimage"]
    
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    
    "identifier": "com.graphix.app",
    "publisher": "Graphix Team",
    "category": "Graphics",
    "copyright": "© 2024 Graphix Team",
    "shortDescription": "AI-native graphic novel creation",
    "longDescription": "Full description here...",
    
    "macOS": {
      "minimumSystemVersion": "10.15",
      "entitlements": null,
      "providerShortName": null,
      "signingIdentity": null
    },
    
    "windows": {
      "webviewInstallMode": {
        "type": "downloadBootstrapper"  // Auto-install WebView2 if missing
      },
      "wix": null,
      "nsis": null
    },
    
    "linux": {
      "appimage": {
        "bundleMediaFramework": false
      },
      "deb": {
        "depends": []
      }
    }
  }
}
```

### Plugin Configuration

Tauri 2.0 uses a plugin system for extended functionality:

```json
{
  "plugins": {
    "shell": {
      "open": true  // Enable opening URLs in default browser
    }
  }
}
```

---

## The Rust Backend {#the-rust-backend}

### Creating Custom Commands

Commands are the bridge between your frontend and Rust:

```rust
// src/lib.rs
use tauri::command;

#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Graphix!", name)
}

#[command]
async fn process_heavy_task(input: String) -> Result<String, String> {
    // Async operations are supported
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    Ok(format!("Processed: {}", input))
}

// Register commands
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            process_heavy_task
        ])
        .run(tauri::generate_context!())
        .expect("error while running app");
}
```

### Calling Commands from Frontend

```typescript
import { invoke } from '@tauri-apps/api/core';

// Simple command
const greeting = await invoke<string>('greet', { name: 'Peleke' });
console.log(greeting); // "Hello, Peleke! Welcome to Graphix!"

// Async command with error handling
try {
  const result = await invoke<string>('process_heavy_task', { 
    input: 'some data' 
  });
  console.log(result);
} catch (error) {
  console.error('Command failed:', error);
}
```

### Event System

Rust can emit events to the frontend:

```rust
use tauri::Emitter;

#[command]
fn start_generation(app: tauri::AppHandle) {
    // Spawn background task
    std::thread::spawn(move || {
        for progress in 0..=100 {
            std::thread::sleep(std::time::Duration::from_millis(100));
            app.emit("generation-progress", progress).unwrap();
        }
        app.emit("generation-complete", "Done!").unwrap();
    });
}
```

Frontend event handling:

```typescript
import { listen } from '@tauri-apps/api/event';

// Listen for progress updates
const unlisten = await listen<number>('generation-progress', (event) => {
  console.log('Progress:', event.payload);
  setProgress(event.payload);
});

// Clean up listener when component unmounts
unlisten();
```

### State Management

Share state between commands:

```rust
use std::sync::Mutex;
use tauri::State;

struct AppState {
    counter: Mutex<i32>,
}

#[command]
fn increment(state: State<AppState>) -> i32 {
    let mut counter = state.counter.lock().unwrap();
    *counter += 1;
    *counter
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState { 
            counter: Mutex::new(0) 
        })
        .invoke_handler(tauri::generate_handler![increment])
        .run(tauri::generate_context!())
        .expect("error while running app");
}
```

---

## Building for Production {#building-for-production}

### Development Build

```bash
# Build debug version (faster compilation)
bun run tauri build --debug
```

### Release Build

```bash
# Build optimized release version
bun run tauri build
```

Output locations:
- **macOS**: `src-tauri/target/release/bundle/dmg/Graphix_0.1.0_x64.dmg`
- **Windows**: `src-tauri/target/release/bundle/msi/Graphix_0.1.0_x64.msi`
- **Linux**: `src-tauri/target/release/bundle/appimage/graphix_0.1.0_amd64.AppImage`

### Cross-Compilation

Tauri supports building for other platforms:

```bash
# Build for specific target
bun run tauri build --target x86_64-apple-darwin
bun run tauri build --target x86_64-pc-windows-msvc
bun run tauri build --target x86_64-unknown-linux-gnu
```

> **Note**: Cross-compilation requires the target toolchain. For production, use CI/CD with native runners.

### GitHub Actions CI/CD

```yaml
name: Build Tauri App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: macos-latest
            target: aarch64-apple-darwin
          - os: windows-latest
            target: x86_64-pc-windows-msvc
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install Linux dependencies
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt update
          sudo apt install -y libwebkit2gtk-4.1-dev libayatana-appindicator3-dev

      - name: Install dependencies
        run: bun install
        working-directory: packages/ui

      - name: Build Tauri app
        run: bun run tauri build --target ${{ matrix.target }}
        working-directory: packages/ui

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: graphix-${{ matrix.target }}
          path: packages/ui/src-tauri/target/release/bundle/
```

---

## Advanced Topics {#advanced-topics}

### Custom Protocols

Register custom protocols for loading resources:

```rust
use tauri::UriSchemeResponse;

pub fn run() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("graphix", |_app, request| {
            let path = request.uri().path();
            // Handle custom protocol requests
            let content = std::fs::read(format!("./assets{}", path))?;
            UriSchemeResponse::builder()
                .header("Content-Type", "image/png")
                .body(content)
        })
        .run(tauri::generate_context!())
        .expect("error while running app");
}
```

```html
<!-- Use in frontend -->
<img src="graphix://assets/logo.png" />
```

### System Tray

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;
            
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id().as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running app");
}
```

### Auto-Updates

```toml
# Cargo.toml
[dependencies]
tauri-plugin-updater = "2"
```

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running app");
}
```

```typescript
import { check } from '@tauri-apps/plugin-updater';

const update = await check();
if (update) {
  console.log(`Update available: ${update.version}`);
  await update.downloadAndInstall();
}
```

---

## Troubleshooting {#troubleshooting}

### Common Issues

#### 1. "Failed to resolve: tauri"

```bash
# Ensure Rust is properly installed
rustup update
rustup target add x86_64-apple-darwin  # or your target
```

#### 2. "WebView2 not found" (Windows)

The app will prompt users to install WebView2. For silent install:

```json
{
  "bundle": {
    "windows": {
      "webviewInstallMode": {
        "type": "downloadBootstrapper"
      }
    }
  }
}
```

#### 3. Linux build fails with missing libraries

```bash
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### 4. Slow first compilation

Rust's first build downloads and compiles dependencies. Subsequent builds are much faster.

```bash
# Speed up development builds
export CARGO_INCREMENTAL=1
```

#### 5. Window doesn't appear

Check that your dev server URL is correct in `tauri.conf.json`:

```json
{
  "build": {
    "devUrl": "http://localhost:5173"  // Must match Vite port
  }
}
```

### Debug Tips

1. **Enable Rust logging**:
   ```bash
   RUST_LOG=debug bun run tauri dev
   ```

2. **Open DevTools**:
   - macOS: `Cmd + Option + I`
   - Windows/Linux: `Ctrl + Shift + I`

3. **Check Rust panics**: Look for backtraces in terminal output

---

## Conclusion

Tauri 2.0 represents the future of desktop application development. By leveraging system WebViews and Rust, it delivers:

- **10x smaller binaries** than Electron
- **Native performance** with memory safety
- **Modern security** with capability-based permissions
- **Seamless integration** with your existing web stack

For Graphix, this means our users get a professional desktop experience without the bloat. They can run ComfyUI integrations, manage large canvas projects, and enjoy instant startup times.

**Resources:**
- [Tauri Documentation](https://tauri.app/start/)
- [Tauri GitHub](https://github.com/tauri-apps/tauri)
- [Tauri Discord](https://discord.com/invite/tauri)

---

*Written for the Graphix project - an AI-native graphic novel and comic creation tool.*
*January 2026*
