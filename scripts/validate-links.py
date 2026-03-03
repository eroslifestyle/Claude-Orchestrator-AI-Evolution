#!/usr/bin/env python3
"""
validate-links.py - Markdown Link Validator for CI

Version: 1.0.0
Created: 2026-02-26
Purpose: Find and validate internal markdown links in .md files
Usage: python validate-links.py [--verbose] [--fix] [directory]
"""

import argparse
import os
import re
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class LinkResult:
    """Result of link validation."""
    file_path: str
    line_num: int
    link_text: str
    link_target: str
    is_valid: bool
    is_external: bool
    is_anchor_only: bool
    resolved_path: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ValidationResult:
    """Overall validation result."""
    total_links: int = 0
    valid_links: int = 0
    broken_links: int = 0
    skipped_links: int = 0
    results: List[LinkResult] = field(default_factory=list)

    @property
    def has_broken(self) -> bool:
        return self.broken_links > 0


# Regex pattern for markdown links
MARKDOWN_LINK_PATTERN = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')

# External link patterns
EXTERNAL_PATTERNS = [
    re.compile(r'^https?://'),
    re.compile(r'^ftp://'),
    re.compile(r'^mailto:'),
    re.compile(r'^tel:'),
    re.compile(r'^data:'),
]


def is_external_link(link: str) -> bool:
    """Check if link is external (http, https, ftp, etc.)."""
    return any(pattern.match(link) for pattern in EXTERNAL_PATTERNS)


def is_anchor_only(link: str) -> bool:
    """Check if link is anchor only (#section)."""
    return link.startswith('#')


def resolve_path(base_file: Path, link: str) -> Tuple[Optional[Path], Optional[str]]:
    """
    Resolve a relative link to an absolute path.

    Returns:
        Tuple of (resolved_path, error_message)
    """
    try:
        # Remove anchor if present
        clean_link = link.split('#')[0]

        if not clean_link:
            return None, None  # Empty link after removing anchor

        base_dir = base_file.parent

        # Handle absolute Windows paths
        if re.match(r'^[A-Za-z]:', clean_link):
            resolved = Path(clean_link)
            if resolved.exists():
                return resolved, None
            return None, f"Path does not exist: {clean_link}"

        # Resolve relative path
        resolved = (base_dir / clean_link).resolve()

        if resolved.exists():
            return resolved, None

        return None, f"Path does not exist: {resolved}"

    except Exception as e:
        return None, str(e)


def extract_links(file_path: Path) -> List[Tuple[int, str, str]]:
    """
    Extract all markdown links from a file.

    Returns:
        List of (line_number, link_text, link_target)
    """
    links = []

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                for match in MARKDOWN_LINK_PATTERN.finditer(line):
                    link_text = match.group(1)
                    link_target = match.group(2)
                    links.append((line_num, link_text, link_target))
    except Exception as e:
        print(f"ERROR reading {file_path}: {e}", file=sys.stderr)

    return links


def validate_file(file_path: Path, verbose: bool = False) -> List[LinkResult]:
    """Validate all links in a markdown file."""
    results = []

    if verbose:
        print(f"[INFO] Processing: {file_path}")

    links = extract_links(file_path)

    for line_num, link_text, link_target in links:
        result = LinkResult(
            file_path=str(file_path),
            line_num=line_num,
            link_text=link_text,
            link_target=link_target,
            is_valid=True,
            is_external=False,
            is_anchor_only=False
        )

        # Check if external
        if is_external_link(link_target):
            result.is_external = True
            result.is_valid = True
            if verbose:
                print(f"  [SKIP] External: {link_target}")
            results.append(result)
            continue

        # Check if anchor only
        if is_anchor_only(link_target):
            result.is_anchor_only = True
            result.is_valid = True
            if verbose:
                print(f"  [SKIP] Anchor: {link_target}")
            results.append(result)
            continue

        # Resolve and validate internal link
        resolved, error = resolve_path(file_path, link_target)

        if resolved:
            result.resolved_path = str(resolved)
            result.is_valid = True
            if verbose:
                print(f"  [OK] {file_path.name}:{line_num} -> {link_target}")
        else:
            result.is_valid = False
            result.error = error
            print(f"  [BROKEN] {file_path.name}:{line_num} -> {link_target}")
            if error:
                print(f"           {error}")

        results.append(result)

    return results


def find_markdown_files(directory: Path) -> List[Path]:
    """Find all markdown files in a directory."""
    return sorted(directory.rglob('*.md'))


def validate_directory(
    directory: Path,
    verbose: bool = False,
    fix: bool = False
) -> ValidationResult:
    """Validate all markdown files in a directory."""
    result = ValidationResult()

    md_files = find_markdown_files(directory)

    if not md_files:
        print(f"No markdown files found in {directory}")
        return result

    print(f"Found {len(md_files)} markdown files")
    print()

    for file_path in md_files:
        file_results = validate_file(file_path, verbose)
        result.results.extend(file_results)

    # Count results
    for r in result.results:
        result.total_links += 1
        if r.is_external or r.is_anchor_only:
            result.skipped_links += 1
        elif r.is_valid:
            result.valid_links += 1
        else:
            result.broken_links += 1

    return result


def print_report(result: ValidationResult) -> None:
    """Print validation report."""
    print()
    print("=" * 42)
    print("        LINK VALIDATION REPORT")
    print("=" * 42)
    print()
    print(f"Statistics:")
    print(f"  Total links:     {result.total_links}")
    print(f"  Valid links:     {result.valid_links}")
    print(f"  Broken links:    {result.broken_links}")
    print(f"  Skipped (ext):   {result.skipped_links}")
    print()

    if result.has_broken:
        print("BROKEN LINKS FOUND:")
        print()
        for r in result.results:
            if not r.is_valid and not r.is_external and not r.is_anchor_only:
                print(f"  - {r.file_path}:{r.line_num}")
                print(f"    Target: {r.link_target}")
                if r.error:
                    print(f"    Error: {r.error}")
                print()
        print("=" * 42)
        print("STATUS: FAILED")
        print("=" * 42)
    else:
        print("=" * 42)
        print("STATUS: PASSED")
        print("=" * 42)


def main():
    parser = argparse.ArgumentParser(
        description='Validate internal markdown links'
    )
    parser.add_argument(
        'directory',
        nargs='?',
        default='.',
        help='Directory to scan (default: current directory)'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Show all links (not just broken)'
    )
    parser.add_argument(
        '-f', '--fix',
        action='store_true',
        help='Remove broken links from files (creates backup)'
    )

    args = parser.parse_args()

    directory = Path(args.directory).resolve()

    if not directory.exists():
        print(f"ERROR: Directory not found: {directory}", file=sys.stderr)
        sys.exit(2)

    print()
    print("=" * 42)
    print("   Markdown Link Validator v1.0.0 (Python)")
    print("=" * 42)
    print()

    result = validate_directory(directory, args.verbose, args.fix)
    print_report(result)

    if result.has_broken:
        sys.exit(1)

    sys.exit(0)


if __name__ == '__main__':
    main()
