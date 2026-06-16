package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.SemanticSearchResponse;
import com.aistudyhub.backend.dto.response.SemanticSearchResultResponse;
import com.aistudyhub.backend.entity.DocumentChunk;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Hybrid semantic search orchestrator:
 *
 *   1. Call Python /semantic-search with a larger candidateK (topK * 5, min 30, max 100)
 *      to get a wide pool of semantically similar chunks from Pinecone.
 *   2. Extract important terms from the query (Vietnamese stopwords removed).
 *   3. Run a MySQL keyword search using those important terms to add fallback candidates
 *      that Pinecone may have missed (exact keyword match).
 *   4. Merge & deduplicate the two candidate pools by (documentId, chunkIndex).
 *   5. Enrich every candidate with real chunkText from MySQL.
 *   6. Score every candidate: base Pinecone score + keyword boost → finalScore.
 *   7. Sort by finalScore desc, return the user's requested topK.
 *
 * Pinecone NEVER stores chunkText. MySQL is the sole source of truth for chunk content.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SemanticSearchService {

    private final DocumentChunkRepository documentChunkRepository;
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

        // candidateK: request a wider pool from Pinecone so reranking is effective
        int candidateK = Math.min(Math.max(topK * 5, 30), MAX_CANDIDATE);
        log.info("Hybrid search — query='{}', documentId={}, topK={}, candidateK={}",
                query, documentId, topK, candidateK);

        // ── Step 1: Semantic candidates from Pinecone (via Python) ────────────
        // Map key = "docId_chunkIndex" for deduplication
        Map<String, SemanticSearchResultResponse> candidateMap = new LinkedHashMap<>();

        List<Map<String, Object>> pythonResults = List.of();
        String pythonError = null;
        try {
            pythonResults = callPythonSemanticSearch(query, documentId, candidateK);
            log.info("Pinecone returned {} semantic candidates.", pythonResults.size());
        } catch (ResourceAccessException e) {
            pythonError = "Python AI service is not reachable (" + aiServiceBaseUrl + "): " + e.getMessage();
            log.warn("Semantic step skipped — {}", pythonError);
        } catch (Exception e) {
            pythonError = "Unexpected error calling Python: " + e.getMessage();
            log.warn("Semantic step skipped — {}", pythonError);
        }

        // Group candidates by documentId to fix N+1 query issue
        Map<Long, Set<Integer>> docToChunkIndexes = new HashMap<>();
        for (Map<String, Object> item : pythonResults) {
            Long    docId      = toLong(item.get("documentId"));
            Integer chunkIndex = toInt(item.get("chunkIndex"));
            if (docId != null && chunkIndex != null) {
                docToChunkIndexes.computeIfAbsent(docId, k -> new HashSet<>()).add(chunkIndex);
            }
        }

        log.info("Batch fetching chunks for {} documents.", docToChunkIndexes.size());

        // Fetch chunks in batch and build lookup map
        Map<String, DocumentChunk> chunkLookupMap = new HashMap<>();
        int batchFetches = 0;
        for (Map.Entry<Long, Set<Integer>> entry : docToChunkIndexes.entrySet()) {
            Long docId = entry.getKey();
            Set<Integer> chunkIndexes = entry.getValue();
            if (!chunkIndexes.isEmpty()) {
                List<DocumentChunk> chunks = documentChunkRepository.findByDocument_IdAndChunkIndexIn(docId, chunkIndexes);
                for (DocumentChunk chunk : chunks) {
                    chunkLookupMap.put(docId + ":" + chunk.getChunkIndex(), chunk);
                }
                batchFetches++;
            }
        }

        log.info("Performed {} batch fetches from MySQL.", batchFetches);

        // Enrich Pinecone candidates with MySQL chunkText
        int semanticMysqlHits = 0;
        for (Map<String, Object> item : pythonResults) {
            Long    docId      = toLong(item.get("documentId"));
            Integer chunkIndex = toInt(item.get("chunkIndex"));
            if (docId == null || chunkIndex == null) continue;

            Double  score      = toDouble(item.get("score"));
            Integer charStart  = toInt(item.get("charStart"));
            Integer charEnd    = toInt(item.get("charEnd"));
            Integer textLength = toInt(item.get("textLength"));
            String  fileName   = (String) item.get("originalFileName");

            String chunkText    = null;
            String documentTitle = null;
            String warning       = null;

            String lookupKey = docId + ":" + chunkIndex;
            DocumentChunk c = chunkLookupMap.get(lookupKey);
            if (c != null) {
                chunkText = c.getChunkText();
                if (c.getDocument() != null) documentTitle = c.getDocument().getTitle();
                semanticMysqlHits++;
            } else {
                warning = "Chunk not found in MySQL (documentId=" + docId + ", chunkIndex=" + chunkIndex + ")";
                log.warn("Semantic candidate — {}", warning);
            }

            String key = docId + "_" + chunkIndex;
            candidateMap.put(key, SemanticSearchResultResponse.builder()
                    .documentId(docId.intValue())
                    .documentTitle(documentTitle)
                    .chunkIndex(chunkIndex)
                    .score(score)
                    .chunkText(chunkText)
                    .charStart(charStart)
                    .charEnd(charEnd)
                    .textLength(textLength)
                    .originalFileName(fileName)
                    .warning(warning)
                    .source("SEMANTIC")
                    .build());
        }

        // ── Step 2: Keyword fallback candidates from MySQL ────────────────────
        List<String> importantTerms = extractImportantTerms(query);
        log.info("Important terms after stopword removal: {}", importantTerms);

        int keywordAdded = 0;
        if (!importantTerms.isEmpty()) {
            String importantPhrase = String.join(" ", importantTerms);

            List<DocumentChunk> keywordChunks = fetchKeywordChunks(documentId, importantPhrase);
            log.info("MySQL keyword search returned {} candidates for phrase '{}'.",
                    keywordChunks.size(), importantPhrase);

            for (DocumentChunk c : keywordChunks) {
                Long    docId      = c.getDocument() != null ? c.getDocument().getId() : null;
                Integer chunkIndex = c.getChunkIndex();
                if (docId == null || chunkIndex == null) continue;

                String key = docId + "_" + chunkIndex;
                if (candidateMap.containsKey(key)) continue; // already in candidates from Pinecone

                String documentTitle = c.getDocument() != null ? c.getDocument().getTitle() : null;
                String fileName = c.getDocument() != null && c.getDocument().getCloudFile() != null
                        ? c.getDocument().getCloudFile().getOriginalName() : null;

                candidateMap.put(key, SemanticSearchResultResponse.builder()
                        .documentId(docId.intValue())
                        .documentTitle(documentTitle)
                        .chunkIndex(chunkIndex)
                        .score(0.0)          // no Pinecone score for keyword candidates
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

        log.info("Candidate pool: {} semantic + {} new keyword = {} total",
                pythonResults.size(), keywordAdded, candidateMap.size());

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

        log.info("Returning {} results (from {} candidates). MySQL semantic hits: {}, keyword added: {}",
                finalResults.size(), candidateMap.size(), semanticMysqlHits, keywordAdded);

        return SemanticSearchResponse.builder()
                .query(query)
                .documentId(documentId)
                .topK(topK)
                .resultCount(finalResults.size())
                .results(finalResults)
                .error(pythonError)   // null when Python was reachable
                .build();
    }

    // ─── Internal: call Python /semantic-search ───────────────────────────────

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> callPythonSemanticSearch(
            String query, Long documentId, int candidateK) {

        UriComponentsBuilder uriBuilder = UriComponentsBuilder
                .fromHttpUrl(aiServiceBaseUrl + "/semantic-search")
                .queryParam("query", query)
                .queryParam("topK",  candidateK);

        if (documentId != null) uriBuilder.queryParam("documentId", documentId);

        String url = uriBuilder.toUriString();
        log.info("Calling Python semantic-search (candidateK={}): {}", candidateK, url);

        @SuppressWarnings("rawtypes")
        Map response = restTemplate.getForObject(url, Map.class);

        if (response == null) {
            log.warn("Python semantic-search returned null body.");
            return List.of();
        }
        if (response.containsKey("error") && response.get("error") != null) {
            log.error("Python semantic-search error: {}", response.get("error"));
        }

        Object resultsObj = response.get("results");
        if (resultsObj instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return List.of();
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

    // ─── MySQL keyword fallback ───────────────────────────────────────────────

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
            log.error("MySQL keyword fallback failed for phrase '{}': {}", phrase, e.getMessage());
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

    // ─── Type-safe converters (Python JSON numbers may be Integer or Double) ──

    private Long toLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Long l)    return l;
        if (obj instanceof Integer i) return i.longValue();
        if (obj instanceof Double d)  return d.longValue();
        return Long.parseLong(obj.toString());
    }

    private Integer toInt(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Integer i) return i;
        if (obj instanceof Long l)    return l.intValue();
        if (obj instanceof Double d)  return d.intValue();
        return Integer.parseInt(obj.toString());
    }

    private Double toDouble(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Double d)  return d;
        if (obj instanceof Integer i) return i.doubleValue();
        if (obj instanceof Long l)    return l.doubleValue();
        return Double.parseDouble(obj.toString());
    }
}
