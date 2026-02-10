const axios = require('axios');

async function testRegex() {
    try {
        console.log('🧪 Testing regex patterns directly...\n');

        const html = `
<table>
<tr>
<td><code>LIGHTNINGABUSE</code></td>
<td>20 minutes of 2x Experience</td>
</tr>
<tr>
<td><code>HAPPYFUNNY</code></td>
<td>20 minutes of XP Boost</td>
</tr>
</table>
        `;

        console.log('Test HTML:');
        console.log(html);
        console.log('\n========== REGEX TESTS ==========\n');

        // Format 7
        const format7 = /<code[^>]*>([A-Za-z0-9\-_]{3,50})<\/code>[\s\n]*(?:-|–|:)?[\s\n]*([\s\S]{0,100}?)(?=<code|<\/li|<\/td|<\/p|<br|$)/gi;
        console.log('Format 7 (code tags):');
        let match;
        let count = 0;
        while ((match = format7.exec(html)) !== null) {
            count++;
            console.log(`  ${count}. Code: "${match[1]}", Description: "${match[2]}"`);
        }
        if (count === 0) console.log('  ❌ No matches');

        // Format 9
        const format9 = /<td[^>]*>\s*(?:<[^>]+>)*\s*([A-Za-z0-9_\-]{3,50})\s*(?:<\/[^>]+>)?\s*<\/td>/gi;
        console.log('\nFormat 9 (table cells):');
        count = 0;
        while ((match = format9.exec(html)) !== null) {
            count++;
            console.log(`  ${count}. "${match[1]}"`);
        }
        if (count === 0) console.log('  ❌ No matches');

        // New fallback
        const fallback = />[\s\n]*([A-Za-z0-9\-_]{4,50})[\s\n]*</g;
        console.log('\nFallback (>CODE<):');
        count = 0;
        while ((match = fallback.exec(html)) !== null) {
            count++;
            console.log(`  ${count}. "${match[1]}"`);
        }
        if (count === 0) console.log('  ❌ No matches');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testRegex();
