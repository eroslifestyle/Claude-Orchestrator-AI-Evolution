---
name: prompt-engineering-patterns
description: Master advanced prompt engineering techniques to maximize LLM performance, reliability, and controllability. Use for pre-processing user requests, expanding vague prompts, and optimizing for orchestrator execution.
disable-model-invocation: false
user-invocable: true
argument-hint: "[original request]"
---

# Prompt Engineering Patterns V2.0

> **Purpose:** Pre-process and optimize user requests before orchestrator execution.
> **Trigger:** Vague, ambiguous, or incomplete requests that need expansion.

---

## CONTEXT-FIRST PRINCIPLE

**CRITICAL:** Always structure expanded requests with context BEFORE the specific query.

### Why Context First?
1. LLMs process information sequentially - context primes the model
2. Reduces hallucinations by establishing ground truth first
3. Improves relevance by setting domain boundaries

### Context-First Template

```markdown
## CONTEXT (Establish Ground Truth)
[Background information, current state, constraints, why this matters]

## GOAL (What Success Looks Like)
[Specific outcome, measurable criteria]

## CONSTRAINTS (Boundaries)
[What must be preserved, limitations, requirements]

## REQUEST (Specific Action)
[The actual task to perform]
```

### WRONG vs RIGHT

**WRONG (Query First):**
```markdown
Fix the authentication bug. We're using JWT tokens with 24h expiry
and the issue is users are getting logged out after 5 minutes.
```

**RIGHT (Context First):**
```markdown
## Context
We use JWT authentication with 24-hour token expiry. Sessions are
stored in Redis with user ID mapping. Recent logs show users being
logged out after approximately 5 minutes of activity.

## Goal
Users should remain logged in for the full 24-hour token duration.

## Constraints
- Cannot change token expiry time (security policy)
- Must maintain Redis session storage
- No breaking changes to existing API

## Request
Investigate why sessions expire early and implement a fix that
preserves the 24-hour session duration.
```

---

## WHEN TO USE THIS SKILL

- Designing complex prompts for production LLM applications
- Optimizing prompt performance and consistency
- Implementing structured reasoning patterns (chain-of-thought, tree-of-thought)
- Building few-shot learning systems with dynamic example selection
- Creating reusable prompt templates with variable interpolation
- Debugging and refining prompts that produce inconsistent outputs
- Implementing system prompts for specialized AI assistants
- Using structured outputs (JSON mode) for reliable parsing
- **Pre-processing vague user requests for orchestrator**

---

## PRE-PROCESSING MODE

When invoked by the orchestrator for request optimization:

### STEP 1: ANALYZE REQUEST COMPLEXITY

| Criteria | Simple (Skip) | Complex (Process) |
|----------|---------------|-------------------|
| Word count | > 15 words | < 10 words |
| Specificity | Has file paths, technical details | Vague terms only |
| Ambiguity | Clear intent | "fix", "improve", "optimize" |
| Scope | Single task | Multiple tasks ("and", "also") |

### STEP 2: IDENTIFY TASK TYPE

```markdown
| Type | Keywords | Routing |
|------|----------|---------|
| BUG_FIX | fix, error, bug, broken, crash | Coder → Tester |
| FEATURE | add, create, implement, new | Architect → Coder |
| REFACTOR | refactor, clean, restructure | Languages Refactor L2 |
| ANALYSIS | analyze, review, check, audit | Analyzer |
| DEBUG | debug, investigate, why | Tester Expert |
| TEST | test, coverage, pytest | Test Unit L2 |
| SECURITY | security, vulnerability, auth | Security Expert |
| PERFORMANCE | optimize, faster, slow | Architect Expert |
| INTEGRATION | integrate, connect, API | Integration Expert |
```

### STEP 3: EXPAND VAGUE REQUESTS

```markdown
| Vague Term | Expansion |
|------------|-----------|
| "fix" | Identify root cause → Implement fix → Add tests → Verify |
| "improve" | Analyze current → Identify improvements → Prioritize → Implement |
| "optimize" | Profile → Find bottleneck → Optimize → Benchmark |
| "make better" | Define metrics → Identify issues → Implement → Measure |
| "clean up" | Identify smells → Apply clean code → Document |
```

