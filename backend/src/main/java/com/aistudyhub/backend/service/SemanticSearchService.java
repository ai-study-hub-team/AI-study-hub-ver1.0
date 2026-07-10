package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.python.PythonContextChunk;
import com.aistudyhub.backend.dto.response.SemanticSearchResponse;
import com.aistudyhub.backend.dto.response.SemanticSearchResultResponse;
import com.aistudyhub.backend.entity.DocumentChunk;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Hybrid semantic search orchestrator:
 *
 *   1. Call Python /semantic-search with a larger candidateK (topK * 5, min 30, max 100)
 *      to get a wide pool of semantically similar chunks from the vector store
 *      (pgvector or Pinecone, depending on VECTOR_STORE config).
 *   2. Extract important terms from the query (Vietnamese stopwords removed).
 *   3. Run a PostgreSQL keyword search using those important terms to add fallback
 *      candidates that vector search may have missed (exact keyword match).
 *   4. Merge & deduplicate the two candidate pools by (documentId, chunkIndex).
 *   5. Enrich every candidate with real chunkText from PostgreSQL.
 *   6. Score every candidate: base vector score + keyword boost → finalScore.
 *   7. Sort by finalScore desc, return the user's requested topK.
 *
 * The vector store NEVER stores chunkText. PostgreSQL document_chunks is the sole
 * source of truth for chunk content.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SemanticSearchService {

    private final DocumentChunkRepository documentChunkRepository;
    private final PgvectorSearchService   pgvectorSearchService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    private static final int MAX_TOP_K     = 20;
    private static final int DEFAULT_TOP_K = 5;
    private static final int MAX_CANDIDATE = 100;

    // Generic Vietnamese words that should not be treated as important search terms
    private static final Set<String> VI_STOPWORDS = Set.of(
            "định", "nghĩa", "khái", "niệm", "là", "gì", "của", "về", "cho",
            "trong", "một", "các", "những", "và", "với", "có", "được", "như",
            "khi", "này", "đó", "mà", "hay", "hoặc", "tại", "từ", "đến",
            "theo", "bởi", "vì", "do", "nên", "thì", "ra", "vào", "lên",
            "xuống", "qua", "lại", "đã", "sẽ", "đang", "bị"
    );

    // ─── Public API ───────────────────────────────────────────────────────────

    public SemanticSearchResponse search(String query, Long documentId, Integer topK) {

        // ── Validation ────────────────────────────────────────────────────────
        if (query == null || query.isBlank()) {
            return SemanticSearchResponse.builder()
                    .query(query).documentId(documentId).topK(0).resultCount(0)
                    .results(List.of()).error("Query must not be blank.").build();
        }

        // Clamp topK
        if (topK == null || topK < 1) topK = DEFAULT_TOP_K;
        if (topK > MAX_TOP_K)         topK = MAX_TOP_K;

        // candidateK: request a wider pool from vector store so reranking is effective
        int candidateK = Math.min(Math.max(topK * 5, 30), MAX_CANDIDATE);
        log.info("Hybrid search — query='{}', documentId={}, topK={}, candidateK={}",
                query, documentId, topK, candidateK);

        // ── Step 1: Get query embedding from Python /embed-query, then search pgvector directly ──
        Map<String, SemanticSearchResultResponse> candidateMap = new LinkedHashMap<>();

        String pythonError = null;
        try {
            List<Map<String, Object>> pgvectorRows = callEmbedAndSearch(query, documentId, null, candidateK);
            log.info("[pgvector direct] Returned {} semantic candidates.", pgvectorRows.size());

            // Batch fetch chunks by docId
            Map<Long, Set<Integer>> docToIndexes = new HashMap<>();
            for (Map<String, Object> row : pgvectorRows) {
                Long   docId = toLong(row.get("document_id"));
                Integer ci   = toInt(row.get("chunk_index"));
                if (docId != null && ci != null)
                    docToIndexes.computeIfAbsent(docId, k -> new HashSet<>()).add(ci);
            }

            Map<String, DocumentChunk> chunkLookup = new HashMap<>();
            for (Map.Entry<Long, Set<Integer>> e : docToIndexes.entrySet()) {
                Long docId = e.getKey();
                List<DocumentChunk> chunks = documentChunkRepository
                        .findByDocument_IdAndChunkIndexIn(docId, e.getValue());
                for (DocumentChunk c : chunks)
                    chunkLookup.put(docId + ":" + c.getChunkIndex(), c);
            }

            for (Map<String, Object> row : pgvectorRows) {
                Long    docId      = toLong(row.get("document_id"));
                Integer chunkIndex = toInt(row.get("chunk_index"));
                Double  score      = toDouble(row.get("score"));
                if (docId == null || chunkIndex == null) continue;

                DocumentChunk c     = chunkLookup.get(docId + ":" + chunkIndex);
                String chunkText    = c != null ? c.getChunkText() : null;
                String docTitle     = (c != null && c.getDocument() != null) ? c.getDocument().getTitle() : null;
                String fileName     = (c != null && c.getDocument() != null
                        && c.getDocument().getCloudFile() != null)
                        ? c.getDocument().getCloudFile().getOriginalName() : null;

                String key = docId + "_" + chunkIndex;
                candidateMap.put(key, SemanticSearchResultResponse.builder()
                        .documentId(docId.intValue())
                        .documentTitle(docTitle)
                        .chunkIndex(chunkIndex)
                        .score(score)
                        .chunkText(chunkText)
                        .originalFileName(fileName)
                        .source("SEMANTIC")
                        .build());
            }
        } catch (Exception e) {
            pythonError = "Embedding/pgvector error: " + e.getMessage();
            log.warn("Semantic step skipped — {}", pythonError);
        }

        // ── Step 2: Keyword fallback candidates from PostgreSQL ───────────────
        List<String> importantTerms = extractImportantTerms(query);
        log.info("Important terms after stopword removal: {}", importantTerms);

        int keywordAdded = 0;
        if (!importantTerms.isEmpty()) {
            String importantPhrase = String.join(" ", importantTerms);

            List<DocumentChunk> keywordChunks = fetchKeywordChunks(documentId, importantPhrase);
            log.info("PostgreSQL keyword search returned {} candidates for phrase '{}'.",
                    keywordChunks.size(), importantPhrase);

            for (DocumentChunk c : keywordChunks) {
                Long    docId      = c.getDocument() != null ? c.getDocument().getId() : null;
                Integer chunkIndex = c.getChunkIndex();
                if (docId == null || chunkIndex == null) continue;

                String key = docId + "_" + chunkIndex;
                if (candidateMap.containsKey(key)) continue;

                String documentTitle = c.getDocument() != null ? c.getDocument().getTitle() : null;
                String fileName = c.getDocument() != null && c.getDocument().getCloudFile() != null
                        ? c.getDocument().getCloudFile().getOriginalName() : null;

                candidateMap.put(key, SemanticSearchResultResponse.builder()
                        .documentId(docId.intValue())
                        .documentTitle(documentTitle)
                        .chunkIndex(chunkIndex)
                        .score(0.0)
                        .chunkText(c.getChunkText())
                        .charStart(c.getCharStart())
                        .charEnd(c.getCharEnd())
                        .textLength(c.getTextLength())
                        .originalFileName(fileName)
                        .source("KEYWORD")
                        .build());
                keywordAdded++;
            }
        }

        log.info("Candidate pool: {} total ({} keyword added)", candidateMap.size(), keywordAdded);

        // ── Step 3: Score all candidates with keyword boost, sort, trim ───────
        List<String> importantTermsForBoost = importantTerms;
        List<SemanticSearchResultResponse> finalResults = candidateMap.values().stream()
                .map(r -> {
                    double boost = calculateKeywordBoost(
                            query, importantTermsForBoost,
                            r.getChunkText(), r.getDocumentTitle(), r.getOriginalFileName());
                    double base  = r.getScore() != null ? r.getScore() : 0.0;
                    return SemanticSearchResultResponse.builder()
                            .documentId(r.getDocumentId())
                            .documentTitle(r.getDocumentTitle())
                            .chunkIndex(r.getChunkIndex())
                            .score(r.getScore())
                            .finalScore(base + boost)
                            .chunkText(r.getChunkText())
                            .charStart(r.getCharStart())
                            .charEnd(r.getCharEnd())
                            .textLength(r.getTextLength())
                            .originalFileName(r.getOriginalFileName())
                            .warning(r.getWarning())
                            .source(r.getSource())
                            .build();
                })
                .sorted(Comparator.comparingDouble(
                        r -> -(r.getFinalScore() != null ? r.getFinalScore() : 0.0)))
                .limit(topK)
                .collect(Collectors.toList());

        log.info("Returning {} results (from {} candidates, {} keyword added).",
                finalResults.size(), candidateMap.size(), keywordAdded);

        return SemanticSearchResponse.builder()
                .query(query)
                .documentId(documentId)
                .topK(topK)
                .resultCount(finalResults.size())
                .results(finalResults)
                .error(pythonError)   // null when Python was reachable
                .build();
    }

    // ─── Internal: call Python /embed-query then search pgvector directly ─────

    /**
     * Get a query embedding from Python /embed-query, then query pgvector directly
     * via PgvectorSearchService.searchByEmbedding().
     * This replaces the old Python /semantic-search flow.
     */
    private List<Map<String, Object>> callEmbedAndSearch(
            String query, Long documentId, List<Long> documentIds, int topK) {

        // Step A: Get embedding from Python
        float[] embedding = callEmbedQuery(query);

        // Step B: Query pgvector directly from Spring Boot via JDBC
        return pgvectorSearchService.searchByEmbedding(embedding, documentId, documentIds, topK);
    }

    @SuppressWarnings("unchecked")
    private float[] callEmbedQuery(String text) {
        String url = aiServiceBaseUrl + "/embed-query";
        log.info("[embed-query] Calling Python at {} for text (len={})", url, text.length());

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        java.util.Map<String, String> body = java.util.Map.of("text", text);
        org.springframework.http.HttpEntity<java.util.Map<String, String>> entity =
                new org.springframework.http.HttpEntity<>(body, headers);

        org.springframework.http.ResponseEntity<java.util.Map> resp =
                restTemplate.postForEntity(url, entity, java.util.Map.class);

        if (resp.getBody() == null || !resp.getBody().containsKey("embedding")) {
            throw new RuntimeException("Python /embed-query returned invalid response");
        }

        java.util.List<Number> embList = (java.util.List<Number>) resp.getBody().get("embedding");
        float[] arr = new float[embList.size()];
        for (int i = 0; i < embList.size(); i++) arr[i] = embList.get(i).floatValue();
        log.info("[embed-query] Received embedding dim={}", arr.length);
        return arr;
    }

    // ─── Vietnamese keyword extraction (stopword removal) ─────────────────────

    private List<String> extractImportantTerms(String query) {
        if (query == null || query.isBlank()) return List.of();
        String[] words = query.toLowerCase().trim().split("\\s+");
        return Arrays.stream(words)
                .filter(w -> w.length() > 1)
                .filter(w -> !VI_STOPWORDS.contains(w))
                .collect(Collectors.toList());
    }

    // ─── PostgreSQL keyword fallback ──────────────────────────────────────────

    private List<DocumentChunk> fetchKeywordChunks(Long documentId, String phrase) {
        try {
            if (documentId != null) {
                return documentChunkRepository
                        .findByDocumentIdAndChunkTextContainingIgnoreCaseOrderByChunkIndexAsc(
                                documentId, phrase);
            } else {
                // Global keyword search — use first page to cap results
                return documentChunkRepository
                        .findByChunkTextContainingIgnoreCase(phrase,
                                org.springframework.data.domain.PageRequest.of(0, 20))
                        .getContent();
            }
        } catch (Exception e) {
            log.error("PostgreSQL keyword fallback failed for phrase '{}': {}", phrase, e.getMessage());
            return List.of();
        }
    }

    // ─── Keyword Boost Logic (Vietnamese-aware) ───────────────────────────────

    private double calculateKeywordBoost(String query, List<String> importantTerms,
                                         String chunkText, String title, String fileName) {
        double boost = 0.0;
        if (importantTerms.isEmpty()) return boost;

        String normalizedQuery = normalizeSearchText(query);
        List<String> normTerms = normalizeImportantTerms(importantTerms);
        if (normTerms.isEmpty()) return 0.0;
        String importantPhrase = String.join(" ", normTerms);

        if (chunkText != null) {
            String normalizedChunk = normalizeSearchText(chunkText);
            Set<String> chunkWords = tokenizeToSet(normalizedChunk);

            // Strongest boost: important phrase match (stopwords stripped)
            if (containsExactPhrase(normalizedChunk, importantPhrase)) {
                boost += 0.25;
                log.debug("Phrase boost +0.25 for phrase '{}' in chunk", importantPhrase);
            } else if (containsExactPhrase(normalizedChunk, normalizedQuery)) {
                // Exact original query match (also good, but includes generic words)
                boost += 0.15;
            }

            // N-gram phrase boost
            double phraseBoost = 0.0;
            List<String> trigrams = generateNgrams(normTerms, 3);
            for (String trigram : trigrams) {
                if (containsExactPhrase(normalizedChunk, trigram)) {
                    phraseBoost += 0.06;
                }
            }
            List<String> bigrams = generateNgrams(normTerms, 2);
            for (String bigram : bigrams) {
                if (containsExactPhrase(normalizedChunk, bigram)) {
                    phraseBoost += 0.04;
                }
            }
            boost += Math.min(phraseBoost, 0.16);

            // Per-term boost & coverage
            int matchedTerms = 0;
            for (String term : normTerms) {
                if (term.length() > 1 && chunkWords.contains(term)) {
                    boost += 0.01;
                    matchedTerms++;
                }
            }

            double coverage = (double) matchedTerms / normTerms.size();
            if (coverage >= 0.85) {
                boost += 0.12;
            } else if (coverage >= 0.65) {
                boost += 0.08;
            } else if (coverage >= 0.45) {
                boost += 0.04;
            }
        }

        if (title != null) {
            String normalizedTitle = normalizeSearchText(title);
            if (containsExactPhrase(normalizedTitle, importantPhrase)) boost += 0.10;
        }

        if (fileName != null) {
            String normalizedFileName = normalizeSearchText(fileName);
            if (containsExactPhrase(normalizedFileName, importantPhrase)) boost += 0.05;
        }

        return Math.min(boost, 0.30);
    }

    private String normalizeSearchText(String text) {
        if (text == null) return "";
        return text.toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private Set<String> tokenizeToSet(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) return Collections.emptySet();
        return new HashSet<>(Arrays.asList(normalizedText.split("\\s+")));
    }

    private boolean containsExactPhrase(String normalizedText, String normalizedPhrase) {
        if (normalizedText == null || normalizedPhrase == null || normalizedPhrase.isBlank()) return false;
        String regex = "(?<![\\p{L}\\p{N}])" + Pattern.quote(normalizedPhrase) + "(?![\\p{L}\\p{N}])";
        return Pattern.compile(regex).matcher(normalizedText).find();
    }

    private List<String> generateNgrams(List<String> terms, int n) {
        List<String> ngrams = new ArrayList<>();
        if (terms.size() < n) return ngrams;
        for (int i = 0; i <= terms.size() - n; i++) {
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < n; j++) {
                if (j > 0) sb.append(" ");
                sb.append(terms.get(i + j));
            }
            ngrams.add(sb.toString());
        }
        return ngrams;
    }

    private List<String> normalizeImportantTerms(List<String> terms) {
        if (terms == null) {
            return List.of();
        }
        return terms.stream()
                .map(this::normalizeSearchText)
                .filter(term -> !term.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    // ─── Internal: Chat AI context retrieval ─────────────────────────────────
    // Called by ChatSessionService instead of delegating retrieval to Python.
    // Returns up to topK resolved chunks (full text) filtered to documentIds.

    /**
     * Perform hybrid semantic search scoped to the provided list of document IDs.
     * Used by Chat AI to prepare context chunks before calling Python /generate-answer.
     *
     * @param query       The user's question.
     * @param documentIds List of document IDs to restrict search to (1–5).
     * @param topK        Number of chunks to return (typically 5).
     * @return List of PythonContextChunk with full chunk text resolved from PostgreSQL.
     */
    public List<PythonContextChunk> retrieveForChat(String query, List<Long> documentIds, int topK) {
        if (query == null || query.isBlank() || documentIds == null || documentIds.isEmpty()) {
            return List.of();
        }
        if (topK < 1) topK = 5;

        // candidateK: wider pool so reranking is more effective
        int candidateK = Math.min(Math.max(topK * 5, 30), MAX_CANDIDATE);
        log.info("[Chat RAG] retrieveForChat — query='{}', documentIds={}, topK={}, candidateK={}",
                query, documentIds, topK, candidateK);

        Map<String, SemanticSearchResultResponse> candidateMap = new LinkedHashMap<>();

        // ── Step 1: Embed query → pgvector direct search ─────────────────────
        for (Long docId : documentIds) {
            try {
                List<Map<String, Object>> rows =
                        callEmbedAndSearch(query, docId, null, candidateK);
                log.info("[Chat RAG] pgvector direct returned {} rows for docId={}.", rows.size(), docId);

                Set<Integer> chunkIndexes = new HashSet<>();
                for (Map<String, Object> row : rows) {
                    Integer ci = toInt(row.get("chunk_index"));
                    if (ci != null) chunkIndexes.add(ci);
                }

                Map<String, DocumentChunk> chunkLookup = new HashMap<>();
                if (!chunkIndexes.isEmpty()) {
                    List<DocumentChunk> chunks = documentChunkRepository
                            .findByDocument_IdAndChunkIndexIn(docId, chunkIndexes);
                    for (DocumentChunk c : chunks)
                        chunkLookup.put(docId + ":" + c.getChunkIndex(), c);
                }

                for (Map<String, Object> row : rows) {
                    Integer chunkIndex = toInt(row.get("chunk_index"));
                    Double  score      = toDouble(row.get("score"));
                    if (chunkIndex == null) continue;

                    DocumentChunk c    = chunkLookup.get(docId + ":" + chunkIndex);
                    String chunkText   = c != null ? c.getChunkText() : null;
                    String docTitle    = (c != null && c.getDocument() != null)
                            ? c.getDocument().getTitle() : null;

                    String key = docId + "_" + chunkIndex;
                    candidateMap.putIfAbsent(key, SemanticSearchResultResponse.builder()
                            .documentId(docId.intValue())
                            .documentTitle(docTitle)
                            .chunkIndex(chunkIndex)
                            .score(score)
                            .chunkText(chunkText)
                            .locatorType(c != null ? c.getLocatorType() : null)
                            .locatorStart(c != null ? c.getLocatorStart() : null)
                            .locatorEnd(c != null ? c.getLocatorEnd() : null)
                            .source("SEMANTIC")
                            .build());
                }
            } catch (Exception e) {
                log.warn("[Chat RAG] Vector search failed for docId={}: {}. Falling back to keyword only.",
                        docId, e.getMessage());
            }
        }

        // ── Step 2: Keyword fallback per document ─────────────────────────────
        List<String> importantTerms = extractImportantTerms(query);
        if (!importantTerms.isEmpty()) {
            String phrase = String.join(" ", importantTerms);
            for (Long docId : documentIds) {
                try {
                    List<DocumentChunk> keywordChunks = documentChunkRepository
                            .findByDocumentIdAndChunkTextContainingIgnoreCaseOrderByChunkIndexAsc(docId, phrase);
                    for (DocumentChunk c : keywordChunks) {
                        String key = docId + "_" + c.getChunkIndex();
                        if (!candidateMap.containsKey(key)) {
                            String docTitle = c.getDocument() != null ? c.getDocument().getTitle() : null;
                            candidateMap.put(key, SemanticSearchResultResponse.builder()
                                    .documentId(docId.intValue())
                                    .documentTitle(docTitle)
                                    .chunkIndex(c.getChunkIndex())
                                    .score(0.0)
                                    .chunkText(c.getChunkText())
                                    .locatorType(c.getLocatorType())
                                    .locatorStart(c.getLocatorStart())
                                    .locatorEnd(c.getLocatorEnd())
                                    .source("KEYWORD")
                                    .build());
                        }
                    }
                } catch (Exception e) {
                    log.warn("[Chat RAG] Keyword fallback failed for docId={}: {}", docId, e.getMessage());
                }
            }
        }

        // ── Step 3: Score with keyword boost, sort, trim ──────────────────────
        List<String> termsForBoost = importantTerms;
        int finalTopK = topK;
        List<PythonContextChunk> results = candidateMap.values().stream()
                .map(r -> {
                    double boost = calculateKeywordBoost(query, termsForBoost,
                            r.getChunkText(), r.getDocumentTitle(), r.getOriginalFileName());
                    double base = r.getScore() != null ? r.getScore() : 0.0;
                    return new Object[]{r, base + boost};
                })
                .sorted((a, b) -> Double.compare((double) b[1], (double) a[1]))
                .limit(finalTopK)
                .map(pair -> {
                    SemanticSearchResultResponse r = (SemanticSearchResultResponse) pair[0];
                    double finalScore = (double) pair[1];
                    return PythonContextChunk.builder()
                            .documentId((long) r.getDocumentId())
                            .documentTitle(r.getDocumentTitle())
                            .chunkIndex(r.getChunkIndex())
                            .chunkText(r.getChunkText())
                            .score(finalScore)
                            .sourceLabel("Chunk " + r.getChunkIndex())
                            .locatorType(r.getLocatorType())
                            .locatorStart(r.getLocatorStart())
                            .locatorEnd(r.getLocatorEnd())
                            .build();
                })
                .collect(Collectors.toList());

        log.info("[Chat RAG] retrieveForChat returned {} context chunks from {} candidates.",
                results.size(), candidateMap.size());

        // Log each context chunk's locator metadata (mirrors [Chat Context] requirement)
        for (PythonContextChunk c : results) {
            log.info("[Chat Context] docId={}, chunkIndex={}, locatorType={}, locatorStart={}, locatorEnd={}, score={}",
                    c.getDocumentId(), c.getChunkIndex(),
                    c.getLocatorType(), c.getLocatorStart(), c.getLocatorEnd(),
                    c.getScore() != null ? String.format("%.4f", c.getScore()) : "null");
        }

        return results;
    }

    private Double toDouble(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Double)  return (Double) obj;
        if (obj instanceof Integer) return ((Integer) obj).doubleValue();
        if (obj instanceof Long)    return ((Long) obj).doubleValue();
        return Double.parseDouble(obj.toString());
    }

    private Long toLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Long)    return (Long) obj;
        if (obj instanceof Integer) return ((Integer) obj).longValue();
        if (obj instanceof Double)  return ((Double) obj).longValue();
        return Long.parseLong(obj.toString());
    }

    private Integer toInt(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Integer) return (Integer) obj;
        if (obj instanceof Long)    return ((Long) obj).intValue();
        if (obj instanceof Double)  return ((Double) obj).intValue();
        return Integer.parseInt(obj.toString());
    }
}

