const axios = require('axios');

// Mock the service
const FandomWikiService = require('./src/services/wiki.js');
const service = new FandomWikiService();

async function testBBloxFruitsCodes() {
    try {
        console.log('🧪 Testing Blox Fruits code extraction...\n');

        // Step 1: Search for the Codes page
        const result = await service.searchGame('Blox Fruits');
        if (!result) {
            console.error('❌ Failed to find Blox Fruits codes page');
            return;
        }
        console.log(`✅ Found page: ${result.title}`);
        console.log(`   Domain: ${result.domain}\n`);

        // Step 2: Fetch the page content
        const html = await service.fetchPageContent(result.title, result.domain);
        console.log(`✅ Fetched ${html.length} bytes\n`);

        // Step 3: Extract codes
        const extracted = await service.extractCodesFromHTML(html);
        console.log(`✅ Extraction complete`);
        console.log(`   Found: ${extracted.codes.length} codes\n`);

        // Step 4: Display results
        if (extracted.codes && extracted.codes.length > 0) {
            console.log('📋 Extracted Codes:');
            extracted.codes.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.code}`);
                if (item.reward && item.reward !== 'Unknown reward') {
                    console.log(`      → ${item.reward}`);
                }
            });
        } else {
            console.log('⚠️  No codes found');
        }

        // Step 5: Validation
        console.log('\n🔍 Validation:');
        let valid = 0;
        let invalid = 0;
        extracted.codes?.forEach(item => {
            // Real Blox Fruits codes are typically 4-30 chars, alphanumeric + underscore
            if (/^[A-Za-z0-9_]{4,30}$/.test(item.code) && item.code !== 'mobileonly' && item.code !== 'empty-elt') {
                valid++;
            } else {
                invalid++;
                console.log(`   ❌ INVALID: "${item.code}"`);
            }
        });
        console.log(`   ✅ Valid: ${valid}`);
        console.log(`   ❌ Invalid: ${invalid}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testBBloxFruitsCodes();