### STEP 4: OUTPUT OPTIMIZED REQUEST (XML STRUCTURE)

Output the optimized request using XML tags for clear structure:

```xml
<optimized_request>
  <original>
    [Original user request verbatim]
  </original>

  <task_type>
    [BUG_FIX | FEATURE | REFACTOR | ANALYSIS | DEBUG | TEST | SECURITY | PERFORMANCE | INTEGRATION | MULTI-TASK]
  </task_type>

  <context>
    [Why this task matters - business context, user impact, technical background]
  </context>

  <expanded_request>
    [Detailed, specific request with all necessary information]

    Include:
    - What needs to be done (specific actions)
    - Constraints and requirements
    - Expected behavior changes
  </expanded_request>

  <approach>
    <step_1>[First step with specific action]</step_1>
    <step_2>[Second step with specific action]</step_2>
    <step_3>[Third step if needed]</step_3>
  </approach>

  <files_likely>
    <file path="[file path 1]" reason="[why this file]" />
    <file path="[file path 2]" reason="[why this file]" />
  </files_likely>

  <success_criteria>
    <criterion>[Specific measurable criterion 1]</criterion>
    <criterion>[Specific measurable criterion 2]</criterion>
  </success_criteria>

  <anti_patterns>
    [What NOT to do - common mistakes to avoid]
  </anti_patterns>
</optimized_request>
```

---

## FEW-SHOT EXAMPLES

> **CRITICAL:** Examples are the most reliable method to guide output. Include 3-5 examples per task type.

### BUG_FIX Examples

**Example 1: Vague Bug Report**
```xml
<optimized_request>
  <original>fix the login</original>
  <task_type>BUG_FIX</task_type>
  <context>Login functionality reported as broken but no specific details provided.</context>
  <expanded_request>
    Debug and fix login:
    1. Identify specific symptoms (error message, unexpected behavior)
    2. Check authentication flow (credentials -> validation -> session)
    3. Implement minimal fix
    4. Add regression test
  </expanded_request>
  <approach>
    <step_1>Ask user for specific symptoms and error messages</step_1>
    <step_2>Read auth files to understand current implementation</step_2>
    <step_3>Identify and fix root cause</step_3>
    <step_4>Verify fix and add test</step_4>
  </approach>
  <success_criteria>
    <criterion>Login works for valid credentials</criterion>
    <criterion>Appropriate error for invalid credentials</criterion>
  </success_criteria>
</optimized_request>
```

**Example 2: Error with Stack Trace**
```xml
<optimized_request>
  <original>Fix TypeError in cart checkout - Cannot read property 'price' of undefined</original>
  <task_type>BUG_FIX</task_type>
  <context>TypeError during checkout when accessing price property on undefined object.</context>
  <expanded_request>
    Fix TypeError by adding null check for price property access.
    Location: cart/checkout.ts line 42 based on stack trace.
  </expanded_request>
  <files_likely>
    <file path="cart/checkout.ts" reason="Error location from stack trace" />
    <file path="cart/types.ts" reason="Type definitions for cart items" />
  </files_likely>
  <success_criteria>
    <criterion>No TypeError on checkout</criterion>
    <criterion>Handles missing price gracefully</criterion>
  </success_criteria>
</optimized_request>
```

### FEATURE Examples

**Example 1: Vague Feature Request**
```xml
<optimized_request>
  <original>add dark mode</original>
  <task_type>FEATURE</task_type>
  <context>Implement dark mode theme support for better user experience in low-light conditions.</context>
  <expanded_request>
    Add dark mode:
    1. Create CSS variables for dark theme
    2. Add theme toggle component
    3. Persist preference in localStorage
    4. Apply theme to all pages
  </expanded_request>
  <files_likely>
    <file path="styles/theme.css" reason="Theme variables" />
    <file path="components/ThemeToggle.tsx" reason="Toggle component" />
    <file path="context/ThemeContext.tsx" reason="Theme state management" />
  </files_likely>
  <success_criteria>
    <criterion>Toggle works correctly</criterion>
    <criterion>Preference persisted across sessions</criterion>
    <criterion>All pages support dark mode</criterion>
  </success_criteria>
  <anti_patterns>
    - Do NOT redesign entire UI
    - Do NOT add unrelated features
    - Focus ONLY on theme switching
  </anti_patterns>
</optimized_request>
```

