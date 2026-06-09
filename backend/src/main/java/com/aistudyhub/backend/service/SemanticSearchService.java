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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Orchestrates semantic search:
 *   1. Calls Python /semantic-search to get documentId + chunkIndex + score from Pinecone.
 *   2. For each result, fetches the real chunkText from MySQL via DocumentChunkRepository.
 *   3. Returns a combined, enriched response.
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

    private static final int MAX_TOP_K = 20;
    private static final int DEFAULT_TOP_K = 5;

    // ─── Public API ───────────────────────────────────────────────────────────

    public SemanticSearchResponse search(String query, Long documentId, Integer topK) {

        // ── Validation ────────────────────────────────────────────────────────
        if (query == null || query.isBlank()) {
            return SemanticSearchResponse.builder()
                    .query(query)
                    .documentId(documentId)
                    .topK(0)
                    .resultCount(0)
                    .results(List.of())
                    .error("Query must not be blank.")
                    .build();
        }

        // Clamp topK
        if (topK == null || topK < 1) topK = DEFAULT_TOP_K;
        if (topK > MAX_TOP_K)         topK = MAX_TOP_K;

        log.info("Semantic search — query='{}', documentId={}, topK={}", query, documentId, topK);

        // ── Step 1: Call Python to get Pinecone results ───────────────────────
        List<Map<String, Object>> pythonResults;
        try {
            pythonResults = callPythonSemanticSearch(query, documentId, topK);
        } catch (ResourceAccessException e) {
            String errMsg = "Python AI service is not reachable. Make sure it is running on "
                    + aiServiceBaseUrl + ". Detail: " + e.getMessage();
            log.error("Semantic search — Python service unreachable: {}", e.getMessage());
            return SemanticSearchResponse.builder()
                    .query(query)
                    .documentId(documentId)
                    .topK(topK)
                    .resultCount(0)
                    .results(List.of())
                    .error(errMsg)
                    .build();
        } catch (Exception e) {
            String errMsg = "Unexpected error calling Python service: " + e.getMessage();
            log.error("Semantic search — unexpected error: {}", e.getMessage(), e);
            return SemanticSearchResponse.builder()
                    .query(query)
                    .documentId(documentId)
                    .topK(topK)
                    .resultCount(0)
                    .results(List.of())
                    .error(errMsg)
                    .build();
        }

        log.info("Semantic search — Python returned {} results.", pythonResults.size());

        // ── Step 2: Enrich each result with chunkText from MySQL ──────────────
        List<SemanticSearchResultResponse> enriched = new ArrayList<>();
        int mysqlHits = 0;

        for (Map<String, Object> item : pythonResults) {
            Long   docId      = toLong(item.get("documentId"));
            Integer chunkIndex = toInt(item.get("chunkIndex"));
            Double  score      = toDouble(item.get("score"));
            Integer charStart  = toInt(item.get("charStart"));
            Integer charEnd    = toInt(item.get("charEnd"));
            Integer textLength = toInt(item.get("textLength"));
            String  fileName   = (String) item.get("originalFileName");

            // Look up the chunk in MySQL
            String  chunkText = null;
            String  warning   = null;

            Optional<DocumentChunk> chunkOpt =
                    documentChunkRepository.findByDocument_IdAndChunkIndex(docId, chunkIndex);

            if (chunkOpt.isPresent()) {
                chunkText = chunkOpt.get().getChunkText();
                mysqlHits++;
            } else {
                warning = "Chunk not found in MySQL (documentId=" + docId + ", chunkIndex=" + chunkIndex + ")";
                log.warn("Semantic search — {}", warning);
            }

            enriched.add(SemanticSearchResultResponse.builder()
                    .documentId(docId != null ? docId.intValue() : null)
                    .chunkIndex(chunkIndex)
                    .score(score)
                    .chunkText(chunkText)
                    .charStart(charStart)
                    .charEnd(charEnd)
                    .textLength(textLength)
                    .originalFileName(fileName)
                    .warning(warning)
                    .build());
        }

        log.info("Semantic search — enriched {}/{} results with MySQL chunkText.",
                mysqlHits, pythonResults.size());

        return SemanticSearchResponse.builder()
                .query(query)
                .documentId(documentId)
                .topK(topK)
                .resultCount(enriched.size())
                .results(enriched)
                .build();
    }

    // ─── Internal: call Python /semantic-search ───────────────────────────────

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> callPythonSemanticSearch(
            String query, Long documentId, int topK) {

        UriComponentsBuilder uriBuilder = UriComponentsBuilder
                .fromHttpUrl(aiServiceBaseUrl + "/semantic-search")
                .queryParam("query",  query)
                .queryParam("topK",   topK);

        if (documentId != null) {
            uriBuilder.queryParam("documentId", documentId);
        }

        String url = uriBuilder.toUriString();
        log.info("Calling Python semantic-search: {}", url);

        @SuppressWarnings("rawtypes")
        Map response = restTemplate.getForObject(url, Map.class);

        if (response == null) {
            log.warn("Python semantic-search returned null body.");
            return List.of();
        }

        // Check for error field from Python
        if (response.containsKey("error") && response.get("error") != null) {
            log.error("Python semantic-search reported error: {}", response.get("error"));
        }

        Object resultsObj = response.get("results");
        if (resultsObj instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return List.of();
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
