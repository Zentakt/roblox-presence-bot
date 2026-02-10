const axios = require('axios');

async function inspectBloxFruitsCodes() {
    try {
        console.log('🔍 Inspecting Blox Fruits HTML structure...\n');

        const apiUrl = 'https://blox-fruits.fandom.com/api.php';
        const response = await axios.get(apiUrl, {
            params: {
                action: 'parse',
                page: 'Codes',
                prop: 'text',
                format: 'json',
                redirects: 1
            },
            timeout: 10000,
            headers: {
                'User-Agent': 'RobloxPresenceBot/1.0 (Discord Bot)'
            }
        });

        const html = response.data?.parse?.text?.['*'];
        if (!html) {
            console.error('❌ No HTML received');
            return;
        }

        // Find Working_Codes or Active section
        let startIdx = html.indexOf('Working_Codes');
        if (startIdx === -1) {
            startIdx = html.indexOf('Active_Codes');
        }
        
        if (startIdx === -1) {
            console.log('❌ Could not find Working_Codes or Active_Codes');
            // Try to find any h2/h3 with "Codes"
            const codesIdx = html.indexOf('Codes');
            if (codesIdx !== -1) {
                console.log(`Found "Codes" at index ${codesIdx}`);
                const snippet = html.substring(Math.max(0, codesIdx - 200), codesIdx + 1000);
                console.log('\n========== SNIPPET ==========');
                console.log(snippet);
                console.log('========== END SNIPPET ==========\n');
            }
            return;
        }

        console.log(`✅ Found Working_Codes at index ${startIdx}\n`);
        
        // Show 2000 chars after
        const snippet = html.substring(startIdx, startIdx + 2000);
        console.log('========== WORKING CODES SECTION ==========');
        console.log(snippet);
        console.log('========== END SECTION ==========\n');

        // Look for common code patterns
        console.log('🔎 Searching for common promo code patterns...\n');
        
        // Pattern: text between >...< tags
        const matches = snippet.match(/>[\s\n]*([A-Za-z0-9\-_]{4,50})[\s\n]*</g);
        if (matches) {
            console.log(`Found ${matches.length} potential codes via pattern />...</:`);
            matches.slice(0, 10).forEach((m, i) => {
                console.log(`  ${i + 1}. ${m}`);
            });
        } else {
            console.log('❌ No matches found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

inspectBloxFruitsCodes();