### REFACTOR Examples

**Example 1: Code Quality Refactor**
```xml
<optimized_request>
  <original>clean up auth module</original>
  <task_type>REFACTOR</task_type>
  <context>Auth module needs clean code improvements for better maintainability.</context>
  <expanded_request>
    Refactor auth module:
    1. Extract duplicated logic into helper functions
    2. Improve variable and function naming
    3. Split large functions (>30 lines)
    4. Remove dead code
    Keep same functionality - no behavior changes.
  </expanded_request>
  <files_likely>
    <file path="auth/*.ts" reason="Auth module files" />
  </files_likely>
  <success_criteria>
    <criterion>All tests still pass</criterion>
    <criterion>Code coverage maintained or improved</criterion>
    <criterion>No functional changes to external API</criterion>
    <criterion>Each function < 30 lines</criterion>
  </success_criteria>
  <anti_patterns>
    - Do NOT change behavior
    - Do NOT add new features
    - Do NOT modify public API
  </anti_patterns>
</optimized_request>
```

### MULTI-TASK Examples

**Example 1: Multiple Vague Tasks**
```xml
<optimized_request>
  <original>fix bugs and improve performance</original>
  <task_type>MULTI-TASK [BUG_FIX, PERFORMANCE]</task_type>
  <context>Multiple improvements needed but specific bugs and performance issues not identified.</context>
  <expanded_request>
    Two-phase approach:
    Phase 1: Identify and fix bugs (critical bugs first)
    Phase 2: Profile and optimize performance (after bugs fixed for stable baseline)

    Need clarification:
    - Which specific bugs?
    - What performance metrics to improve?
    - Any specific areas of concern?
  </expanded_request>
  <approach>
    <step_1>Ask user for specific bug reports and performance concerns</step_1>
    <step_2>Fix identified bugs first</step_2>
    <step_3>Profile application to find bottlenecks</step_3>
    <step_4>Optimize identified bottlenecks</step_4>
  </approach>
  <success_criteria>
    <criterion>Reported bugs fixed</criterion>
    <criterion>Performance improved by measurable metrics</criterion>
  </success_criteria>
</optimized_request>
```

---

## CORE CAPABILITIES

### 1. Few-Shot Learning

- Example selection strategies (semantic similarity, diversity sampling)
- Balancing example count with context window constraints
- Constructing effective demonstrations with input-output pairs
- Dynamic example retrieval from knowledge bases

### 2. Chain-of-Thought Prompting

- Step-by-step reasoning elicitation
- Zero-shot CoT with "Let's think step by step"
- Few-shot CoT with reasoning traces
- Self-consistency techniques (sampling multiple reasoning paths)

### 3. Structured Outputs

- JSON mode for reliable parsing
- Pydantic schema enforcement
- Type-safe response handling
- Error handling for malformed outputs

### 4. Prompt Optimization

- Iterative refinement workflows
- A/B testing prompt variations
- Measuring prompt performance metrics
- Reducing token usage while maintaining quality

### 5. Template Systems

- Variable interpolation and formatting
- Conditional prompt sections
- Multi-turn conversation templates
- Role-based prompt composition

### 6. System Prompt Design

- Setting model behavior and constraints
- Defining output formats and structure
- Establishing role and expertise
- Safety guidelines and content policies

---

## KEY PATTERNS

### Pattern 1: Structured Output with Pydantic

