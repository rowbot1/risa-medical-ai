// Simple authentication check
function checkAuth() {
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    const currentPath = window.location.pathname;
    
    console.log('Auth Check:', {
        isAuthenticated: isAuth,
        currentPath: currentPath,
        localStorage: localStorage.getItem('isAuthenticated')
    });
    
    // If on dashboard and not authenticated, redirect to login
    if (currentPath.includes('dashboard.html') && !isAuth) {
        console.log('Not authenticated, redirecting to login...');
        window.location.href = '/patient-portal.html';
        return false;
    }
    
    // If on login page and authenticated, redirect to dashboard
    if (currentPath.includes('patient-portal.html') && isAuth) {
        console.log('Already authenticated, redirecting to dashboard...');
        window.location.href = '/dashboard.html';
        return false;
    }
    
    return true;
}

// Run on page load
checkAuth();