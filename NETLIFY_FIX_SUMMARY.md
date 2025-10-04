# Netlify Deployment Error Fix Summary

## Problem

Netlify deployment was failing with the following error:

```
✘ [ERROR] Could not resolve "@tg-search/common"
✘ [ERROR] Could not resolve "@tg-search/core"  
✘ [ERROR] Could not resolve "drizzle-orm"
```

Error message:
```
Dependencies installation error: A Netlify Function is using dependencies that have not been installed yet: "@tg-search/common", "@tg-search/core"
```

## Root Cause

1. **Workspace Dependencies**: The project uses pnpm workspace protocol (`workspace:*`) and catalog references (`catalog:`) for dependencies
2. **Separate Functions Package**: `netlify/functions/package.json` existed with workspace dependencies that Netlify's bundler couldn't resolve
3. **Wrong Base Directory**: The package path was set to `apps/web` instead of the root directory
4. **Bundler Configuration**: Netlify Functions needed explicit configuration to handle monorepo dependencies

## Solution Implemented

### 1. Removed `netlify/functions/package.json`

**File Deleted**: `netlify/functions/package.json`

**Reason**: Netlify's function bundler cannot resolve workspace dependencies. By removing this file, Netlify will use the root-level dependencies and properly bundle workspace packages.

### 2. Updated `netlify.toml`

**Changes**:
```toml
[build]
  # Added base directory
  base = "."
  command = "VITE_WITH_CORE=true pnpm run packages:build && VITE_WITH_CORE=true pnpm run web:build"
  publish = "apps/web/dist"
  functions = "netlify/functions"

# Added functions configuration
[functions]
  # Use esbuild for bundling functions (required for workspace dependencies)
  node_bundler = "esbuild"
  # Include all node_modules in the bundle
  included_files = ["node_modules/**", "packages/*/dist/**", "packages/*/src/**"]
```

**Reason**: 
- `base = "."` ensures Netlify builds from the monorepo root
- `node_bundler = "esbuild"` uses esbuild which handles workspace dependencies better
- `included_files` ensures package files are available during bundling

### 3. Created Documentation

**New File**: `NETLIFY_PACKAGE_DIRECTORY.md`

Comprehensive bilingual (English/Chinese) guide explaining:
- Why Package Directory should be set to `.` (root)
- How to configure Netlify UI properly
- Troubleshooting common errors
- Environment variables setup

**Updated Files**:
- `NETLIFY_DEPLOYMENT.md` - Added Package Directory instructions
- `NETLIFY_DEPLOYMENT_CN.md` - Added Chinese Package Directory instructions

### 4. Updated Verification Script

**File**: `scripts/verify-netlify-deployment.mjs`

**Changes**:
- Now checks that `netlify/functions/package.json` does NOT exist (as expected)
- Added check for `base = "."` configuration
- Added check for `node_bundler` configuration
- Updated success message to reflect correct state

## Package Directory Setting

**Question from Issue**: "Package directory，选项应该选择哪个目录？" (Which directory should be selected for Package directory option?)

**Answer**: **`.` (root directory)**

### Why Root Directory?

1. **Monorepo Architecture**: This project is a monorepo with all dependencies managed at root level
2. **Workspace Dependencies**: Netlify Functions need access to `@tg-search/common` and `@tg-search/core` packages
3. **pnpm Workspace**: All packages are linked via workspace protocol to root
4. **Build Context**: Functions are built in the context of the entire workspace

### Netlify UI Configuration

When deploying via Netlify UI, set:
- **Base directory**: `.`
- **Build command**: Auto-detected from `netlify.toml`
- **Publish directory**: `apps/web/dist`
- **Functions directory**: `netlify/functions`
- **Package directory** (if asked): `.`

## Testing Verification

### Build Test

```bash
✓ pnpm install - Dependencies installed successfully
✓ VITE_WITH_CORE=true pnpm run packages:build - Packages built successfully
✓ VITE_WITH_CORE=true pnpm run web:build - Frontend built successfully
✓ node scripts/verify-netlify-deployment.mjs - All checks passed
```

### Verification Results

```
=== Netlify Deployment Verification ===

--- Build Output ---
✓ Build output directory exists
✓ index.html found
✓ assets directory found
✓ PGlite files found (browser-only mode enabled)

--- Netlify Config ---
✓ netlify.toml found
✓ publish directory configured
✓ functions directory configured
✓ browser-only mode flag configured
✓ Node.js version configured
✓ pnpm version configured
✓ base directory (root) configured
✓ functions node bundler configured

--- Functions ---
✓ Functions directory exists
✓ server.ts found
✓ ws.ts found
✓ Functions package.json correctly removed (uses root dependencies)

--- Environment ---
✓ .env.netlify found
✓ VITE_TELEGRAM_APP_ID configured
✓ VITE_TELEGRAM_APP_HASH configured
✓ VITE_WITH_CORE configured

✓ All checks passed! Ready for Netlify deployment.
```

## Files Modified

1. **Deleted**:
   - `netlify/functions/package.json`

2. **Modified**:
   - `netlify.toml` - Added `base` and `[functions]` configuration
   - `scripts/verify-netlify-deployment.mjs` - Updated checks for new configuration
   - `NETLIFY_DEPLOYMENT.md` - Added Package Directory instructions
   - `NETLIFY_DEPLOYMENT_CN.md` - Added Chinese Package Directory instructions

3. **Created**:
   - `NETLIFY_PACKAGE_DIRECTORY.md` - Comprehensive Package Directory guide

## Next Steps for Deployment

1. **Push changes to GitHub**:
   ```bash
   git push origin your-branch
   ```

2. **Configure Netlify**:
   - Go to Netlify Dashboard
   - Import your repository
   - Set **Base directory** to `.`
   - Set **Package directory** (if asked) to `.`
   - Add environment variables in Netlify UI

3. **Deploy**:
   - Click "Deploy site"
   - Monitor build logs
   - Verify deployment at your Netlify URL

## Expected Behavior

After these changes:
- ✅ Netlify Functions will successfully resolve workspace dependencies
- ✅ Build will complete without dependency errors
- ✅ Functions will be properly bundled with all required packages
- ✅ Application will deploy and run correctly on Netlify

## References

- [Netlify Functions Configuration](https://docs.netlify.com/functions/configure-and-deploy/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Netlify Base Directory](https://docs.netlify.com/configure-builds/overview/#base-directory)
