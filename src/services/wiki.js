const axios = require('axios');

/**
 * FandomWikiService - Handles interactions with Fandom MediaWiki API
 * Implements fuzzy search with fallback to prefix search for typo tolerance
 */
class FandomWikiService {
    constructor() {
        this.baseUrl = 'https://roblox.fandom.com/api.php';
        this.timeout = 10000; // 10 second timeout
    }

    /**
     * Search for a game page with fuzzy matching and fallback
     * @param {string} gameName - The game name to search for
     * @returns {Promise<{title: string, pageid: number} | null>} - Best matching page or null
     */
    async searchGame(gameName) {
        try {
            // First attempt: Full-text search with fuzzy matching
            console.log(`🔍 [Wiki] Searching for "${gameName}" via full-text search...`);
            const searchResult = await this._performSearch(gameName);
            if (searchResult) {
                console.log(`✅ [Wiki] Found via full-text search: "${searchResult.title}"`);
                return searchResult;
            }

            // Fallback: Prefix search with fuzzy profile (supports typo correction)
            console.log(`🔄 [Wiki] Falling back to prefix search with typo correction...`);
            const prefixResult = await this._performPrefixSearch(gameName);
            if (prefixResult) {
                console.log(`✅ [Wiki] Found via prefix search: "${prefixResult.title}"`);
                return prefixResult;
            }

            console.warn(`❌ [Wiki] No matching game found for "${gameName}"`);
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
    async _performSearch(query) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    action: 'query',
                    list: 'search',
                    srsearch: query,
                    srlimit: 5,
                    srwhat: 'title', // Search titles primarily
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
     * Perform prefix search with fuzzy matching on Fandom
     * Handles typos and provides better suggestions
     * @private
     */
    async _performPrefixSearch(query) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    action: 'query',
                    list: 'prefixsearch',
                    pssearch: query,
                    pslimit: 5,
                    psprofile: 'fuzzy', // Enable typo correction (up to 2 typos)
                    format: 'json'
                },
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'RobloxPresenceBot/1.0 (Discord Bot)'
                }
            });

            const results = response.data?.query?.prefixsearch || [];
            if (results.length > 0) {
                // Return the first (best matching) result
                return {
                    title: results[0].title,
                    pageid: results[0].pageid
                };
            }
            return null;
        } catch (error) {
            console.warn(`Prefix search failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetch the full page content from Fandom
     * @param {string} pageTitle - The page title to fetch
     * @returns {Promise<string>} - HTML content of the page
     */
    async fetchPageContent(pageTitle) {
        try {
            console.log(`📖 [Wiki] Fetching page content for "${pageTitle}"...`);
            const response = await axios.get(this.baseUrl, {
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

            // Try multiple patterns to find the codes section
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

            if (!codesSection) {
                console.warn('⚠️  [Wiki] No Codes section found in page');
                return { found: false, codes: [] };
            }

            const codes = [];

            // Extract individual code blocks with improved patterns
            const codePatterns = [
                // Format 1: Table rows with code in first column (handles mixed case)
                /<td[^>]*>[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*<\/td>[\s\S]{0,500}?<td[^>]*>([\s\S]{0,200}?)<\/td>/gi,
                // Format 2: List items with codes
                /<li[^>]*>[\s\n]*<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<\/li>/gi,
                // Format 3: Direct code+description in <p> tags
                /<p[^>]*>[\s\n]*<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<\/p>/gi,
                // Format 4: Code in strong/bold tags
                /<(?:strong|b)[^>]*>([A-Za-z0-9\-_]{3,50})<\/(?:strong|b)>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<br/gi,
                // Format 5: Code with pipe separator (wiki table format)
                /\|[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*\|[\s\n]*([\s\S]{0,100}?)\|/gi,
                // Format 6: Plain code tags followed by description
                /<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)(?=<code|<\/li|<\/td|<\/p|<br|$)/gi,
                // Format 7: Code in divs or spans
                /<(?:div|span)[^>]*>[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*<\/(?:div|span)>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<br/gi,
                // Format 8: Simple text nodes in table cells (catches any alphanumeric code)
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
