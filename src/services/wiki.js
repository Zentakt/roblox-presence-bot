const axios = require('axios');

/**
 * FandomWikiService - Handles interactions with Fandom MediaWiki API
 * Implements fuzzy search with fallback to prefix search for typo tolerance
 */
class FandomWikiService {
    constructor() {
        this.timeout = 10000; // 10 second timeout
        // Map of known game names to their Fandom wiki domains
        this.wikiDomains = {
            'blox fruits': 'blox-fruits.fandom.com',
            'jailbreak': 'jailbreak.fandom.com',
            'arsenal': 'roblox-arsenal.fandom.com',
            'adopt me': 'adoptme.fandom.com',
            'tower defense simulator': 'tower-defense-simulator.fandom.com',
            'pet simulator': 'pet-simulator.fandom.com',
            'bee swarm simulator': 'bee-swarm-simulator.fandom.com',
            'anime fighters simulator': 'anime-fighters-simulator.fandom.com',
            'islands': 'islands.fandom.com',
            'anime adventures': 'anime-adventures.fandom.com',
            'all star tower defense': 'all-star-tower-defense.fandom.com'
        };
    }

    /**
     * Get the appropriate Fandom wiki domain for a game
     * @param {string} gameName - The game name
     * @returns {string} - The Fandom wiki domain
     */
    _getWikiDomain(gameName) {
        const normalized = gameName.toLowerCase().trim();
        
        // Check for exact or partial matches in our known domains
        for (const [key, domain] of Object.entries(this.wikiDomains)) {
            if (normalized.includes(key) || key.includes(normalized)) {
                console.log(`🎯 [Wiki] Matched "${gameName}" to ${domain}`);
                return domain;
            }
        }
        
        // Try to construct a domain from the game name
        const slug = normalized.replace(/[^a-z0-9]+/g, '-');
        const constructedDomain = `${slug}.fandom.com`;
        console.log(`🔧 [Wiki] Constructed domain for "${gameName}": ${constructedDomain}`);
        return constructedDomain;
    }

    /**
     * Get the base API URL for a wiki domain
     * @param {string} domain - The Fandom wiki domain
     * @returns {string} - The API URL
     */
    _getApiUrl(domain) {
        return `https://${domain}/api.php`;
    }

    /**
     * Search for a game page with fuzzy matching and fallback
     * @param {string} gameName - The game name to search for
     * @returns {Promise<{title: string, pageid: number, domain: string} | null>} - Best matching page or null
     */
    async searchGame(gameName) {
        try {
            // Determine the wiki domain for this game
            const domain = this._getWikiDomain(gameName);
            
            // First attempt: Search for "Codes" page directly
            console.log(`🔍 [Wiki] Searching for Codes page on ${domain}...`);
            const codesResult = await this._performSearch('Codes', domain);
            if (codesResult) {
                console.log(`✅ [Wiki] Found Codes page: "${codesResult.title}"`);
                return { ...codesResult, domain };
            }

            // Fallback: Search for "Working Codes" or similar
            console.log(`🔄 [Wiki] Searching for alternative code pages...`);
            const altResult = await this._performSearch('Working Codes', domain);
            if (altResult) {
                console.log(`✅ [Wiki] Found alternative: "${altResult.title}"`);
                return { ...altResult, domain };
            }

            console.warn(`❌ [Wiki] No Codes page found on ${domain}`);
            return null;
        } catch (error) {
            console.error('Error searching game:', error.message);
            throw new Error(`Failed to search wiki: ${error.message}`);
        }
    }

