const axios = require('axios');

class WikiService {
    constructor() {}
    
    _cleanHTML(str) {
        if (!str) return '';
        return str.replace(/<[^>]*>/g, '').trim();
    }
    
    _isNoise(code) {
        // Mock the isNoise function
        const noise = ['code', 'codes', 'reward', 'rewards', 'active', 'expired', 'list', 'status', 'description', 
                      'image', 'file', 'png', 'jpg', 'jpeg', 'gif', 'icon', 'button', 'click', 'enter', 
                      'redeem', 'game', 'roblox', 'likes', 'group', 'server', 'discord', 'twitter', 'youtube',
                      'subscribe', 'follow', 'join', 'check', 'verify', 'submit', 'success', 'error', 'invalid',
                      'working', 'new', 'update', 'event', 'release', 'item', 'cash', 'money', 'gems', 'coins',
                      'tokens', 'bucks', 'points', 'stats', 'boost', 'reset', 'skin', 'pet', 'weapon', 'tool',
                      'admin', 'owner', 'default', 'none', 'null', 'undefined', 'true', 'false', 'return',
                      'dev', 'developer', 'creator', 'builder', 'scripter', 'gui', 'hud',
                      'menu', 'inventory', 'shop', 'trade', 'play', 'settings', 'help', 'info', 'version',
                      'log', 'id', 'class', 'html', 'css', 'js', 'json', 'api', 'url', 'http', 'https', 'www',
                      'com', 'net', 'org', 'io', 'co', 'uk', 'us', 'ca', 'au', 'de', 'fr', 'es', 'it', 'jp',
                      'ru', 'br', 'pl', 'nl', 'se', 'no', 'dk', 'fi', 'cz', 'hu', 'ro', 'gr', 'tr', 'id',
                      'th', 'vn', 'my', 'ph', 'sg', 'kr', 'cn', 'tw', 'hk', 'in', 'sa', 'ae', 'il', 'eg',
                      'za', 'ng', 'ke', 'ma', 'dz', 'tn', 'ly', 'sd', 'et', 'so', 'dj', 'er', 'ss', 'mz',
                      'header', 'footer', 'nav', 'main', 'section', 'article', 'aside', 'div', 'span', 'p',
                      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'a', 'img', 'svg',
                      'strong', 'b', 'em', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'form',
                      'input', 'button', 'select', 'option', 'textarea', 'label', 'iframe', 'script', 'style',
                      'link', 'meta', 'head', 'body', 'title', 'mobileonly', 'headline', 'mw-headline', 'empty-elt'];
        return noise.includes(code.toLowerCase()) || /^\d+$/.test(code);
    }

    async extractCodes(html) {
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
                        console.log('⚠️ [Wiki] Used fallback section pattern');
                        break;
                    }
                }
            }

            if (!codesSection) {
                console.warn('⚠️  [Wiki] No Codes section found in page');
                return { found: false, codes: [] };
            }

            console.log("Section Preview:", codesSection.substring(0, 500));

            const codes = [];

            // Extract individual code blocks with improved patterns
            const codePatterns = [
                // Format 1: Code tags inside table cells (PRIMARY - most common on modern wikis)
                { id: 1, regex: /<td[^>]*>[\s\S]*?<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\S]*?<\/td>/gi },
                // Format 2: Table rows with code in first column (handles mixed case)
                { id: 2, regex: /<td[^>]*>[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*<\/td>[\s\S]{0,500}?<td[^>]*>([\s\S]{0,200}?)<\/td>/gi },
                // Format 3: List items with codes
                { id: 3, regex: /<li[^>]*>[\s\n]*<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<\/li>/gi },
                // Format 4: Direct code+description in <p> tags
                { id: 4, regex: /<p[^>]*>[\s\n]*<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<\/p>/gi },
                // Format 5: Code in strong/bold tags
                { id: 5, regex: /<(?:strong|b)[^>]*>([A-Za-z0-9\-_]{3,50})<\/(?:strong|b)>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<br/gi },
                // Format 6: Code with pipe separator (wiki table format)
                { id: 6, regex: /\|[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*\|[\s\n]*([\s\S]{0,100}?)\|/gi },
                // Format 7: Plain code tags followed by description
                { id: 7, regex: /<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)(?=<code|<\/li|<\/td|<\/p|<br|$)/gi },
                // Format 8: Code in divs or spans
                { id: 8, regex: /<(?:div|span)[^>]*>[\s\n]*([A-Za-z0-9\-_]{3,50})[\s\n]*<\/(?:div|span)>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)<br/gi },
                // Format 9: Simple text nodes in table cells (catches any alphanumeric code)
                { id: 9, regex: /<td[^>]*>\s*(?:<[^>]+>)*\s*([A-Za-z0-9_\-]{3,50})\s*(?:<\/[^>]+>)?\s*<\/td>/gi }
            ];

            for (const { id, regex } of codePatterns) {
                let match;
                while ((match = regex.exec(codesSection)) !== null) {
                    const code = match[1].trim();
                    const description = match[2]?.trim() || '';

                    // Avoid duplicates and filter out noise
                    if (
                        code.length >= 3 &&
                        !codes.some(c => c.code === code) &&
                        !this._isNoise(code)
                    ) {
                        console.log(`Matched Format ${id}: ${code}`);
                        codes.push({
                            code,
                            reward: this._cleanHTML(description) || 'Unknown reward'
                        });
                    }
                }
            }

            return codes;
    }
}

(async () => {
    try {
        const response = await axios.get('https://blox-fruits.fandom.com/api.php', {
            params: {
                action: 'parse',
                page: 'Codes',
                prop: 'text',
                format: 'json'
            },
            headers: { 'User-Agent': 'RobloxPresenceBot/1.0 (Discord Bot)' }
        });
        const html = response.data.parse.text['*'];
        
        const service = new WikiService();
        console.log('Extracting codes...');
        const codes = await service.extractCodes(html);
        console.log('Final codes:', codes.map(c => c.code));
    } catch (e) {
        console.error(e);
    }
})();
