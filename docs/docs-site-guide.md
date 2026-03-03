# Documentation Site Generator Guide

> Guide for generating and deploying the Orchestrator documentation site.

---

## Overview

The documentation site generator creates a static HTML site from the Orchestrator markdown documentation files. It supports both Jekyll-based builds (for GitHub Pages) and simple markdown conversion.

---

## Quick Start

### Generate the Site

```bash
# Navigate to docs-site directory
cd ~/.claude/docs-site

# Run the generator
./generate-site.sh
```

### Preview Locally

```bash
# Navigate to output directory
cd ~/.claude/docs-site/_site

# Start local server
python -m http.server 8000

# Open in browser
# http://localhost:8000
```

---

## Directory Structure

```
docs-site/
├── _config.yml           # Jekyll configuration
├── _layouts/
│   └── default.html      # Main layout template
├── assets/
│   └── style.css         # Site styles
├── docs/                 # Copied documentation (generated)
├── _site/                # Generated HTML output (generated)
├── _data/                # Navigation and data files (generated)
├── index.md              # Homepage
├── generate-site.sh      # Generation script
└── README.md             # This file
```

---

## Configuration

### Jekyll Configuration (_config.yml)

Key settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `title` | Site title | Orchestrator V12.0 Documentation |
| `baseurl` | Subpath for deployment | /orchestrator-docs |
| `markdown` | Markdown processor | kramdown |
| `highlighter` | Syntax highlighter | rouge |

### Adding Pages

1. Create a new `.md` file in the `docs/` directory
2. Add frontmatter at the top:

```markdown
---
layout: default
title: Page Title
description: Page description for SEO
---

# Page Content

Your content here...
```

3. Re-run `./generate-site.sh`

---

## Navigation

Navigation is defined in `_config.yml`:

```yaml
navigation:
  - title: Home
    url: /
  - title: Architecture
    url: /architecture
  - title: Setup Guide
    url: /setup-guide
```

To add new navigation items, edit `_config.yml` and rebuild.

---

## Deployment

### GitHub Pages

1. Build the site:
   ```bash
   ./generate-site.sh
   ```

2. Create a `gh-pages` branch:
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   ```

3. Copy the generated site:
   ```bash
   cp -r _site/* .
   ```

4. Commit and push:
   ```bash
   git add .
   git commit -m "Deploy documentation site"
   git push origin gh-pages
   ```

5. Enable GitHub Pages in repository settings:
   - Source: `gh-pages` branch
   - Folder: `/ (root)`

### Netlify

1. Connect your repository to Netlify
2. Set build command: `./generate-site.sh`
3. Set publish directory: `_site`

### Vercel

1. Import your repository
2. Set build command: `./generate-site.sh`
3. Set output directory: `_site`

---

## Customization

### Styling

Edit `assets/style.css` to customize:

- Colors: Modify CSS variables in `:root`
- Fonts: Change `--font-mono` for code
- Layout: Adjust grid and spacing values

### Layout

Edit `_layouts/default.html` to modify:

- Header structure
- Sidebar content
- Footer content
- JavaScript functionality

### Adding Features

#### Search

The generator creates a `search-index.json` file. To add search:

1. Include a search library (e.g., Lunr.js, Algolia)
2. Load `search-index.json`
3. Implement search UI

#### Analytics

Add to `_layouts/default.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

---

## Troubleshooting

### Jekyll Not Found

If you see "Jekyll not found":

```bash
# Install Ruby (if not installed)
# Windows: https://rubyinstaller.org/
# Mac: brew install ruby
# Linux: sudo apt install ruby-full

# Install Jekyll and Bundler
gem install jekyll bundler

# Re-run generator
./generate-site.sh
```

### CSS Not Loading

1. Check `baseurl` in `_config.yml` matches your deployment path
2. Ensure `assets/` directory is copied to `_site/`
3. Clear browser cache

### Missing Pages

1. Verify `.md` files have proper frontmatter
2. Check for syntax errors in frontmatter
3. Run `./generate-site.sh` again

### Windows Path Issues

On Windows with Git Bash:

```bash
# Use forward slashes
cd /c/Users/LeoDg/.claude/docs-site

# Or use MSYS2 path
cd ~/.claude/docs-site
```

---

## Maintenance

### Updating Documentation

1. Edit source files in `~/.claude/orchestrator/docs/`
2. Run `./generate-site.sh`
3. Commit and deploy changes

### Version Updates

When updating Orchestrator version:

1. Update `version` in `_config.yml`
2. Update `index.md` with new version number
3. Update `assets/style.css` version badge if needed
4. Rebuild and redeploy

---

## Generator Script Reference

### Commands

```bash
# Standard build
./generate-site.sh

# Verbose output (debug)
bash -x ./generate-site.sh

# Clean only
rm -rf _site docs _data
```

### Output Files

| File | Purpose |
|------|---------|
| `_site/` | Generated HTML site |
| `_site/sitemap.xml` | SEO sitemap |
| `_site/search-index.json` | Search data |
| `docs/` | Processed markdown files |
| `_data/navigation.json` | Navigation structure |

---

## Support

For issues or questions:

1. Check this guide first
2. Review [Troubleshooting](troubleshooting.html) documentation
3. Check GitHub issues for known problems
