# Netlify Deployment Testing Guide

This guide provides comprehensive testing procedures to verify that the Telegram Search application works correctly on Netlify.

## Pre-Deployment Testing

### 1. Build Verification

Run the verification script to ensure all components are ready:

```bash
node scripts/verify-netlify-deployment.mjs
```

This script checks:
- ✅ Frontend build output exists and is valid
- ✅ Netlify configuration (netlify.toml) is properly set up
- ✅ Netlify Functions are present and configured
- ✅ Environment variables are configured
- ✅ PGlite database files are included in build

### 2. Local Build Test

Test the production build locally:

```bash
# Build packages
pnpm run packages:build

# Build frontend with browser-only mode
VITE_WITH_CORE=true pnpm run web:build

# Preview the build
pnpm run web:preview
```

Access `http://localhost:3333` and verify:
- ✅ Page loads without errors
- ✅ Browser console shows no critical errors
- ✅ Application UI renders correctly

## Deployment Steps

### Option 1: Deploy via Netlify CLI

1. Install Netlify CLI globally:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Link to existing site or create new:
```bash
netlify link
# or
netlify init
```

4. Deploy to production:
```bash
netlify deploy --prod
```

### Option 2: Deploy via Netlify Dashboard

1. Login to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - **Branch**: `netlify-deployment` (or your preferred branch)
   - **Build command**: (auto-detected from netlify.toml)
   - **Publish directory**: `apps/web/dist` (auto-detected)
5. Click "Deploy site"

## Post-Deployment Testing

### 1. Basic Functionality Tests

After deployment, access your Netlify site URL and perform these tests:

#### Test 1: Site Loads Successfully
- ✅ Navigate to your Netlify site URL
- ✅ Page loads without 404 or 500 errors
- ✅ Main UI components render correctly
- ✅ No JavaScript errors in browser console

#### Test 2: Database Initialization
Open browser DevTools (F12) and check:
- ✅ Console logs show "Initializing database..."
- ✅ Console logs show "Database initialized successfully"
- ✅ Console logs show "Database connection established successfully"
- ✅ No database-related errors appear

To verify database initialization:
1. Open browser DevTools → Console tab
2. Look for these messages:
   ```
   [CoreBridge] Initializing database...
   [CoreBridge] Using database type: pglite
   [CoreBridge] Database connection established successfully
   [CoreBridge] Vector extension enabled successfully
   [CoreBridge] Database initialized successfully
   ```

#### Test 3: IndexedDB Storage
Verify data storage in browser:
1. Open DevTools → Application tab
2. Navigate to Storage → IndexedDB
3. Check for PGlite database entries
4. Verify storage is working correctly

### 2. Authentication Tests

#### Test 1: Login Page
- ✅ Navigate to login page
- ✅ Phone number input field is visible
- ✅ Login button is clickable
- ✅ UI elements render correctly

#### Test 2: Telegram Authentication
1. Enter your phone number (with country code)
2. Click "Send Code"
3. ✅ Verify authentication code request is sent
4. ✅ Check for any API errors in console
5. Enter the verification code received
6. ✅ Verify successful authentication
7. ✅ Check that you're redirected to main page

#### Test 3: Session Persistence
1. Login successfully
2. Refresh the page
3. ✅ Verify you remain logged in
4. ✅ Check that session data persists in localStorage

### 3. Message Sync Tests

#### Test 1: Initial Sync
After logging in:
1. Navigate to sync page
2. Click "Start Sync"
3. ✅ Verify sync process starts
4. ✅ Monitor progress in UI
5. ✅ Check console for sync-related logs
6. ✅ Verify messages are being fetched

Expected console logs:
```
[MessageHandler] Fetching messages...
[StorageHandler] Saving messages to database...
[MessageHandler] Sync progress: X%
```

#### Test 2: Database Write Operations
During sync:
1. Open DevTools → Application → IndexedDB
2. ✅ Verify new entries are being created
3. ✅ Check that message count increases
4. ✅ Verify no write errors in console

#### Test 3: Message Storage
After sync completes:
1. Check message count in UI
2. ✅ Verify messages are displayed
3. ✅ Verify message content is correct
4. ✅ Check that timestamps are accurate

