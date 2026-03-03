#!/bin/bash
# =============================================================================
# validate-links.sh - Markdown Link Validator for CI
# =============================================================================
# Version: 1.0.0
# Created: 2026-02-26
# Purpose: Find and validate internal markdown links in .md files
# Usage: ./validate-links.sh [--verbose] [--fix] [directory]
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="${1:-.}"
VERBOSE="${VERBOSE:-false}"
FIX_MODE="${FIX_MODE:-false}"
EXIT_ON_ERROR="${EXIT_ON_ERROR:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_LINKS=0
VALID_LINKS=0
BROKEN_LINKS=0
SKIPPED_LINKS=0
BROKEN_FILES=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -f|--fix)
            FIX_MODE="true"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS] [DIRECTORY]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose    Show all links (not just broken)"
            echo "  -f, --fix        Remove broken links from files"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Exit codes:"
            echo "  0 - All links valid"
            echo "  1 - Broken links found"
            echo "  2 - Script error"
            exit 0
            ;;
        *)
            BASE_DIR="$1"
            shift
            ;;
    esac
done

# -----------------------------------------------------------------------------
# log functions
# -----------------------------------------------------------------------------
log_info() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_valid() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${GREEN}[OK]${NC} $1"
    fi
}

log_broken() {
    echo -e "${RED}[BROKEN]${NC} $1"
}

log_skip() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${YELLOW}[SKIP]${NC} $1"
    fi
}

# -----------------------------------------------------------------------------
# Check if link is external (http, https, ftp, etc.)
# -----------------------------------------------------------------------------
is_external_link() {
    local link="$1"
    [[ "$link" =~ ^(https?|ftp|ftps|mailto|tel|data): ]]
}

