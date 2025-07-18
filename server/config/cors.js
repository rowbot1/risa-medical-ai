// CORS configuration for development and production
const getCorsOptions = () => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    return {
        origin: function(origin, callback) {
            const allowedOrigins = [
                'http://localhost:8080',
                'http://127.0.0.1:8080',
                'http://192.168.1.159:8080'
            ];
            
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['set-cookie']
    };
};

// Cookie options for development and production
const getCookieOptions = () => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
        // For development: use settings that work with cross-port requests
        // Note: Modern browsers require SameSite=None with Secure=true for cross-origin cookies
        // But since we're on HTTP in development, we need a workaround
        return {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',  // This won't work for cross-port, but it's the best we can do on HTTP
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
            // Explicitly set domain without port for cross-port compatibility
            domain: 'localhost'
        };
    } else {
        // For production: strict security
        return {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
            domain: process.env.COOKIE_DOMAIN || undefined
        };
    }
};

module.exports = {
    getCorsOptions,
    getCookieOptions
};