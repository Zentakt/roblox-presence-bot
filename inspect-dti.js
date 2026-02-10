const axios = require('axios');

async function inspectDtiCodes() {
    const apiUrl = 'https://dti-dress-to-impress.fandom.com/api.php';
    const response = await axios.get(apiUrl, {
        params: {
            action: 'parse',
            page: 'Codes',
            prop: 'text',
            format: 'json',
            redirects: 1
        }
    });

    const html = response.data?.parse?.text?.['*'] || '';
    const needle = 'id="Active_Codes"';
    const idx = html.lastIndexOf(needle);
    console.log('idx', idx);
    if (idx === -1) {
        console.log('Active_Codes not found');
        return;
    }
    const snippet = html.substring(idx, idx + 6000);
    const firstRowIdx = snippet.indexOf('<tr>', snippet.indexOf('</tr>') + 5);
    console.log(snippet.substring(0, 1200));
    if (firstRowIdx !== -1) {
        console.log('--- first data row ---');
        console.log(snippet.substring(firstRowIdx, firstRowIdx + 1200));
    }
}

inspectDtiCodes().catch(err => console.error(err.message));
