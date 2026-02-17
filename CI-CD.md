# CI/CD Pipeline Documentation

## Overview
GitHub Actions workflow that builds Interview Companion for macOS (universal) and Windows (x64).

## Workflow Triggers
- **Push to main**: Builds artifacts but doesn't create release
- **Tag push (v\*)**: Builds + creates GitHub Release
- **Manual dispatch**: Can be triggered manually from GitHub Actions tab

## Build Matrix
- **macOS**: Universal binary (arm64 + x86_64)
  - Outputs: `.dmg`, `.app`
- **Windows**: x64
  - Outputs: `.msi`, `.exe` (NSIS installer)

## Current Status
✅ Unsigned builds (working)  
⏳ Code signing (placeholders ready, not configured)  
✅ Auto-updater (configured, signatures pending)

## Creating a Release

1. **Update version** in `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`
2. **Commit changes**: `git commit -am "chore: bump version to X.Y.Z"`
3. **Create tag**: `git tag vX.Y.Z`
4. **Push tag**: `git push origin vX.Y.Z`
5. **GitHub Actions** will:
   - Build for macOS and Windows
   - Create GitHub Release
   - Upload artifacts (.dmg, .msi, .exe)
   - Generate update manifest (latest.json)

## Setting Up Code Signing (Future)

### macOS Code Signing
1. Export Apple Developer certificate as `.p12`
2. Add GitHub secrets:
   - `APPLE_CERTIFICATE`: Base64-encoded .p12 file
   - `APPLE_CERTIFICATE_PASSWORD`: Certificate password
   - `APPLE_ID`: Apple ID email
   - `APPLE_TEAM_ID`: Team ID from developer account
   - `APPLE_PASSWORD`: App-specific password
3. Update `signingIdentity` in `tauri.conf.json`
4. Uncomment macOS signing steps in `.github/workflows/build.yml`

### Windows Code Signing
1. Obtain code signing certificate (.pfx)
2. Add GitHub secrets:
   - `WINDOWS_CERTIFICATE`: Base64-encoded .pfx file
   - `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password
3. Update `certificateThumbprint` in `tauri.conf.json`
4. Uncomment Windows signing steps in `.github/workflows/build.yml`

### Auto-Updater Signatures
Once code signing is enabled:
1. Generate key pair: `tauri signer generate -w ~/.tauri/interview-companion.key`
2. Add public key to `tauri.conf.json` → `updater.pubkey`
3. Private key will be used automatically during signed builds
4. Signatures will be added to `latest.json` automatically

## Manual Build Locally

```bash
# macOS universal
pnpm tauri build --target universal-apple-darwin

# Windows (on Windows machine)
pnpm tauri build
```

## Frontend Deployment
Frontend is NOT built in CI. It loads from:
- **Production**: https://interview-companion.triqual.dev (Vercel auto-deploy on push)
- **Dev**: http://localhost:3000

## Artifacts Location
- **Build artifacts**: Actions → Build and Release → Artifacts tab
- **Releases**: https://github.com/Montinou/interview-companion/releases
- **Update manifest**: `https://github.com/Montinou/interview-companion/releases/latest/download/latest.json`

## Troubleshooting

### Build fails on Windows
- Ensure icons include `icon.ico`
- Check Rust toolchain is installed

### Build fails on macOS
- Ensure Xcode Command Line Tools installed
- Check targets are available: `rustup target list | grep darwin`

### Updater not working
- Verify `latest.json` is accessible at the endpoint
- Check `pubkey` matches signing key (once signing enabled)
- Test endpoint: `curl -L https://github.com/Montinou/interview-companion/releases/latest/download/latest.json`

## Links
- [Tauri v2 Building Guide](https://v2.tauri.app/distribute/)
- [GitHub Actions for Tauri](https://github.com/tauri-apps/tauri-action)
- [Tauri Updater](https://v2.tauri.app/plugin/updater/)