    /**
     * Perform full-text search on Fandom
     * @private
     */
    async _performSearch(query, domain) {
        try {
            const apiUrl = this._getApiUrl(domain);
            const response = await axios.get(apiUrl, {
                params: {
                    action: 'query',
                    list: 'search',
                    srsearch: query,
                    srlimit: 5,
                    format: 'json'
                },
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'RobloxPresenceBot/1.0 (Discord Bot)'
                }
            });

            const results = response.data?.query?.search || [];
            if (results.length > 0) {
                // Return the first (best matching) result
                return {
                    title: results[0].title,
                    pageid: results[0].pageid
                };
            }
            return null;
        } catch (error) {
            console.warn(`Full-text search failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetch the full page content from Fandom
     * @param {string} pageTitle - The page title to fetch
     * @param {string} domain - The Fandom wiki domain
     * @returns {Promise<string>} - HTML content of the page
     */
    async fetchPageContent(pageTitle, domain) {
        try {
            console.log(`📖 [Wiki] Fetching page "${pageTitle}" from ${domain}...`);
            const apiUrl = this._getApiUrl(domain);
            const response = await axios.get(apiUrl, {
                params: {
                    action: 'parse',
                    page: pageTitle,
                    prop: 'text',
                    format: 'json',
                    redirects: 1 // Follow redirects
                },
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'RobloxPresenceBot/1.0 (Discord Bot)'
                }
            });

            const html = response.data?.parse?.text?.['*'];
            if (!html) {
                throw new Error('No content received from wiki');
            }

            console.log(`📄 [Wiki] Successfully fetched ${html.length} bytes`);
            return html;
        } catch (error) {
            console.error('Error fetching page content:', error.message);
            throw new Error(`Failed to fetch page content: ${error.message}`);
        }
    }

    /**
     * Extract codes section from wiki HTML
     * @param {string} html - The HTML content from the wiki
     * @returns {Promise<{found: boolean, codes: Array<{code: string, reward?: string, status?: string}>}>}
     */
    async extractCodesFromHTML(html) {
        try {
            let codesSection = null;

            // First look for specific robust section markers (e.g., "Working Codes")
            const robustPatterns = [
                // Wiki tabber content (Common in Fandom wikis)
                /<div[^>]*class="[^"]*wds-tab__content[^"]*wds-is-current[^"]*"[^>]*>([\s\S]+?)<\/div>/i,
                // "Working Codes" header or span
                /<span[^>]*id="Working_Codes"[^>]*>([\s\S]+?)(?=<h2|<span[^>]*id="Expired_Codes"|$)/i,
                /<h[2-4][^>]*>[\s\n]*(?:Active|Working)\s+Codes?[\s\n]*<\/h[2-4]>([\s\S]{0,10000}?)(?=<h[2-4]|$)/i
            ];

            for (const pattern of robustPatterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    codesSection = match[1];
                    console.log('✅ [Wiki] Found robust code section');
                    break;
                }
            }
            
            // If no robust section found, proceed with standard patterns
            if (!codesSection) {
                const patterns = [
                    // Standard heading patterns (h2, h3)
                    /<h[2-4][^>]*>[\s\n]*(?:Active\s+)?Codes?[\s\n]*<\/h[2-4]>([\s\S]*?)(?=<h[2-4]|<\/section|$)/i,
                    // Bold/strong section headings
                    /<(?:strong|b)[^>]*>[\s\n]*(?:Active\s+)?Codes?[\s\n]*<\/(?:strong|b)>([\s\S]{0,5000}?)(?=<(?:strong|b|h[2-4])|<\/section|$)/i,
                    // Titles with special formatting
                    /<span[^>]*class="[^"]*heading[^"]*"[^>]*>[\s\n]*(?:Active\s+)?Codes?[\s\n]*<\/span>([\s\S]{0,5000}?)(?=<span|<h|$)/i,
                    // Fallback: Look for any section with "code" nearby
                    /[Cc]odes?[\s\n]*<[^>]*>[\s\S]{0,200}?<\/[^>]*>([\s\S]{0,5000}?)(?=<h[2-4]|$)/i
                ];

                for (const pattern of patterns) {
                    const match = html.match(pattern);
                    if (match && match[1]) {
                        codesSection = match[1];
                        break;
                    }
                }
            }

            if (!codesSection) {
                console.warn('⚠️  [Wiki] No Codes section found in page');
                return { found: false, codes: [] };
            }

            const codes = [];

            // Extract individual code blocks with improved patterns
            const codePatterns = [
                // Format 1: Code tags inside table cells (PRIMARY - most common on modern wikis)
                /<td[^>]*>[\s\S]*?<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\S]*?<\/td>/gi,
                // Format 2: Table rows with code in first column (handles mixed case)
                /<td[^>]*>[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*<\/td>[\s\S]{0,500}?<td[^>]*>([\s\S]{0,200}?)<\/td>/gi,
                // Format 3: List items with codes
                /<li[^>]*>[\s\n]*<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<\/li>/gi,
                // Format 4: Direct code+description in <p> tags
                /<p[^>]*>[\s\n]*<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<\/p>/gi,
                // Format 5: Code in strong/bold tags
                /<(?:strong|b)[^>]*>([A-Za-z0-9\-_]{3,50})<\/(?:strong|b)>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<br/gi,
                // Format 6: Code with pipe separator (wiki table format)
                /\|[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*\|[\s\n]*([\s\S]{0,100}?)\|/gi,
                // Format 7: Plain code tags followed by description
                /<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)(?=<code|<\/li|<\/td|<\/p|<br|$)/gi,
                // Format 8: Code in divs or spans
                /<(?:div|span)[^>]*>[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*<\/(?:div|span)>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<br/gi,
                // Format 9: Simple text nodes in table cells (catches any alphanumeric code)
                /<td[^>]*>\s*(?:<[^>]+>)*\s*([A-Za-z0-9_\-]{3,50})\s*(?:<\/[^>]+>)?\s*<\/td>/gi
            ];

            for (const pattern of codePatterns) {
                let match;
                while ((match = pattern.exec(codesSection)) !== null) {
                    const code = match[1].trim();
                    const description = match[2]?.trim() || '';

                    // Avoid duplicates and filter out noise
                    if (
                        code.length >= 3 &&
                        !codes.some(c => c.code === code) &&
                        !this._isNoise(code)
                    ) {
                        codes.push({
                            code,
                            reward: this._cleanHTML(description) || 'Unknown reward'
                        });
                    }
                }
            }

            // Fallback: If almost no codes found, try broader extraction
            if (codes.length === 0) {
                const plainCodePattern = /\b([A-Za-z0-9]{4,50}(?:[_\-][A-Za-z0-9]{2,})?)\b/g;
                const matches = codesSection.match(plainCodePattern);
                if (matches) {
                    const uniqueCodes = [...new Set(matches)];
                    uniqueCodes.slice(0, 20).forEach(code => {
                        if (!this._isNoise(code)) {
                            codes.push({ code, reward: 'Unknown reward' });
                        }
                    });
                }
            }

            console.log(`✅ [Wiki] Extracted ${codes.length} codes from section`);
            return {
                found: true,
                codes: codes.slice(0, 15) // Limit to 15 codes for Discord embed
            };
        } catch (error) {
            console.error('Error extracting codes:', error.message);
            return { found: false, codes: [] };
        }
    }

    /**
     * Check if a string is likely noise (common words, HTML, etc)
     * @private
     */
    _isNoise(text) {
        const noisePatterns = [
            /^(HTML|BODY|DIV|SPAN|CLASS|STYLE|HREF|DATA|BORDER|WIDTH|HEIGHT)$/i,
            /^(HERE|THERE|WHERE|WHEN|WHAT|THIS|THAT|WHICH)$/i,
            /^(REWARDS?|GIFTS?|PRIZE|ITEMS?)$/i,
            /^[A-Z]{2}$/, // Too short
        ];
        return noisePatterns.some(pattern => pattern.test(text));
    }

    /**
     * Clean HTML tags and decode HTML entities
     * @private
     */
    _cleanHTML(text) {
        if (!text) return '';
        
        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .trim()
            .split('\n')[0] // Get first line only
            .substring(0, 100); // Limit length
    }
}

module.exports = FandomWikiService;
