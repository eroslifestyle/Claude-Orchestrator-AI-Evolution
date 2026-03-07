# 🧠 Analysis Layer - Sistema 3-Tier

> **Pragmatic Balance Approach** - Bilanciamento tra velocità, qualità e estensibilità

## 📁 Struttura Directory

```
src/analysis/
├── index.ts                    # Entry point pubblico
├── types.ts                    # Type definitions complete
├── analysis-engine.ts          # Core orchestrator (coming)
├── README.md                   # Questa documentazione
│
├── tiers/                      # Implementazioni 3-tier
│   ├── fast/                   # Tier 1: Fast Path
│   │   ├── fast-path-analyzer.ts      # Enhanced regex engine
│   │   ├── regex-patterns.ts          # Regex pattern definitions
│   │   └── word-boundary-matcher.ts   # Word boundary optimization
│   │
│   ├── smart/                  # Tier 2: Smart Path
│   │   ├── smart-path-analyzer.ts     # Synonym + NLP engine
│   │   ├── synonym-matcher.ts         # Synonym detection
│   │   ├── phrase-detector.ts         # Multi-word phrases
│   │   └── context-analyzer.ts        # Context-aware rules
│   │
│   └── deep/                   # Tier 3: Deep Path
│       ├── deep-path-analyzer.ts      # LLM integration
│       ├── claude-client.ts           # Claude API client
│       └── llm-fallback.ts           # Fallback mechanisms
│
├── utils/                      # Utilities condivise
│   ├── cache-manager.ts               # LRU Cache implementation
│   ├── performance-monitor.ts         # Metrics e monitoring
│   ├── synonym-dictionary.ts          # Dictionary management
│   ├── phrase-pattern-matcher.ts      # Pattern matching
│   └── context-rule-engine.ts         # Rule evaluation
│
└── config/                     # Configuration management
    ├── config-loader.ts               # Config file loader
    ├── default-configs.ts             # Default configurations
    └── validation.ts                  # Config validation
```

## 🎯 Architettura 3-Tier

### Tier 1: Fast Path (70% coverage, <10ms)
- **Scope**: Enhanced regex con word boundaries
- **Target**: Keyword esatte, phrase comuni
- **Performance**: <10ms, cache-optimized
- **Fallback**: Tier 2 se confidence <70%

```typescript
// Esempi Tier 1:
"implementa GUI PyQt5"     → GUI domain, 95% confidence
"crea database SQLite"     → Database domain, 90% confidence
"fix bug login"            → Testing domain, 85% confidence
```

### Tier 2: Smart Path (95% coverage, <50ms)
- **Scope**: Synonyms, phrases, context rules
- **Target**: Variazioni linguistiche, inferenze
- **Performance**: <50ms, NLP-enhanced
- **Fallback**: Tier 3 se ambiguità alta

```typescript
// Esempi Tier 2:
"costruisci interfaccia grafica" → GUI (synonym: interfaccia = GUI)
"gestione utenti sicura"        → Security (context: gestione + sicura)
"ottimizza query lente"         → Database (phrase: query + performance)
```

### Tier 3: Deep Path (100% coverage, <2s)
- **Scope**: Claude LLM analysis completa
- **Target**: Richieste complesse, ambigue
- **Performance**: <2s, API-dependent
- **Fallback**: Smart tier se API fail

```typescript
// Esempi Tier 3:
"sistema di monitoraggio con alerting real-time e dashboard"
"architettura microservizi per e-commerce con high availability"
"integrazione AI per recommendation engine personalizzato"
```

## 🔄 Flusso di Analisi

```
Input: "implementa login OAuth2 Google"
    ↓
┌─ TIER 1 (Fast Path) ─┐
│ Regex scan: ✅       │ ← "OAuth2", "Google" → Social Identity domain
│ Confidence: 85%      │ ← Sopra soglia 70%
│ Time: 8ms            │
└────────────────────────┘
    ↓ (Success - Stop)
Output: {
  domain: "social_identity",
  confidence: 0.85,
  agent: "experts/social_identity_expert.md",
  model: "sonnet"
}
```

```
Input: "migliora esperienza utente interfaccia"
    ↓
┌─ TIER 1 (Fast Path) ─┐
│ Regex scan: ⚠️       │ ← "esperienza", "interfaccia" → Ambiguo
│ Confidence: 45%      │ ← Sotto soglia 70%
│ Time: 6ms            │
└────────────────────────┘
    ↓ (Fallback to Tier 2)
┌─ TIER 2 (Smart Path) ─┐
│ Synonym: ✅          │ ← "interfaccia" = "GUI", "esperienza" = "UX"
│ Context: ✅          │ ← "migliora" + "interfaccia" → GUI domain
│ Confidence: 78%      │
│ Time: 35ms           │
└─────────────────────────┘
    ↓ (Success - Stop)
Output: {
  domain: "gui",
  confidence: 0.78,
  agent: "experts/gui-super-expert.md",
  model: "sonnet"
}
```

## ⚙️ Configurazione

### Performance Targets
| Tier | Timeout | Coverage | Cache TTL |
|------|---------|----------|-----------|
| Fast | 10ms    | 70%      | 5min      |
| Smart| 50ms    | 95%      | 10min     |
| Deep | 2000ms  | 100%     | 1hour     |

### Memory Usage
- **Dictionary**: ~5MB (synonyms + patterns)
- **Cache**: ~3MB LRU (1000 entries)
- **NLP**: ~10MB (model data)
- **Total**: ~20MB baseline

### Configuration Files
```
config/analysis/
├── synonyms.json           # Synonym mappings (200KB)
├── phrase-patterns.json    # Multi-word patterns (150KB)
├── context-rules.json      # Context inference rules (100KB)
└── tier-config.json        # Performance tuning (10KB)
```

## 🔧 Development Guidelines

### 1. Performance First
- Ogni tier DEVE rispettare timeout
- Cache TUTTO quello che può essere cached
- Early return se confidence alta
- Profiling abilitato in development

### 2. Graceful Degradation
- Tier failure → fallback automatico
- Partial results sempre meglio di failure
- Log errors ma continua processing
- User-friendly error messages

### 3. Extensibilità
- Plugin architecture per Tier 3
- Configuration-driven behavior
- Hot-reload delle configurazioni
- Metrics collection automatico

### 4. Testing Strategy
```typescript
// Unit tests: Ogni tier isolato
describe('FastPathAnalyzer', () => {
  it('should detect exact matches under 10ms');
  it('should fallback on low confidence');
});

// Integration tests: End-to-end flow
describe('AnalysisEngine', () => {
  it('should route through correct tier sequence');
  it('should maintain performance targets');
});

// Performance tests: Benchmarking
describe('Performance', () => {
  it('Fast tier should complete <10ms 95% time');
  it('Smart tier should complete <50ms 95% time');
});
```

## 📊 Monitoring & Metrics

### Key Metrics
- **Tier Usage**: % distribution across tiers
- **Response Time**: P50, P95, P99 per tier
- **Cache Hit Rate**: Overall e per tier
- **Accuracy**: Manual validation sample
- **Error Rate**: Failures per tier

### Health Checks
- Dictionary loading time
- Cache size e hit rate
- API connectivity (Tier 3)
- Memory usage trending

---

## 🚧 Implementation Status

- ✅ **Architecture design**
- ✅ **Type system complete**
- ✅ **Directory structure**
- 🔄 **Configuration files** (in progress)
- ⏳ **Tier 1 implementation**
- ⏳ **Tier 2 implementation**
- ⏳ **Tier 3 stub**
- ⏳ **Integration testing**