# -----------------------------------------------------------------------------
# Check if link is an anchor only (#section)
# -----------------------------------------------------------------------------
is_anchor_only() {
    local link="$1"
    [[ "$link" =~ ^# ]]
}

# -----------------------------------------------------------------------------
# Resolve relative path to absolute
# -----------------------------------------------------------------------------
resolve_path() {
    local base_file="$1"
    local link="$2"
    local base_dir
    local resolved

    base_dir="$(dirname "$base_file")"

    # Handle anchor links on same file
    if [[ "$link" =~ ^# ]]; then
        echo "$base_file"
        return 0
    fi

    # Handle absolute Windows paths (C:/...)
    if [[ "$link" =~ ^[A-Za-z]: ]]; then
        if [[ -e "$link" ]]; then
            echo "$link"
        else
            echo ""
        fi
        return 0
    fi

    # Resolve the path relative to the file's directory
    # Use readlink -f as fallback for realpath on Windows/MSYS
    resolved="$(cd "$base_dir" 2>/dev/null && (realpath -m "$link" 2>/dev/null || readlink -f "$link" 2>/dev/null || echo ""))"

    if [[ -n "$resolved" ]]; then
        echo "$resolved"
    else
        # Fallback: construct path manually
        resolved="$base_dir/$link"
        # Normalize path
        resolved=$(echo "$resolved" | sed 's#/\./#/#g; s#/[^/]*/\.\./#/#g')
        echo "$resolved"
    fi
}

# -----------------------------------------------------------------------------
# Validate a single link
# -----------------------------------------------------------------------------
validate_link() {
    local file="$1"
    local link="$2"
    local line_num="$3"

    ((TOTAL_LINKS++)) || true

    # Skip external links
    if is_external_link "$link"; then
        ((SKIPPED_LINKS++)) || true
        log_skip "External: $link"
        return 0
    fi

    # Skip anchor-only links (would need markdown parser to validate)
    if is_anchor_only "$link"; then
        ((SKIPPED_LINKS++)) || true
        log_skip "Anchor: $link"
        return 0
    fi

    # Remove anchor from link if present
    local clean_link="${link%%#*}"

    # Skip empty links
    if [[ -z "$clean_link" ]]; then
        ((SKIPPED_LINKS++)) || true
        return 0
    fi

    # Resolve path
    local resolved
    resolved=$(resolve_path "$file" "$clean_link")

    # Check if file/directory exists
    if [[ -e "$resolved" ]]; then
        ((VALID_LINKS++)) || true
        log_valid "$file:$line_num -> $link"
        return 0
    else
        ((BROKEN_LINKS++)) || true
        log_broken "$file:$line_num -> $link (resolved: $resolved)"
        BROKEN_FILES+=("$file:$line_num:$link")
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Extract and validate links from a markdown file
# -----------------------------------------------------------------------------
process_file() {
    local file="$1"
    local line_num=0
    local broken_in_file=0

    log_info "Processing: $file"

    while IFS= read -r line || [[ -n "$line" ]]; do
        ((line_num++)) || true

        # Extract markdown links: [text](link)
        # Using grep -o to find all matches on the line
        local links
        links=$(echo "$line" | grep -oP '\[[^\]]*\]\(\K[^)]+' 2>/dev/null || true)

        if [[ -n "$links" ]]; then
            while IFS= read -r link; do
                # Skip empty matches
                [[ -z "$link" ]] && continue

                # Trim whitespace
                link=$(echo "$link" | xargs)

                if ! validate_link "$file" "$link" "$line_num"; then
                    ((broken_in_file++)) || true
                fi
            done <<< "$links"
        fi
    done < "$file"

    return $broken_in_file
}

# -----------------------------------------------------------------------------
# Fix mode: Remove broken links from files
# -----------------------------------------------------------------------------
fix_broken_links() {
    if [[ "$FIX_MODE" != "true" ]] || [[ ${#BROKEN_FILES[@]} -eq 0 ]]; then
        return
    fi

    echo ""
    echo -e "${YELLOW}Fix mode enabled. Removing broken links...${NC}"

    local files_to_fix=()
    for entry in "${BROKEN_FILES[@]}"; do
        local file="${entry%%:*}"
        if [[ ! " ${files_to_fix[*]} " =~ " ${file} " ]]; then
            files_to_fix+=("$file")
        fi
    done

    for file in "${files_to_fix[@]}"; do
        echo "Fixing: $file"
        # Create backup
        cp "$file" "${file}.bak"

        # Remove lines containing broken links
        # Note: This is a simple approach; more sophisticated handling may be needed
        for entry in "${BROKEN_FILES[@]}"; do
            if [[ "$entry" == "$file":* ]]; then
                local line_num="${entry#*:}"
                line_num="${line_num%%:*}"
                sed -i "${line_num}d" "$file" 2>/dev/null || true
            fi
        done
    done

    echo "Backups saved with .bak extension"
}

# -----------------------------------------------------------------------------
# Print summary report
# -----------------------------------------------------------------------------
print_summary() {
    echo ""
    echo "=========================================="
    echo "           LINK VALIDATION REPORT"
    echo "=========================================="
    echo ""
    echo "Directory scanned: $(realpath "$BASE_DIR" 2>/dev/null || echo "$BASE_DIR")"
    echo ""
    echo "Statistics:"
    echo "  Total links:     $TOTAL_LINKS"
    echo "  Valid links:     $VALID_LINKS"
    echo "  Broken links:    $BROKEN_LINKS"
    echo "  Skipped (ext):   $SKIPPED_LINKS"
    echo ""

    if [[ $BROKEN_LINKS -gt 0 ]]; then
        echo -e "${RED}BROKEN LINKS FOUND:${NC}"
        echo ""
        for entry in "${BROKEN_FILES[@]}"; do
            local file="${entry%%:*}"
            local rest="${entry#*:}"
            local line="${rest%%:*}"
            local link="${rest#*:}"
            echo "  - $file:$line"
            echo "    Target: $link"
            echo ""
        done
        echo "=========================================="
        echo -e "${RED}STATUS: FAILED${NC}"
        echo "=========================================="
        return 1
    else
        echo "=========================================="
        echo -e "${GREEN}STATUS: PASSED${NC}"
        echo "=========================================="
        return 0
    fi
}

# -----------------------------------------------------------------------------
# Main execution
# -----------------------------------------------------------------------------
main() {
    echo ""
    echo "=========================================="
    echo "    Markdown Link Validator v1.0.0"
    echo "=========================================="
    echo ""

    # Find all markdown files
    local md_files
    md_files=$(find "$BASE_DIR" -name "*.md" -type f 2>/dev/null | sort)

    if [[ -z "$md_files" ]]; then
        echo "No markdown files found in $BASE_DIR"
        exit 0
    fi

    local file_count
    file_count=$(echo "$md_files" | wc -l)
    echo "Found $file_count markdown files"
    echo ""

    # Process each file
    while IFS= read -r file; do
        process_file "$file" || true
    done <<< "$md_files"

    # Fix mode
    fix_broken_links

    # Print summary and exit with appropriate code
    print_summary
    local exit_code=$?

    if [[ "$EXIT_ON_ERROR" == "true" ]] && [[ $exit_code -ne 0 ]]; then
        exit 1
    fi

    exit 0
}

# Run main
main
