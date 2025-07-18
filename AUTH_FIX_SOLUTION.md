# Authentication Cookie Fix for Cross-Port Development

## Problem
The authentication system was failing because:
1. Frontend runs on `http://localhost:8080`
2. Backend API runs on `http://localhost:5001`
3. Browsers treat different ports as different origins
4. HttpOnly cookies set on port 5001 weren't being sent back to port 5001 from requests originating from port 8080

## Root Cause
- The `sameSite: 'lax'` cookie attribute prevents cookies from being sent on cross-origin requests
- Modern browsers enforce strict cross-origin policies, even for localhost with different ports

## Solutions Implemented

### Solution 1: Proxy Server (Recommended)
A proxy server that runs on port 8080 and forwards API requests to port 5001:

```bash
# Install dependencies
npm install

# Run the proxy server
npm start
```

This makes all requests same-origin (port 8080) and eliminates the cookie issue entirely.

### Solution 2: Direct Cross-Port Requests
Updated configurations to better handle cross-port cookie sharing:

1. **CORS Configuration** (`server/config/cors.js`):
   - Properly configured CORS headers
   - Exposed `set-cookie` header
   - Allowed credentials

2. **Cookie Settings**:
   - Set `domain: 'localhost'` explicitly to share cookies across ports
   - Use `sameSite: 'lax'` for development (best we can do on HTTP)
   - Clear cookies with matching domain settings

3. **API Client** (`api.js`):
   - Automatically uses relative URLs when proxy is available
   - Falls back to direct API URL when needed
   - Always includes `credentials: 'include'`

## How to Use

### Option 1: With Proxy (Recommended)
```bash
# Terminal 1: Start backend server
cd server
npm start

# Terminal 2: Start frontend with proxy
cd ..
npm start
```

Access the application at: `http://localhost:8080`

### Option 2: Without Proxy
```bash
# Terminal 1: Start backend server
cd server
npm start

# Terminal 2: Start frontend static server
cd ..
npm run start:static
```

## Testing Authentication Flow

1. Navigate to `http://localhost:8080/patient-portal.html`
2. Login with valid credentials
3. You should be redirected to `/dashboard.html`
4. The dashboard should load without redirecting back to login
5. Check browser DevTools:
   - Network tab: Verify cookie is sent with API requests
   - Application tab: Check cookie is stored for localhost

## Important Notes

- The proxy solution is more reliable for development
- In production, ensure frontend and backend are on the same domain
- Never use `sameSite: 'none'` without `secure: true` (HTTPS)
- The localStorage fallback in the frontend provides resilience but shouldn't be relied upon for security

## Troubleshooting

If authentication still fails:

1. Clear all cookies for localhost
2. Check the backend server is running on port 5001
3. Verify CORS errors in browser console
4. Ensure you're using the correct start command (`npm start` for proxy)
5. Try incognito/private browsing mode to rule out stale cookies