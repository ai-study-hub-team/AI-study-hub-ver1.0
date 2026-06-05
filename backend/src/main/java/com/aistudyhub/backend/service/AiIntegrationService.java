package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentProcessStatus;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.entity.DocumentChunk;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiIntegrationService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    public DocumentProcessStatus processDocument(Long documentId, String fileName, String originalFileName, String filePath, String fileType) {
        log.info("Starting processing for document ID: {}", documentId);
        
        try {
            updateDocumentStatus(documentId, DocumentProcessStatus.PROCESSING);
            
            String absoluteFilePath = Paths.get(filePath).toAbsolutePath().toString();
            log.info("Original stored file path: {}", filePath);
            log.info("Sending absolute file path to AI service: {}", absoluteFilePath);
            
            String url = aiServiceBaseUrl + "/process-document";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("documentId", documentId);
            requestBody.put("fileName", fileName);
            requestBody.put("originalFileName", originalFileName);
            requestBody.put("filePath", absoluteFilePath);
            requestBody.put("fileType", fileType);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                String status = (String) body.get("status");
                
                if ("PROCESSED".equals(status)) {
                    log.info("Successfully processed document ID: {} with AI service", documentId);
                    log.info("Extracted text length: {}", body.get("textLength"));
                    log.info("Preview text: {}", body.get("previewText"));
                    if (body.containsKey("chunkCount")) {
                        log.info("Created {} chunks", body.get("chunkCount"));
                    }
                    
                    if (body.containsKey("chunks")) {
                        saveChunks(documentId, (List<Map<String, Object>>) body.get("chunks"));
                    }
                    
                    updateDocumentStatus(documentId, DocumentProcessStatus.PROCESSED);
                    return DocumentProcessStatus.PROCESSED;
                } else {
                    log.error("AI service failed to process document ID: {}. Message: {}", documentId, body.get("message"));
                    updateDocumentStatus(documentId, DocumentProcessStatus.FAILED);
                    return DocumentProcessStatus.FAILED;
                }
            } else {
                log.error("AI service returned non-200 status or empty body for document ID: {}", documentId);
                updateDocumentStatus(documentId, DocumentProcessStatus.FAILED);
                return DocumentProcessStatus.FAILED;
            }
            
        } catch (Exception e) {
            log.error("Failed to process document ID: {} with AI service", documentId, e);
            updateDocumentStatus(documentId, DocumentProcessStatus.FAILED);
            return DocumentProcessStatus.FAILED;
        }
    }

    private void updateDocumentStatus(Long documentId, DocumentProcessStatus status) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            doc.setProcessStatus(status);
            documentRepository.save(doc);
        });
    }

    @Transactional
    protected void saveChunks(Long documentId, List<Map<String, Object>> chunksData) {
        documentRepository.findById(documentId).ifPresent(document -> {
            // Delete old chunks if any
            documentChunkRepository.deleteByDocumentId(documentId);
            
            // Save new chunks
            for (Map<String, Object> chunkData : chunksData) {
                DocumentChunk chunk = DocumentChunk.builder()
                        .document(document)
                        .chunkIndex((Integer) chunkData.get("chunkIndex"))
                        .chunkText((String) chunkData.get("chunkText"))
                        .charStart((Integer) chunkData.get("charStart"))
                        .charEnd((Integer) chunkData.get("charEnd"))
                        .textLength((Integer) chunkData.get("textLength"))
                        .build();
                documentChunkRepository.save(chunk);
            }
            log.info("Successfully saved {} chunks to the database for document ID: {}", chunksData.size(), documentId);
        });
    }
}