```python
from anthropic import Anthropic
from pydantic import BaseModel, Field
from typing import Literal
import json

class SentimentAnalysis(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"]
    confidence: float = Field(ge=0, le=1)
    key_phrases: list[str]
    reasoning: str

async def analyze_sentiment(text: str) -> SentimentAnalysis:
    """Analyze sentiment with structured output."""
    client = Anthropic()

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""Analyze the sentiment of this text.

Text: {text}

Respond with JSON matching this schema:
{{
    "sentiment": "positive" | "negative" | "neutral",
    "confidence": 0.0-1.0,
    "key_phrases": ["phrase1", "phrase2"],
    "reasoning": "brief explanation"
}}"""
        }]
    )

    return SentimentAnalysis(**json.loads(message.content[0].text))
```

### Pattern 2: Chain-of-Thought with Self-Verification

```markdown
Solve this problem step by step.

Problem: {problem}

Instructions:
1. Break down the problem into clear steps
2. Work through each step showing your reasoning
3. State your final answer
4. Verify your answer by checking it against the original problem

Format your response as:
## Steps
[Your step-by-step reasoning]

## Answer
[Your final answer]

## Verification
[Check that your answer is correct]
```

### Pattern 3: Few-Shot with Dynamic Example Selection

```python
from langchain_core.example_selectors import SemanticSimilarityExampleSelector

# Create example selector with semantic similarity
example_selector = SemanticSimilarityExampleSelector.from_examples(
    examples=[
        {"input": "How do I reset my password?", "output": "Go to Settings > Security > Reset Password"},
        {"input": "Where can I see my order history?", "output": "Navigate to Account > Orders"},
        {"input": "How do I contact support?", "output": "Click Help > Contact Us or email support@example.com"},
    ],
    embeddings=VoyageAIEmbeddings(model="voyage-3-large"),
    vectorstore_cls=Chroma,
    k=2  # Select 2 most similar examples
)
```

### Pattern 4: Progressive Disclosure

```python
PROMPT_LEVELS = {
    # Level 1: Direct instruction
    "simple": "Summarize this article: {text}",

    # Level 2: Add constraints
    "constrained": """Summarize this article in 3 bullet points, focusing on:
- Key findings
- Main conclusions
- Practical implications

Article: {text}""",

    # Level 3: Add reasoning
    "reasoning": """Read this article carefully.
1. First, identify the main topic and thesis
2. Then, extract the key supporting points
3. Finally, summarize in 3 bullet points

Article: {text}

Summary:""",

    # Level 4: Add examples (few-shot)
    "few_shot": """Read articles and provide concise summaries.

Example:
Article: "New research shows that regular exercise can reduce anxiety by up to 40%..."
Summary:
• Regular exercise reduces anxiety by up to 40%
• 30 minutes of moderate activity 3x/week is sufficient
• Benefits appear within 2 weeks of starting

Now summarize this article:
Article: {text}

Summary:"""
}
```

### Pattern 5: Error Recovery and Fallback

```python
class ResponseWithConfidence(BaseModel):
    answer: str
    confidence: float
    sources: list[str]
    alternative_interpretations: list[str] = []

ERROR_RECOVERY_PROMPT = """
Answer the question based on the context provided.

Context: {context}
Question: {question}

Instructions:
1. If you can answer confidently (>0.8), provide a direct answer
2. If you're somewhat confident (0.5-0.8), provide your best answer with caveats
3. If you're uncertain (<0.5), explain what information is missing
4. Always provide alternative interpretations if the question is ambiguous

Respond in JSON:
{{
    "answer": "your answer or 'I cannot determine this from the context'",
    "confidence": 0.0-1.0,
    "sources": ["relevant context excerpts"],
    "alternative_interpretations": ["if question is ambiguous"]
}}
"""
```

### Pattern 6: Role-Based System Prompts

