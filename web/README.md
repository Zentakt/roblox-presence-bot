# GitHub Pages Setup for Zentility Web Pages

This folder contains the static website for Zentility with Privacy Policy and Terms of Service.

## Files

- `index.html` - Main landing page (Entry Link for OAuth app)
- `privacy.html` - Privacy Policy page
- `terms.html` - Terms of Service page
- `style.css` - Responsive styling

## How to Deploy to GitHub Pages

### Step 1: Push to GitHub

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit with web pages"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/roblox-presence-bot.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings**
3. Scroll to **Pages** section
4. Under "Source", select **main** branch
5. Select **/web** folder (where these HTML files are)
6. Click **Save**

### Step 3: Wait for Deployment

GitHub will build and deploy your site in a few minutes. Your URLs will be:

- **Entry Link**: `https://YOUR_USERNAME.github.io/roblox-presence-bot/`
- **Privacy Policy**: `https://YOUR_USERNAME.github.io/roblox-presence-bot/privacy.html`
- **Terms of Service**: `https://YOUR_USERNAME.github.io/roblox-presence-bot/terms.html`

### Step 4: Update Your Roblox OAuth App

1. Go to https://create.roblox.com/credentials
2. Edit your OAuth 2.0 application
3. Add these **Authorized Redirect URIs**:
   ```
   http://localhost:3000/oauth/callback
   ```
4. Fill in the required fields:
   - **Redirect URL**: `https://YOUR_USERNAME.github.io/roblox-presence-bot/`
   - **Privacy Policy URL**: `https://YOUR_USERNAME.github.io/roblox-presence-bot/privacy.html`
   - **Terms of Service URL**: `https://YOUR_USERNAME.github.io/roblox-presence-bot/terms.html`
   - **Description**: "Discord bot for monitoring Roblox user presence with official OAuth 2.0 integration"
   - **Entry Link**: `https://YOUR_USERNAME.github.io/roblox-presence-bot/`
   - **Scopes**: Select `openid`, `profile`, `email`

5. Save and submit for review

## Features

✅ Fully responsive design (mobile, tablet, desktop)
✅ Professional appearance
✅ Fast loading times
✅ SEO friendly
✅ WCAG accessibility compliant

## Customization

Feel free to edit the HTML and CSS to match your branding:

- Colors in `style.css` (`:root` variables)
- Content in `index.html`, `privacy.html`, `terms.html`
- Images and icons (current uses emoji)

## Notes

- GitHub Pages takes 5-10 minutes to deploy changes after push
- URLs are case-sensitive
- Keep the `/web` folder structure as-is for proper deployment
