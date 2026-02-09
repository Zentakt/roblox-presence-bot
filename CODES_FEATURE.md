# 🎁 Roblox Game Codes Feature

## Overview

The `/codes` command allows Discord users to find Roblox game promo codes directly from Fandom wiki pages, even when they misspell the game name.

## How It Works

### Command Usage
```
/codes <game name>
```

**Example:**
```
/codes Tower Defense Simulator
/codes bloxfruit
/codes tycoon plaza
```

### Search Process

1. **Fuzzy Search** - First attempts full-text search on Fandom wiki
2. **Prefix Search Fallback** - If no results, uses prefix search with fuzzy matching:
   - Supports up to 2 typos
   - Handles spelling corrections automatically
   - Finds similar game names
3. **Code Extraction** - Fetches the wiki page and extracts codes
4. **Response** - Returns a formatted Discord embed with active codes

## Features

✅ **Typo Tolerance** - "twoer defence" → finds "Tower Defense"  
✅ **Multiple Format Support** - Handles various wiki page structures  
✅ **Smart Code Detection** - Finds codes in tables, lists, and paragraphs  
✅ **Timestamp** - Shows when codes were last fetched  
✅ **Source Attribution** - Links to the original wiki page  

## Architecture

### Files

- **[src/services/wiki.js](../src/services/wiki.js)** - FandomWikiService class
  - `searchGame(gameName)` - Searches for game pages with fallback
  - `fetchPageContent(pageTitle)` - Gets wiki page HTML
  - `extractCodesFromHTML(html)` - Parses codes from HTML content

- **[src/commands/codes.js](../src/commands/codes.js)** - Discord slash command
  - Takes game name as input
  - Handles errors gracefully
  - Returns formatted Discord embed

### API Endpoints

The implementation uses the Fandom MediaWiki API:

1. **Search API** (Full-text search)
   ```
   https://roblox.fandom.com/api.php?action=query&list=search&srsearch=<game>
   ```

2. **Prefix Search API** (Typo correction)
   ```
   https://roblox.fandom.com/api.php?action=query&list=prefixsearch&pssearch=<game>&psprofile=fuzzy
   ```

3. **Parse API** (Content extraction)
   ```
   https://roblox.fandom.com/api.php?action=parse&page=<title>&prop=text
   ```

## Response Format

### Success Response
```
🎁 [Game Name] - Promo Codes

Found 5 active codes!

💰 Active Codes
`FREEGIFT`
5,000 Coins

`WELCOME20`
20% Discount

❓ How to Redeem
1. Open the game in Roblox
2. Find the codes/promo section
3. Paste a code and claim your reward!
4. Check the wiki for expiry dates

📝 Source
[Game Name - Fandom Wiki](link)
```

### Error Cases

- **No Match Found** - User can try refining the game name
- **No Codes Found** - Game page exists but has no codes section
- **Network Error** - Graceful error message with retry prompt

## Code Extraction Patterns

The service detects codes in multiple formats:

1. **Table Format**
   ```html
   <td>CODENAME</td>
   <td>Description</td>
   ```

2. **List Format**
   ```html
   <li><code>CODENAME</code> - Description</li>
   ```

3. **Paragraph Format**
   ```html
   <p><code>CODENAME</code> - Description</p>
   ```

4. **Bold/Strong Format**
   ```html
   <strong>CODENAME</strong> - Description
   ```

5. **Plain Text Format**
   - Looks for capitalized alphanumeric strings with separators

## Limitations

- ⚠️ Requires game to have a Fandom wiki page
- ⚠️ Codes must be in a "Codes" section or similar heading
- ⚠️ Max 15 codes per embed (Discord limit)
- ⚠️ Code extraction depends on wiki HTML structure
- ⚠️ Updates depend on wiki being up-to-date

## Error Handling

- **Timeout Errors** - Retries with user-friendly message
- **Network Errors** - Graceful fallback messages
- **Parse Failures** - Returns page even if code extraction fails
- **No Results** - Helpful suggestions for refining search

## Future Improvements

- [ ] Add code expiry date detection
- [ ] Implement local/Redis caching for popular games
- [ ] Add admin command to manually update codes
- [ ] Support for multiple wiki sources (GitHub, etc.)
- [ ] Levenshtein distance scoring for search ranking
- [ ] Discord autocomplete for game suggestions

## Testing

To test the service:

```javascript
const FandomWikiService = require('./src/services/wiki');
const wiki = new FandomWikiService();

const game = await wiki.searchGame('tower defense');
const html = await wiki.fetchPageContent(game.title);
const codes = await wiki.extractCodesFromHTML(html);
```

## Dependencies

- `axios` - HTTP requests to Fandom API
- `discord.js` - Discord embeds and slash commands
- `cheerio` - (optional) HTML parsing (can be added for better extraction)

## Rate Limits

- Fandom API has generous rate limits (usually 200 requests/5 minutes)
- Consider adding caching for frequently requested games
- Implement request throttling if needed
