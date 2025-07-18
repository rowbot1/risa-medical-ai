const { dbAsync } = require('../utils/database');

// Monitoring middleware for NER operations
const monitorNER = (operation) => {
    return async (req, res, next) => {
        // For now, just pass through without monitoring
        // This avoids the database serialization issue
        next();
    };
};

// Stub functions to avoid errors
async function logNEROperation(data) {
    // Logging disabled for now
}

async function trackAPIUsage(userId) {
    // Tracking disabled for now
}

async function getNERStats(days = 7) {
    return [];
}

// Error handler for NER operations
function handleNERError(error, operation) {
    // Log error details
    console.error(`NER Error in ${operation}:`, {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    
    // Determine error type and appropriate response
    if (error.message && error.message.includes('Hugging Face API token not configured')) {
        return {
            status: 503,
            error: 'NER service not configured. Please contact administrator.',
            code: 'NER_NOT_CONFIGURED'
        };
    }
    
    if (error.message && error.message.includes('Hugging Face API error: 429')) {
        return {
            status: 429,
            error: 'AI service rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
        };
    }
    
    if (error.message && error.message.includes('Hugging Face API error: 503')) {
        return {
            status: 503,
            error: 'AI service temporarily unavailable. Please try again later.',
            code: 'SERVICE_UNAVAILABLE'
        };
    }
    
    if (error.message && error.message.includes('Record not found')) {
        return {
            status: 404,
            error: 'Medical record not found.',
            code: 'RECORD_NOT_FOUND'
        };
    }
    
    // Generic error
    return {
        status: 500,
        error: 'An error occurred while processing your request.',
        code: 'INTERNAL_ERROR'
    };
}

module.exports = {
    monitorNER,
    getNERStats,
    handleNERError,
    logNEROperation,
    trackAPIUsage
};