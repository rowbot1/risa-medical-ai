// Cookie Consent Management
class CookieConsent {
    constructor() {
        this.cookieName = 'risa_cookie_consent';
        this.cookieExpiry = 365; // days
        this.init();
    }

    init() {
        // Check if consent has been given
        if (!this.hasConsent()) {
            this.showBanner();
        }
    }

    hasConsent() {
        return this.getCookie(this.cookieName) !== null;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
    }

    showBanner() {
        const banner = document.createElement('div');
        banner.className = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-text">
                    <h3>We use cookies</h3>
                    <p>We use cookies to improve your experience on our website, analyze site traffic, and provide personalized content. By continuing to use our site, you consent to our use of cookies.</p>
                    <a href="/privacy-policy.html" target="_blank">Learn more in our Privacy Policy</a>
                </div>
                <div class="cookie-actions">
                    <button class="cookie-btn cookie-btn-reject">Reject Non-Essential</button>
                    <button class="cookie-btn cookie-btn-accept">Accept All Cookies</button>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();

        // Add to body
        document.body.appendChild(banner);

        // Add event listeners
        banner.querySelector('.cookie-btn-accept').addEventListener('click', () => {
            this.acceptAll();
            this.hideBanner(banner);
        });

        banner.querySelector('.cookie-btn-reject').addEventListener('click', () => {
            this.acceptEssential();
            this.hideBanner(banner);
        });

        // Animate in
        setTimeout(() => {
            banner.classList.add('show');
        }, 100);
    }

    hideBanner(banner) {
        banner.classList.remove('show');
        setTimeout(() => {
            banner.remove();
        }, 300);
    }

    acceptAll() {
        this.setCookie(this.cookieName, 'all', this.cookieExpiry);
        this.enableAnalytics();
        this.enableMarketing();
    }

    acceptEssential() {
        this.setCookie(this.cookieName, 'essential', this.cookieExpiry);
        // Essential cookies are always enabled
    }

    enableAnalytics() {
        // Enable Google Analytics or other analytics
        // This is where you'd initialize analytics scripts
        console.log('Analytics cookies enabled');
    }

    enableMarketing() {
        // Enable marketing/advertising cookies
        console.log('Marketing cookies enabled');
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cookie-consent-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: #1A202C;
                color: white;
                z-index: 9999;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
            }

            .cookie-consent-banner.show {
                transform: translateY(0);
            }

            .cookie-consent-content {
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 2rem;
            }

            .cookie-text {
                flex: 1;
                min-width: 300px;
            }

            .cookie-text h3 {
                margin: 0 0 0.5rem 0;
                font-size: 1.25rem;
                color: white;
            }

            .cookie-text p {
                margin: 0 0 0.5rem 0;
                color: #E2E8F0;
                line-height: 1.6;
            }

            .cookie-text a {
                color: #63B3ED;
                text-decoration: underline;
            }

            .cookie-text a:hover {
                color: #90CDF4;
            }

            .cookie-actions {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .cookie-btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 0.375rem;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }

            .cookie-btn-accept {
                background-color: #2C5282;
                color: white;
            }

            .cookie-btn-accept:hover {
                background-color: #2A4E7C;
                transform: translateY(-1px);
            }

            .cookie-btn-reject {
                background-color: transparent;
                color: white;
                border: 2px solid #4A5568;
            }

            .cookie-btn-reject:hover {
                background-color: #4A5568;
            }

            @media (max-width: 768px) {
                .cookie-consent-content {
                    flex-direction: column;
                    text-align: center;
                }

                .cookie-actions {
                    justify-content: center;
                    width: 100%;
                }

                .cookie-btn {
                    flex: 1;
                    min-width: 140px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize cookie consent when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CookieConsent();
    });
} else {
    new CookieConsent();
}