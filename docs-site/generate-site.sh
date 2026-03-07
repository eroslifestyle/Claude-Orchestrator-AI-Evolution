#!/bin/bash
#
# Orchestrator Documentation Site Generator
# Version: 1.0.0
#
# This script generates a static documentation site from markdown files.
# It copies documentation, generates navigation, and applies layouts.
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/../orchestrator/docs"
OUTPUT_DIR="${SCRIPT_DIR}/_site"
DOCS_DIR="${SCRIPT_DIR}/docs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Print banner
print_banner() {
    echo "=================================================="
    echo "   Orchestrator Documentation Site Generator"
    echo "   Version 1.0.0"
    echo "=================================================="
    echo ""
}

# Clean output directory
clean_output() {
    log_info "Cleaning output directory..."
    rm -rf "${OUTPUT_DIR}"
    rm -rf "${DOCS_DIR}"
    mkdir -p "${OUTPUT_DIR}"
    mkdir -p "${DOCS_DIR}"
    log_success "Output directory cleaned"
}

# Copy source documentation
copy_docs() {
    log_info "Copying documentation files..."

    if [ -d "${SOURCE_DIR}" ]; then
        cp -r "${SOURCE_DIR}"/* "${DOCS_DIR}/"
        log_success "Documentation copied to ${DOCS_DIR}"
    else
        log_error "Source directory not found: ${SOURCE_DIR}"
        exit 1
    fi
}

# Generate navigation data
generate_navigation() {
    log_info "Generating navigation..."

    NAV_FILE="${SCRIPT_DIR}/_data/navigation.json"
    mkdir -p "${SCRIPT_DIR}/_data"

    cat > "${NAV_FILE}" << 'EOF'
{
  "main": [
    {"title": "Home", "url": "/"},
    {"title": "Architecture", "url": "/architecture"},
    {"title": "Setup Guide", "url": "/setup-guide"},
    {"title": "Routing Table", "url": "/routing-table"},
    {"title": "Skills Reference", "url": "/skills-reference"},
    {"title": "MCP Integration", "url": "/mcp-integration"},
    {"title": "Troubleshooting", "url": "/troubleshooting"}
  ],
  "sidebar": {
    "quick_start": [
      {"title": "Architecture", "url": "/architecture"},
      {"title": "Getting Started", "url": "/setup-guide"},
      {"title": "API Reference", "url": "/routing-table"}
    ],
    "components": [
      {"title": "Skills (26)", "url": "/skills-reference"},
      {"title": "Agents (43)", "url": "/routing-table"},
      {"title": "MCP Servers", "url": "/mcp-integration"}
    ],
    "guides": [
      {"title": "Memory System", "url": "/memory-integration"},
      {"title": "Error Recovery", "url": "/error-recovery"},
      {"title": "Troubleshooting", "url": "/troubleshooting"}
    ]
  }
}
EOF

    log_success "Navigation generated"
}

# Process markdown files (add frontmatter if missing)
process_markdown() {
    log_info "Processing markdown files..."

    for file in "${DOCS_DIR}"/*.md; do
        if [ -f "$file" ]; then
            filename=$(basename "$file" .md)

            # Check if frontmatter exists
            if ! head -1 "$file" | grep -q "^---"; then
                # Create temp file with frontmatter
                tmp_file=$(mktemp)

                title=$(echo "$filename" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

                cat > "${tmp_file}" << EOF
---
layout: default
title: ${title}
---

EOF
                cat "$file" >> "${tmp_file}"
                mv "${tmp_file}" "$file"
            fi
        fi
    done

    log_success "Markdown files processed"
}

# Generate sitemap
generate_sitemap() {
    log_info "Generating sitemap..."

    SITEMAP="${OUTPUT_DIR}/sitemap.xml"
    BASE_URL="https://docs.example.com"

    cat > "${SITEMAP}" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
EOF

    # Add index
    echo "  <url><loc>${BASE_URL}/</loc></url>" >> "${SITEMAP}"

    # Add all docs
    for file in "${DOCS_DIR}"/*.md; do
        if [ -f "$file" ]; then
            filename=$(basename "$file" .md)
            echo "  <url><loc>${BASE_URL}/${filename}.html</loc></url>" >> "${SITEMAP}"
        fi
    done

    echo "</urlset>" >> "${SITEMAP}"

    log_success "Sitemap generated"
}

# Generate search index
generate_search_index() {
    log_info "Generating search index..."

    SEARCH_INDEX="${OUTPUT_DIR}/search-index.json"

    echo "[" > "${SEARCH_INDEX}"
    first=true

    for file in "${DOCS_DIR}"/*.md; do
        if [ -f "$file" ]; then
            filename=$(basename "$file" .md)
            title=$(echo "$filename" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

            if [ "$first" = true ]; then
                first=false
            else
                echo "," >> "${SEARCH_INDEX}"
            fi

            # Extract first paragraph as snippet
            snippet=$(grep -v "^#" "$file" | grep -v "^$" | grep -v "^---" | head -1 | cut -c1-150)

            cat >> "${SEARCH_INDEX}" << EOF
  {
    "title": "${title}",
    "url": "/${filename}.html",
    "snippet": "${snippet}"
  }
EOF
        fi
    done

    echo "]" >> "${SEARCH_INDEX}"

    log_success "Search index generated"
}

# Copy assets
copy_assets() {
    log_info "Copying assets..."

    mkdir -p "${OUTPUT_DIR}/assets"
    cp -r "${SCRIPT_DIR}/assets/"* "${OUTPUT_DIR}/assets/" 2>/dev/null || true

    log_success "Assets copied"
}

# Build with Jekyll (if available)
build_jekyll() {
    if command -v jekyll &> /dev/null; then
        log_info "Building with Jekyll..."
        cd "${SCRIPT_DIR}"
        jekyll build --destination "${OUTPUT_DIR}"
        log_success "Jekyll build complete"
    else
        log_warning "Jekyll not found. Install with: gem install jekyll bundler"
        log_info "Using simple markdown conversion..."

        # Simple fallback: just copy processed docs
        cp -r "${DOCS_DIR}"/* "${OUTPUT_DIR}/"
        copy_assets
        generate_sitemap
        generate_search_index

        log_success "Simple build complete (no Jekyll)"
    fi
}

# Print summary
print_summary() {
    echo ""
    echo "=================================================="
    log_success "Documentation site generated!"
    echo "=================================================="
    echo ""
    echo "Output directory: ${OUTPUT_DIR}"
    echo ""
    echo "To preview locally:"
    echo "  cd ${OUTPUT_DIR}"
    echo "  python -m http.server 8000"
    echo ""
    echo "Then open: http://localhost:8000"
    echo ""
    echo "To deploy to GitHub Pages:"
    echo "  1. Push contents of ${OUTPUT_DIR} to gh-pages branch"
    echo "  2. Enable GitHub Pages in repository settings"
    echo ""
}

# Main execution
main() {
    print_banner
    clean_output
    copy_docs
    generate_navigation
    process_markdown
    build_jekyll
    print_summary
}

# Run main
main "$@"
