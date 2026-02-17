# Tauri v2 + Next.js Integration Guide

## Loading Deployed URL Instead of Static Export

**Tauri v2 with Next.js Server Components** requires pointing to a deployed URL instead of bundling static files. Next.js SSR, API routes, and Server Components don't work with traditional static export. Configure frontendDist to your Vercel/production URL, and devUrl to localhost during development. This approach preserves full Next.js functionality (auth, database, API routes) while Tauri provides native capabilities. The app loads from CDN on launch, requiring internet connection. Updates deploy via Vercel without rebuilding the Tauri app. Native features live in Rust commands, web features stay in Next.js.

```json
{
  "build": {
    "frontendDist": "https://your-app.vercel.app",
    "devUrl": "http://localhost:3000"
  }
}
```

**Summary:** Point Tauri to deployed Next.js URL to preserve SSR, API routes, and Server Components without static export limitations.

## Benefits and Trade-offs of Remote Frontend

**Remote frontend architecture** enables authentication, server components, and real-time features at the cost of internet dependency. Clerk, NextAuth, and cookie-based sessions work normally. API routes handle database operations. Supabase Realtime maintains WebSocket connections from browser context. SSR delivers faster initial paint. App updates deploy instantly via Vercel without user downloads. Trade-offs include internet requirement, slightly slower initial load fetching from CDN, and reliance on external infrastructure. Binary size stays tiny (~11MB) compared to Electron (~200MB). Best for apps where native features are secondary to web functionality.

**Summary:** Remote frontend preserves full Next.js features with tiny binaries, but requires internet and depends on external hosting.

## Rust Commands for Native Functionality

**Tauri commands expose native capabilities** to the JavaScript frontend via a type-safe bridge. Define functions with `#[tauri::command]` macro, accepting AppHandle or State parameters. Commands can be async for long-running operations. Return Result<T, String> for error handling. Use for audio capture, file system access, system notifications, and other browser-restricted APIs. Keep business logic in TypeScript; Rust handles only what browsers can't. Commands are invoked from frontend with @tauri-apps/api/core invoke function.

```rust
#[tauri::command]
async fn native_feature(app: tauri::AppHandle) -> Result<String, String> {
    // Native code here
    Ok("done".to_string())
}
```

**Summary:** Use `#[tauri::command]` for native-only features like audio, files, and system access; keep logic in TypeScript.

## Frontend Bridge Pattern with Dynamic Imports

**Frontend bridge pattern** detects Tauri environment and dynamically imports native APIs to avoid build errors. Check for `__TAURI__` global in window before invoking commands. Dynamic imports prevent bundler errors when running in browser context. Type-safe wrappers throw helpful errors when called outside Tauri. This pattern allows same codebase to run in browser (dev) and Tauri (production) without conditional compilation. Export detection function and command wrappers from dedicated module.

```typescript
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export async function callNative(): Promise<string> {
  if (!isTauri()) throw new Error('Not in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('native_feature');
}
```

**Summary:** Dynamic-import @tauri-apps/api and check `__TAURI__` global to support both browser and native execution.

## Thread Safety with cpal Audio

**cpal Stream objects are !Send** and cannot cross thread boundaries into tokio async runtime. Solution: run audio capture on OS thread with std::thread::spawn, communicate with async code via mpsc channel. Stream must be created, played, and dropped on same OS thread. Use Arc<AtomicBool> for stopping recording across threads. Tokio tasks handle WebSocket/network, OS threads handle audio. This architecture prevents "future cannot be sent between threads safely" errors. Sleep loops or join handles keep OS thread alive during recording.

```rust
std::thread::spawn(move || {
    let stream = device.build_input_stream(...);
    stream.play().unwrap();
    while is_recording.load(Ordering::Relaxed) {
        std::thread::sleep(Duration::from_millis(100));
    }
});
```

**Summary:** Run cpal audio on OS threads, communicate with tokio via mpsc channels to avoid !Send trait errors.

## Tauri Events for Rust to JavaScript Communication

**Tauri events emit data from Rust backend to JavaScript listeners** without blocking request-response flow. Use app.emit() with event name and JSON payload. Frontend listens with @tauri-apps/api/event listen function. Unlisten function cleans up subscriptions. Events enable streaming data (transcription, progress updates) to UI without polling. Payloads are serialized via serde_json. Events are fire-and-forget; use commands for request-response patterns. Multiple listeners can subscribe to same event.

```rust
app.emit("event-name", json!({ "key": "value" }));
```

```typescript
const unlisten = await listen('event-name', (event) => console.log(event.payload));
```

**Summary:** Emit events from Rust for streaming data to frontend; use commands for request-response patterns.

## macOS Entitlements for Audio and Screen

**macOS entitlements** grant permissions for microphone, screen capture, and other protected resources. Create Entitlements.plist with required keys (com.apple.security.device.audio-input, com.apple.security.device.screen-capture). Reference in tauri.conf.json under bundle.macOS.entitlements. Without entitlements, app crashes on permission-protected API calls. User still sees permission prompt on first use. Entitlements must match app capabilities. Sign app with correct provisioning profile for distribution.

```xml
<dict>
    <key>com.apple.security.device.audio-input</key>
    <true/>
</dict>
```

**Summary:** Add Entitlements.plist with required permissions and reference in tauri.conf.json for macOS protected resources.

## DMG Bundling and Build Sizes

**DMG creation with Tauri** uses osascript bundler which can hang in headless environments. Fallback to hdiutil for reliable builds. Apple Silicon binaries are ~11MB, DMG ~4.5MB—dramatically smaller than Electron (~200MB). Use hdiutil create with UDZO format for distribution. Tauri bundles only native code; web assets load from remote URL. Prerequisites: Rust toolchain, Xcode Command Line Tools, optional create-dmg via Homebrew for enhanced DMG styling.

```bash
hdiutil create -volname "App" -srcfolder "App.app" -ov -format UDZO "App.dmg"
```

**Summary:** Tauri produces 11MB binaries vs Electron's 200MB; use hdiutil for reliable DMG creation in headless environments.

## FAQ

**Q: Can I use Next.js Server Components with Tauri?**  
A: Yes, by pointing frontendDist to deployed URL. SSR, API routes, and Server Components work normally.

**Q: Why not bundle Next.js build into Tauri app?**  
A: next export strips SSR, API routes, and Server Components. Remote URL preserves full Next.js functionality.

**Q: Does this require internet connection?**  
A: Yes. App loads from deployed URL on launch. Use static export if offline support is required.

**Q: How do I handle audio capture with tokio?**  
A: Run cpal on OS thread (std::thread::spawn), communicate with tokio via mpsc. cpal Stream is !Send.

**Q: What's the binary size difference vs Electron?**  
A: Tauri: ~11MB binary, ~4.5MB DMG. Electron: ~200MB. 20x smaller.

**Q: Can I use the same codebase for browser and Tauri?**  
A: Yes. Use dynamic imports and check `__TAURI__` global. Same code runs in both environments.
