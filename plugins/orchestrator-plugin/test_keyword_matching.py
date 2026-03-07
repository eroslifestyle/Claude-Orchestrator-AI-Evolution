#!/usr/bin/env python3
"""Test keyword matching functionality."""

import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from mcp_server.model_selector_sync import load_keyword_model_mappings

# Load mappings
mappings_file = Path(__file__).parent / "config" / "keyword-mappings.json"
print("=" * 70)
print("KEYWORD-MAPPINGS.JSON VERIFICATION")
print("=" * 70)

if not mappings_file.exists():
    print(f"ERROR: File not found: {mappings_file}")
    sys.exit(1)

domain_models, domain_keywords = load_keyword_model_mappings(mappings_file)

print(f"\n[OK] Loaded {len(domain_models)} domain models")
print(f"[OK] Loaded {len(domain_keywords)} domain keyword lists")

# Show sample mappings
print("\nSample Domain -> Model Mappings:")
for domain, model in list(domain_models.items())[:5]:
    kw_list = domain_keywords.get(domain, [])
    print(f"  {domain:20} -> {model:8} ({len(kw_list)} keywords)")

print(f"  ... and {len(domain_models) - 5} more")

# Test keyword matching
print("\n" + "=" * 70)
print("KEYWORD MATCHING TEST")
print("=" * 70)

test_requests = [
    ("Fix PyQt5 layout issue", ["gui"], "sonnet"),
    ("Optimize SQL query performance", ["database"], "sonnet"),
    ("Deploy to production with docker", ["devops"], "haiku"),
    ("Design system architecture", ["architecture"], "opus"),
    ("Write unit tests for authentication", ["testing"], "sonnet"),
    ("Update README documentation", ["documentation"], "haiku"),
    ("Review code quality", ["review"], "sonnet"),
    ("Explore codebase structure", ["exploration"], "haiku"),
]

for request, expected_domains, expected_model in test_requests:
    request_lower = request.lower()

    # Find matching domain
    matched_domain = None
    matched_model = None

    for domain, model in domain_models.items():
        keywords = domain_keywords.get(domain, [])
        for keyword in keywords:
            if keyword in request_lower:
                matched_domain = domain
                matched_model = model
                break
        if matched_domain:
            break

    status = "[OK]" if matched_model == expected_model else "[FAIL]"
    print(f"\n{status} Request: '{request}'")
    print(f"   Matched domain: {matched_domain}")
    print(f"   Model: {matched_model} (expected: {expected_model})")
    if matched_domain not in expected_domains and matched_domain:
        print(f"   Note: Matched {matched_domain} instead of {expected_domains}")

print("\n" + "=" * 70)
print("VERIFICATION COMPLETE")
print("=" * 70)