### 4. Search Functionality Tests

#### Test 1: Basic Search
1. Enter a search query
2. Click search button
3. ✅ Verify search results appear
4. ✅ Check that results are relevant
5. ✅ Verify no search errors

#### Test 2: Full-Text Search
1. Search for specific text in messages
2. ✅ Verify matching messages are found
3. ✅ Check search highlights work
4. ✅ Verify search is case-insensitive

#### Test 3: Message Filtering
1. Apply filters (date range, chat, etc.)
2. ✅ Verify filtered results are correct
3. ✅ Check that filters can be combined
4. ✅ Verify filter reset works

### 5. Functions Tests

#### Test 1: Health Check Endpoint
Test the serverless function:

```bash
curl https://your-site.netlify.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "dbInitialized": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Test 2: Function Logs
1. Go to Netlify Dashboard
2. Navigate to Functions → Function log
3. ✅ Verify function invocations are logged
4. ✅ Check for any error messages
5. ✅ Verify request/response data

Expected log entries:
```
[netlify:server] Request received - path: /api/health, method: GET
[netlify:server] Database initialized successfully
```

#### Test 3: WebSocket Endpoint
Test the WebSocket stub:

```bash
curl https://your-site.netlify.app/ws
```

Expected response:
```json
{
  "success": false,
  "message": "WebSocket not supported in serverless environment. Please use browser-only mode.",
  "useBrowserMode": true
}
```

### 6. Performance Tests

#### Test 1: Initial Load Time
1. Clear browser cache
2. Navigate to site
3. ✅ Verify page loads in < 3 seconds
4. ✅ Check Network tab for slow resources
5. ✅ Verify no blocking resources

#### Test 2: Database Performance
1. Perform search on large dataset (1000+ messages)
2. ✅ Verify search completes in < 2 seconds
3. ✅ Check that UI remains responsive
4. ✅ Verify no performance warnings in console

#### Test 3: Memory Usage
1. Open DevTools → Memory tab
2. Take heap snapshot before operations
3. Perform message sync (100+ messages)
4. Take heap snapshot after sync
5. ✅ Verify no memory leaks
6. ✅ Check that memory usage is reasonable

### 7. Cross-Browser Tests

Test on multiple browsers:

#### Chrome/Edge
- ✅ All functionality works
- ✅ IndexedDB works correctly
- ✅ PGlite initializes properly

#### Firefox
- ✅ All functionality works
- ✅ IndexedDB works correctly
- ✅ PGlite initializes properly

#### Safari
- ✅ All functionality works
- ✅ IndexedDB works correctly
- ✅ PGlite initializes properly

### 8. Mobile Tests

Test on mobile devices:

#### iOS Safari
- ✅ Page loads correctly
- ✅ Touch interactions work
- ✅ Authentication works
- ✅ Search functionality works

#### Android Chrome
- ✅ Page loads correctly
- ✅ Touch interactions work
- ✅ Authentication works
- ✅ Search functionality works

## Troubleshooting Common Issues

### Issue 1: Build Fails

**Symptoms**: Build fails on Netlify

**Solutions**:
1. Check build logs in Netlify dashboard
2. Verify Node.js version matches requirement (22.20.0+)
3. Check that all dependencies are installed
4. Verify build command is correct in netlify.toml

**Debug commands**:
```bash
# Local build test
VITE_WITH_CORE=true pnpm run packages:build
VITE_WITH_CORE=true pnpm run web:build

# Check for TypeScript errors
pnpm run typecheck
```

### Issue 2: Database Fails to Initialize

**Symptoms**: 
- Error: "Database not initialized"
- Error: "Failed to initialize PGlite database"

**Solutions**:
1. Clear browser cache and IndexedDB
2. Check browser console for detailed error
3. Verify PGlite files are in build output
4. Test in incognito/private window

**Debug steps**:
1. Open DevTools → Console
2. Look for initialization errors
3. Check Application → IndexedDB for existing data
4. Try clearing all site data and refreshing

### Issue 3: Login Fails

**Symptoms**:
- Can't receive verification code
- Authentication fails
- "Invalid API credentials" error

**Solutions**:
1. Verify Telegram API credentials in Netlify environment variables
2. Check that phone number format is correct (+country_code number)
3. Verify you're receiving Telegram messages on your phone
4. Try using a different authentication method

**Debug steps**:
```bash
# Check environment variables
netlify env:list

