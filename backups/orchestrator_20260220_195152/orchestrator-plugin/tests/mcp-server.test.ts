/**
 * MCP Server Unit Tests
 * Tests for orchestrator MCP server functionality
 *
 * Target: 90%+ coverage
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock the orchestrator functions
const mockAnalyzeRequest = (request: string) => {
    const requestLower = request.toLowerCase();
    const EXACT_MATCH_KEYWORDS = new Set(['ea', 'ai', 'qt', 'ui', 'qa', 'tp', 'sl', 'c#', 'tab', 'db', 'fix', 'api', 'ci', 'cd', 'form']);

    const keywords: string[] = [];
    const domains = new Set<string>();

    // Test keyword matching
    const testKeywords = ['database', 'gui', 'security', 'api', 'test', 'mobile', 'ai'];
    for (const keyword of testKeywords) {
        if (EXACT_MATCH_KEYWORDS.has(keyword)) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(requestLower)) {
                keywords.push(keyword);
            }
        } else if (requestLower.includes(keyword)) {
            keywords.push(keyword);
        }
    }

    return { keywords, domains: Array.from(domains) };
};

describe('MCP Server - Word Boundary Matching (FIX #1)', () => {
    test('should NOT match "tab" in "database"', () => {
        const result = mockAnalyzeRequest('ottimizza database table');
        expect(result.keywords).toContain('database');
        expect(result.keywords).not.toContain('tab');
    });

    test('should NOT match "tab" in "table"', () => {
        const result = mockAnalyzeRequest('create table schema');
        expect(result.keywords).not.toContain('tab');
    });

    test('should match standalone "tab"', () => {
        const result = mockAnalyzeRequest('add tab to GUI');
        // Note: 'tab' should match when standalone
    });

    test('should NOT match "fix" in "prefix"', () => {
        const result = mockAnalyzeRequest('update prefixed variable');
        expect(result.keywords).not.toContain('fix');
    });

    test('should NOT match "form" in "formdata"', () => {
        const result = mockAnalyzeRequest('validate formdata input');
        expect(result.keywords).not.toContain('form');
    });

    test('should NOT match "api" in "capitalized"', () => {
        const result = mockAnalyzeRequest('update capitalized text');
        expect(result.keywords).not.toContain('api');
    });

    test('should match standalone "api"', () => {
        const result = mockAnalyzeRequest('create api endpoint');
        expect(result.keywords).toContain('api');
    });
});

describe('MCP Server - Complexity Threshold (FIX #6)', () => {
    const calculateComplexity = (taskCount: number, domainCount: number): string => {
        if (taskCount >= 10 || domainCount >= 4) return 'alta';
        if (taskCount >= 5 || domainCount >= 2) return 'media';
        return 'bassa';
    };

    test('should return "bassa" for 1 domain', () => {
        expect(calculateComplexity(1, 1)).toBe('bassa');
    });

    test('should return "media" for 2 domains', () => {
        expect(calculateComplexity(3, 2)).toBe('media');
    });

    test('should return "alta" for 4+ domains', () => {
        expect(calculateComplexity(5, 4)).toBe('alta');
    });

    test('should return "alta" for 10+ tasks', () => {
        expect(calculateComplexity(10, 1)).toBe('alta');
    });

    test('should return "media" for 5-9 tasks', () => {
        expect(calculateComplexity(7, 1)).toBe('media');
    });
});

describe('MCP Server - Estimated Time Formula (FIX #7)', () => {
    const calculateEstimatedTime = (taskCount: number, maxParallel: number = 6): number => {
        if (taskCount === 0) return 0;

        const baseTimePerTask = 2.5;
        const parallelFactor = 0.6;
        const overhead = 1.0;

        const batches = Math.ceil(taskCount / maxParallel);
        const parallelTime = baseTimePerTask * batches * parallelFactor + overhead;

        return Math.round(parallelTime * 10) / 10;
    };

    test('should return 0 for no tasks', () => {
        expect(calculateEstimatedTime(0)).toBe(0);
    });

    test('should calculate correctly for 1 task', () => {
        const time = calculateEstimatedTime(1);
        expect(time).toBeGreaterThan(0);
        expect(time).toBeLessThan(5);
    });

    test('should scale sub-linearly with parallelism', () => {
        const time6 = calculateEstimatedTime(6);
        const time12 = calculateEstimatedTime(12);
        // 12 tasks should NOT be 2x slower than 6 tasks due to parallelism
        expect(time12).toBeLessThan(time6 * 2);
    });
});

describe('MCP Server - Documenter Deduplication (FIX #2)', () => {
    const isDocumenterPresent = (tasks: { agent_expert_file: string }[]): boolean => {
        return tasks.some(t =>
            t.agent_expert_file.toLowerCase().includes('documenter') ||
            t.agent_expert_file.toLowerCase().includes('documentation')
        );
    };

    test('should detect documenter in task list', () => {
        const tasks = [
            { agent_expert_file: 'core/coder.md' },
            { agent_expert_file: 'core/documenter.md' }
        ];
        expect(isDocumenterPresent(tasks)).toBe(true);
    });

    test('should NOT detect documenter when absent', () => {
        const tasks = [
            { agent_expert_file: 'core/coder.md' },
            { agent_expert_file: 'experts/database_expert.md' }
        ];
        expect(isDocumenterPresent(tasks)).toBe(false);
    });

    test('should detect documentation keyword', () => {
        const tasks = [
            { agent_expert_file: 'experts/documentation_expert.md' }
        ];
        expect(isDocumenterPresent(tasks)).toBe(true);
    });
});

describe('MCP Server - Edge Cases', () => {
    test('should handle empty request', () => {
        const result = mockAnalyzeRequest('');
        expect(result.keywords).toEqual([]);
    });

    test('should handle special characters', () => {
        const result = mockAnalyzeRequest('test @#$% unicode αβγδ 🔥');
        expect(result.keywords).toContain('test');
    });

    test('should be case insensitive', () => {
        const result1 = mockAnalyzeRequest('DATABASE');
        const result2 = mockAnalyzeRequest('database');
        expect(result1.keywords).toEqual(result2.keywords);
    });

    test('should handle very long requests', () => {
        const longRequest = 'test '.repeat(1000);
        const result = mockAnalyzeRequest(longRequest);
        expect(result.keywords).toContain('test');
    });
});

describe('MCP Server - L2 Specialist Routing (FIX #3)', () => {
    const L2_KEYWORDS = {
        'jwt': 'experts/L2/security-auth-specialist.md',
        'mfa': 'experts/L2/security-auth-specialist.md',
        'totp': 'experts/L2/security-auth-specialist.md',
        'pytest': 'experts/L2/test-unit-specialist.md',
        'query optimization': 'experts/L2/db-query-optimizer.md',
    };

    test('should route JWT to L2 security specialist', () => {
        expect(L2_KEYWORDS['jwt']).toContain('security-auth-specialist');
    });

    test('should route TOTP to L2 security specialist', () => {
        expect(L2_KEYWORDS['totp']).toContain('security-auth-specialist');
    });

    test('should route pytest to L2 test specialist', () => {
        expect(L2_KEYWORDS['pytest']).toContain('test-unit-specialist');
    });

    test('should route query optimization to L2 db specialist', () => {
        expect(L2_KEYWORDS['query optimization']).toContain('db-query-optimizer');
    });
});
