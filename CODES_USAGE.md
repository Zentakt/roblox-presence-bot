# Using the `/codes` Command

## Quick Start

Type this in any Discord channel where the bot can see:
```
/codes [game name]
```

## Examples

### Exact Name
```
/codes Tower Defense Simulator
```
- Returns codes for Tower Defense Simulator

### Search by Part of Name
```
/codes bloxfruit
```
- Finds "Blox Fruits" even though case doesn't match

### With Typos
```
/codes towerdefense similator
```
- Will still find "Tower Defense Simulator" (fuzzy matching!)

### Short Names
```
/codes tycoon
```
- Returns codes for various tycoon games (returns closest match)

## What You'll Get

When the command succeeds, you'll see an embed with:

1. **Game Name** - The exact wiki page matched
2. **Number of Codes** - How many active codes were found
3. **Code List** - All codes with descriptions
4. **How to Redeem** - Instructions for using codes
5. **Wiki Link** - Direct link to the source page

## Features

✅ **Typo Tolerant** - Made a spelling mistake? No problem!  
✅ **Fuzzy Matching** - Finds games even with partial names  
✅ **Real-time Data** - Always fetches current info from the wiki  
✅ **Multiple Formats** - Works with various code layouts  

## Error Messages

### "No Matches Found"
The bot couldn't find a wiki page for that game name.

**Solutions:**
- Check the spelling of the game name
- Try searching for the official game name from Roblox
- The game might not have a Fandom wiki page yet

### "No Codes Found"
Found the game page but no codes section was found.

**Reasons:**
- Game might not have redeem codes
- Wiki page might need updating
- Codes section might be titled differently

### "Network Error"
Request timed out or failed.

**Solutions:**
- Try again in a few seconds
- Check your internet connection
- The wiki might be temporarily down

## Pro Tips

💡 **For Maximum Match Rate:**
- Use the official Roblox game name
- Spell it as close as possible (typos are okay!)
- Include the game studio name if ambiguous

💡 **For Better Results:**
- Use the full game name rather than abbreviations
- Check the Fandom wiki directly if codes are empty
- Wiki pages need to have a "Codes" section or similar

💡 **Common Game Codes Requests:**
```
/codes Blox Fruits
/codes One Piece Legendary
/codes Anime Fighting Simulator
/codes Soldier Simulator
/codes Anime Story
```

## API Power

Behind the scenes, the `/codes` command uses:
- **Fandom MediaWiki API** for page searching and content
- **Fuzzy matching** to find games even with typos
- **Smart HTML parsing** to extract codes from any format

## Limitations

- Commands might take 5-10 seconds (wiki is being searched)
- Maximum 15 codes displayed per embed (Discord limit)
- Requires game to have Fandom wiki page
- Codes depend on wiki being up-to-date

## Feedback?

If codes aren't showing up for a game:
1. Check if the [Fandom wiki](https://roblox.fandom.com) has the page
2. Verify the page has a "Codes" section
3. Try searching for the game directly on the wiki
4. Let the bot maintainer know if the wiki structure is different

---

**Made with ❤️ by the Roblox Presence Bot team**
