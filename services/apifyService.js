/**
 * Apify Service - Actor-based web scraping
 * Uses Apify actors for reliable, scalable web scraping
 */

const { ApifyClient } = require('apify-client');
const fs = require('fs').promises;
const path = require('path');

// Settings file path
const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

class ApifyService {
    constructor() {
        this.client = null;
    }

    /**
     * Initialize Apify client with API token
     */
    async init() {
        if (!this.client) {
            try {
                const settingsData = await fs.readFile(SETTINGS_FILE, 'utf8');
                const settings = JSON.parse(settingsData);

                if (settings.apifyApiKey) {
                    this.client = new ApifyClient({ token: settings.apifyApiKey });
                    return true;
                }
            } catch (error) {
                console.log('No Apify API key configured');
            }
        }
        return !!this.client;
    }

    /**
     * Check if Apify is configured
     */
    async isConfigured() {
        return await this.init();
    }

    /**
     * Run LinkedIn Profile Scraper actor
     * Actor: apify/linkedin-profile-scraper (or similar)
     * @param {string} profileUrl - LinkedIn profile URL
     * @returns {Object} Profile data
     */
    async scrapeLinkedInProfile(profileUrl) {
        const initialized = await this.init();
        if (!initialized) {
            return { success: false, error: 'Apify API key not configured' };
        }

        try {
            // Using a free/community LinkedIn scraper
            const run = await this.client.actor('curious_coder/linkedin-profile-scraper').call({
                profileUrls: [profileUrl],
                proxy: {
                    useApifyProxy: true,
                    apifyProxyGroups: ['RESIDENTIAL']
                }
            });

            // Wait for results
            const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

            if (items && items.length > 0) {
                return {
                    success: true,
                    data: items[0],
                    source: 'apify',
                    actorId: 'linkedin-profile-scraper',
                    runId: run.id
                };
            }

            return { success: false, error: 'No data returned' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Run Google Search Scraper actor
     * @param {string} query - Search query
     * @returns {Object} Search results
     */
    async searchGoogle(query) {
        const initialized = await this.init();
        if (!initialized) {
            return { success: false, error: 'Apify API key not configured' };
        }

        try {
            const run = await this.client.actor('apify/google-search-scraper').call({
                queries: query,
                maxPagesPerQuery: 1,
                resultsPerPage: 10,
                mobileResults: false,
                languageCode: 'fr',
                countryCode: 'fr'
            });

            const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

            return {
                success: true,
                data: items,
                source: 'apify',
                actorId: 'google-search-scraper',
                runId: run.id
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Run Website Content Crawler actor
     * @param {string} websiteUrl - Website URL to crawl
     * @returns {Object} Website content
     */
    async crawlWebsite(websiteUrl) {
        const initialized = await this.init();
        if (!initialized) {
            return { success: false, error: 'Apify API key not configured' };
        }

        try {
            const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

            const run = await this.client.actor('apify/website-content-crawler').call({
                startUrls: [{ url }],
                maxCrawlPages: 5,
                maxCrawlDepth: 1,
                includeHtmlContent: false
            });

            const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

            return {
                success: true,
                data: items,
                source: 'apify',
                actorId: 'website-content-crawler',
                runId: run.id
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Run Contact Info Scraper
     * Extracts emails, phones, and social links from a website
     * @param {string} websiteUrl - Website URL
     * @returns {Object} Contact information
     */
    async scrapeContactInfo(websiteUrl) {
        const initialized = await this.init();
        if (!initialized) {
            return { success: false, error: 'Apify API key not configured' };
        }

        try {
            const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

            const run = await this.client.actor('apify/contact-info-scraper').call({
                startUrls: [{ url }],
                maxRequestsPerCrawl: 10
            });

            const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

            return {
                success: true,
                data: items,
                source: 'apify',
                actorId: 'contact-info-scraper',
                runId: run.id
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get comprehensive data for a prospect using Apify actors
     * @param {Object} prospect - Prospect object
     * @returns {Object} Aggregated data from multiple sources
     */
    async researchProspect(prospect) {
        const results = {
            prospect: {
                id: prospect.id,
                name: `${prospect.prenom || ''} ${prospect.nom || ''}`.trim()
            },
            linkedin: null,
            website: null,
            contacts: null,
            searchResults: null,
            researchedAt: new Date().toISOString(),
            source: 'apify'
        };

        try {
            const tasks = [];

            // LinkedIn profile
            if (prospect.linkedin) {
                tasks.push(
                    this.scrapeLinkedInProfile(prospect.linkedin)
                        .then(res => { results.linkedin = res; })
                );
            }

            // Company website
            if (prospect.siteWeb) {
                tasks.push(
                    this.crawlWebsite(prospect.siteWeb)
                        .then(res => { results.website = res; })
                );
                tasks.push(
                    this.scrapeContactInfo(prospect.siteWeb)
                        .then(res => { results.contacts = res; })
                );
            }

            // Google search
            const searchQuery = `${prospect.prenom || ''} ${prospect.nom || ''} ${prospect.entreprise || ''}`.trim();
            if (searchQuery) {
                tasks.push(
                    this.searchGoogle(searchQuery)
                        .then(res => { results.searchResults = res; })
                );
            }

            await Promise.allSettled(tasks);

            return { success: true, data: results };

        } catch (error) {
            return { success: false, error: error.message, partialData: results };
        }
    }

    /**
     * Search for businesses on Google Maps
     * @param {string} searchQuery - What to search for (e.g., "restaurants", "plombiers")
     * @param {string} location - Location to search in (e.g., "Paris, France")
     * @param {number} maxResults - Maximum number of results (default: 20)
     * @returns {Object} List of businesses
     */
    async searchGoogleMaps(searchQuery, location, maxResults = 20, hasWebsite = false, maxReviews) {
        const initialized = await this.init();
        if (!initialized) {
            return { success: false, error: 'Apify API key not configured' };
        }

        try {
            // Using compass/crawler-google-places actor
            const run = await this.client.actor('compass/crawler-google-places').call({
                searchStringsArray: [searchQuery],
                locationQuery: location,
                maxCrawledPlacesPerSearch: maxResults,
                language: 'fr',
                deeperCityScrape: false,
                scrapeContacts: true,
                scrapeImages: false,
                scrapeReviews: false,
                scrapeSocialMediaProfiles: {
                    facebook: true,
                    instagram: true,
                    twitter: false,
                    linkedin: true
                }
            });

            const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

            // Transform results to prospect-friendly format
            let prospects = (items || []).map(item => ({
                id: `gmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: item.title || item.name || '',
                entreprise: item.title || item.name || '',
                address: item.address || '',
                phone: item.phone || item.phoneUnformatted || '',
                website: item.website || item.url || '',
                email: item.email || '',
                category: item.categoryName || item.categories?.join(', ') || '',
                rating: item.totalScore || item.rating || null,
                reviewCount: item.reviewsCount || 0,
                googleMapsUrl: item.url || item.googleMapsUrl || '',
                placeId: item.placeId || '',
                latitude: item.location?.lat || null,
                longitude: item.location?.lng || null,
                socialMedia: {
                    facebook: item.facebookUrl || null,
                    instagram: item.instagramUrl || null,
                    linkedin: item.linkedInUrl || null
                },
                source: 'google_maps',
                scrapedAt: new Date().toISOString()
            }));

            if (hasWebsite) {
                prospects = prospects.filter(p => !!p.website);
            }

            if (maxReviews !== undefined && maxReviews !== null) {
                prospects = prospects.filter(p => p.reviewCount <= maxReviews);
            }

            return {
                success: true,
                data: prospects,
                totalResults: prospects.length,
                source: 'apify',
                actorId: 'compass/crawler-google-places',
                runId: run.id
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * List available Apify actors (for UI display)
     */
    getAvailableActors() {
        return [
            {
                id: 'google-maps-scraper',
                name: 'Google Maps Scraper',
                description: 'Rechercher des entreprises sur Google Maps'
            },
            {
                id: 'linkedin-profile-scraper',
                name: 'LinkedIn Profile Scraper',
                description: 'Scrape public LinkedIn profile data'
            },
            {
                id: 'google-search-scraper',
                name: 'Google Search Scraper',
                description: 'Search and extract Google results'
            },
            {
                id: 'website-content-crawler',
                name: 'Website Content Crawler',
                description: 'Crawl and extract website content'
            },
            {
                id: 'contact-info-scraper',
                name: 'Contact Info Scraper',
                description: 'Extract emails, phones, social links'
            }
        ];
    }
}

// Singleton instance
const apifyService = new ApifyService();

module.exports = apifyService;