# Verify API credentials
curl https://your-site.netlify.app/api/health
```

### Issue 4: Messages Not Syncing

**Symptoms**:
- Sync progress stuck at 0%
- No messages appear after sync
- Error: "Failed to fetch messages"

**Solutions**:
1. Check browser console for error messages
2. Verify authentication is successful
3. Check network tab for failed requests
4. Try logging out and back in

**Debug steps**:
1. Open DevTools → Console
2. Look for message handler logs
3. Check Network tab for API calls
4. Verify IndexedDB has message entries

### Issue 5: Search Not Working

**Symptoms**:
- Search returns no results
- Search is very slow
- Error: "Search failed"

**Solutions**:
1. Verify messages are synced to database
2. Check that search index is built
3. Try rebuilding search index
4. Check browser console for errors

**Debug steps**:
1. Check message count in database
2. Verify search query format
3. Test with simple queries first
4. Check for JavaScript errors

## Monitoring and Logs

### Netlify Function Logs

Access function logs:
1. Go to Netlify Dashboard
2. Select your site
3. Navigate to "Functions" tab
4. Click on a function name
5. View logs in real-time

### Browser Console Logs

Monitor application logs:
1. Open DevTools (F12)
2. Go to Console tab
3. Filter by level (Info, Warning, Error)
4. Look for application-specific logs with prefixes:
   - `[CoreBridge]`
   - `[MessageHandler]`
   - `[StorageHandler]`
   - `[AuthHandler]`

### Analytics

Monitor site usage:
1. Enable Netlify Analytics (optional)
2. Track:
   - Page views
   - Unique visitors
   - Function invocations
   - Error rates

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | Acceptable |
|--------|--------|------------|
| Initial page load | < 2s | < 3s |
| Time to interactive | < 3s | < 5s |
| Search response time | < 1s | < 2s |
| Message sync (100 msgs) | < 5s | < 10s |
| Function cold start | < 500ms | < 1s |

## Security Checks

### 1. HTTPS
- ✅ Verify site is served over HTTPS
- ✅ Check for mixed content warnings
- ✅ Verify SSL certificate is valid

### 2. API Keys
- ✅ Verify API keys are not exposed in client code
- ✅ Check that sensitive data is stored securely
- ✅ Verify environment variables are set in Netlify only

### 3. Data Privacy
- ✅ Verify data is stored locally only
- ✅ Check that no data is sent to external servers
- ✅ Verify authentication tokens are secured

## Success Criteria

Deployment is successful when:

- ✅ Site is accessible via Netlify URL
- ✅ Frontend loads without errors
- ✅ Database initializes successfully
- ✅ User can login with Telegram
- ✅ Messages sync correctly
- ✅ Messages are written to local database
- ✅ Search functionality works
- ✅ Function logs show successful requests
- ✅ No critical errors in browser console
- ✅ All tests pass on multiple browsers
- ✅ Performance meets benchmarks

## Next Steps After Successful Deployment

1. **Custom Domain** (Optional)
   - Configure custom domain in Netlify
   - Update DNS settings
   - Verify SSL certificate

2. **Monitoring Setup**
   - Enable Netlify Analytics
   - Set up error tracking
   - Configure alerts for failures

3. **Documentation**
   - Update README with deployment URL
   - Document any custom configuration
   - Share deployment guide with team

4. **User Testing**
   - Invite users to test the deployment
   - Gather feedback
   - Fix any reported issues

## Support Resources

- **Netlify Documentation**: https://docs.netlify.com/
- **Project Issues**: https://github.com/Cosr-Backup/telegram-search/issues
- **Discord**: https://discord.gg/NzYsmJSgCT
- **Telegram**: https://t.me/+Gs3SH2qAPeFhYmU9