```markdown
SYSTEM_PROMPTS = {
    "analyst": """You are a senior data analyst with expertise in SQL, Python, and business intelligence.

Your responsibilities:
- Write efficient, well-documented queries
- Explain your analysis methodology
- Highlight key insights and recommendations
- Flag any data quality concerns

Communication style:
- Be precise and technical when discussing methodology
- Translate technical findings into business impact
- Use clear visualizations when helpful""",

    "code_reviewer": """You are a senior software engineer conducting code reviews.

Review criteria:
- Correctness: Does the code work as intended?
- Security: Are there any vulnerabilities?
- Performance: Are there efficiency concerns?
- Maintainability: Is the code readable and well-structured?
- Best practices: Does it follow language idioms?

Output format:
1. Summary assessment (approve/request changes)
2. Critical issues (must fix)
3. Suggestions (nice to have)
4. Positive feedback (what's done well)"""
}
```

---

## TOKEN EFFICIENCY

### Before vs After

```markdown
# ❌ INEFFICIENTE (150+ token)
"I would like you to please take the following text and provide me with a comprehensive
summary of the main points. The summary should capture the key ideas and important details
while being concise and easy to understand."

# ✅ EFFICIENTE (30 token)
"Summarize the key points concisely:

{text}

Summary:"
```

### Token Reduction Techniques

```markdown
# 1. ABBREVIAZIONI CONSISTENTI
- "function" → "fn"
- "return" → "ret"
- "parameter" → "param"
- "configuration" → "config"

# 2. RIMUOVI RIDONDANZE
❌ "I want you to help me with..."
✅ [Direct instruction]

❌ "Please make sure to..."
✅ [Constraint in rules]

# 3. USA RIFERIMENTI
❌ Ripetere tutto il codice
✅ "In the function above, line 15..."

# 4. STRUTTURA GERARCHICA
❌ Paragrafi lunghi
✅ Bullet points, numeri, headers
```

---

## ANTI-PATTERN DA EVITARE

```markdown
# ❌ VAGO
"Make this code better"

# ✅ SPECIFICO
"Refactor for: 1) readability 2) performance. Keep same functionality."

# ❌ TROPPO CONTEXT
[Dump di 10000 righe di codice]
"Find the bug"

# ✅ CONTEXT MIRATO
"Bug in authentication. Relevant code:
```
[Solo le 50 righe rilevanti]
```
Error: [Exact error message]"

# ❌ NO OUTPUT FORMAT
"Extract the data"

# ✅ OUTPUT FORMAT ESPLICITO
"Extract as JSON: {name: str, date: ISO8601, amount: float}"
```

---

## BEST PRACTICES

1. **Be Specific**: Vague prompts produce inconsistent results
2. **Show, Don't Tell**: Examples are more effective than descriptions
3. **Use Structured Outputs**: Enforce schemas with Pydantic for reliability
4. **Test Extensively**: Evaluate on diverse, representative inputs
5. **Iterate Rapidly**: Small changes can have large impacts
6. **Monitor Performance**: Track metrics in production
7. **Version Control**: Treat prompts as code with proper versioning
8. **Document Intent**: Explain why prompts are structured as they are

---

## COMMON PITFALLS

- **Over-engineering**: Starting with complex prompts before trying simple ones
- **Example pollution**: Using examples that don't match the target task
- **Context overflow**: Exceeding token limits with excessive examples
- **Ambiguous instructions**: Leaving room for multiple interpretations
- **Ignoring edge cases**: Not testing on unusual or boundary inputs
- **No error handling**: Assuming outputs will always be well-formed

---

## SUCCESS METRICS

Track these KPIs for your prompts:

- **Accuracy**: Correctness of outputs
- **Consistency**: Reproducibility across similar inputs
- **Latency**: Response time (P50, P95, P99)
- **Token Usage**: Average tokens per request
- **Success Rate**: Percentage of valid, parseable outputs
- **User Satisfaction**: Ratings and feedback

---

## INTEGRATION WITH ORCHESTRATOR

The orchestrator invokes this skill via:
```
Skill(tool, skill="prompt-engineering-patterns", args="original user request")
```

This skill returns the optimized request, which the orchestrator uses for task decomposition and routing.

---

**PROMPT ENGINEERING PATTERNS V2.0**
*Better input. Better output. Optimized for orchestrator.*
*New: Context-First Principle + XML Structure Output*
