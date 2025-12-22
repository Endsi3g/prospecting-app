/**
 * Playwright Service - Web scraping for prospect research
 * Scrapes LinkedIn profiles and company websites to gather prospect data
 */

const { chromium } = require('playwright');

class PlaywrightService {
    constructor() {
        this.browser = null;
    }

    /**
     * Initialize browser instance
     */
    async init() {
        if (!this.browser) {
            this.browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    /**
     * Close browser instance
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Scrape a LinkedIn profile (public data only)
     * @param {string} profileUrl - LinkedIn profile URL
     * @returns {Object} Profile data
     */
    async scrapeLinkedInProfile(profileUrl) {
        const browser = await this.init();
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        try {
            await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });

            // Wait for content to load
            await page.waitForTimeout(2000);

            // Extract public profile data
            const profileData = await page.evaluate(() => {
                const getData = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : null;
                };

                return {
                    name: getData('h1') || getData('.text-heading-xlarge'),
                    headline: getData('.text-body-medium') || getData('[data-generated-suggestion-target]'),
                    location: getData('.text-body-small.inline'),
                    about: getData('#about + .display-flex .inline-show-more-text'),
                    currentCompany: getData('.inline-show-more-text'),
                    connectionCount: getData('.t-bold'),
                    scrapedAt: new Date().toISOString()
                };
            });

            await context.close();
            return { success: true, data: profileData, source: 'playwright' };

        } catch (error) {
            await context.close();
            return {
                success: false,
                error: error.message,
                note: 'LinkedIn may require authentication for full profile access'
            };
        }
    }

    /**
     * Scrape a company website for business information
     * @param {string} websiteUrl - Company website URL
     * @returns {Object} Company data
     */
    async scrapeCompanyWebsite(websiteUrl) {
        const browser = await this.init();
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        try {
            // Ensure URL has protocol
            const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

            await page.waitForTimeout(2000);

            // Extract website data
            const companyData = await page.evaluate(() => {
                const getText = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim().substring(0, 500) : null;
                };

                const getMeta = (name) => {
                    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                    return el ? el.getAttribute('content') : null;
                };

                // Try to find contact info
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
                const bodyText = document.body.innerText;

                const emails = bodyText.match(emailRegex) || [];
                const phones = bodyText.match(phoneRegex) || [];

                return {
                    title: document.title,
                    description: getMeta('description') || getMeta('og:description'),
                    keywords: getMeta('keywords'),
                    h1: getText('h1'),
                    emails: [...new Set(emails)].slice(0, 5),
                    phones: [...new Set(phones)].slice(0, 3),
                    socialLinks: {
                        linkedin: document.querySelector('a[href*="linkedin.com"]')?.href,
                        twitter: document.querySelector('a[href*="twitter.com"], a[href*="x.com"]')?.href,
                        facebook: document.querySelector('a[href*="facebook.com"]')?.href
                    },
                    scrapedAt: new Date().toISOString()
                };
            });

            await context.close();
            return { success: true, data: companyData, source: 'playwright' };

        } catch (error) {
            await context.close();
            return { success: false, error: error.message };
        }
    }

    /**
     * Search Google for prospect information
     * @param {string} query - Search query (name + company)
     * @returns {Object} Search results
     */
    async searchProspect(query) {
        const browser = await this.init();
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

            await page.waitForTimeout(2000);

            // Extract search results
            const results = await page.evaluate(() => {
                const items = [];
                const resultElements = document.querySelectorAll('.g');

                resultElements.forEach((el, index) => {
                    if (index < 5) {
                        const titleEl = el.querySelector('h3');
                        const linkEl = el.querySelector('a');
                        const snippetEl = el.querySelector('.VwiC3b');

                        if (titleEl && linkEl) {
                            items.push({
                                title: titleEl.textContent,
                                url: linkEl.href,
                                snippet: snippetEl ? snippetEl.textContent : null
                            });
                        }
                    }
                });

                return items;
            });

            await context.close();
            return { success: true, data: results, query, source: 'playwright' };

        } catch (error) {
            await context.close();
            return { success: false, error: error.message };
        }
    }

    /**
     * Get comprehensive online presence for a prospect
     * @param {Object} prospect - Prospect object with name, company, linkedin, website
     * @returns {Object} Aggregated online data
     */
    async getOnlinePresence(prospect) {
        const results = {
            prospect: { id: prospect.id, name: `${prospect.prenom || ''} ${prospect.nom || ''}`.trim() },
            linkedin: null,
            website: null,
            searchResults: null,
            scrapedAt: new Date().toISOString()
        };

        try {
            // Scrape LinkedIn if available
            if (prospect.linkedin) {
                results.linkedin = await this.scrapeLinkedInProfile(prospect.linkedin);
            }

            // Scrape company website if available
            if (prospect.siteWeb) {
                results.website = await this.scrapeCompanyWebsite(prospect.siteWeb);
            }

            // Search for prospect online
            const searchQuery = `${prospect.prenom || ''} ${prospect.nom || ''} ${prospect.entreprise || ''}`.trim();
            if (searchQuery) {
                results.searchResults = await this.searchProspect(searchQuery);
            }

            return { success: true, data: results };

        } catch (error) {
            return { success: false, error: error.message, partialData: results };
        }
    }
}

// Singleton instance
const playwrightService = new PlaywrightService();

module.exports = playwrightService;
