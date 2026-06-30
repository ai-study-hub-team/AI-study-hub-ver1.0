package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.ResendProperties;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResendEmailService {

    private static final String RESEND_EMAIL_API_URL = "https://api.resend.com/emails";
    private static final String DOCUMENT_SHARED_SUBJECT = "A document has been shared with you";

    private final ResendProperties resendProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    public void sendDocumentSharedEmail(
            User receiver,
            User owner,
            Document document
    ) {
        if (receiver == null || receiver.getEmail() == null || receiver.getEmail().isBlank()) {
            log.warn("Skip sending share email because receiver email is missing");
            return;
        }

        if (owner == null || document == null) {
            log.warn("Skip sending share email because owner or document is missing");
            return;
        }

        if (isBlank(resendProperties.getApiKey())) {
            log.warn("Skip sending share email because RESEND_API_KEY is not configured");
            return;
        }

        if (isBlank(resendProperties.getFromEmail())) {
            log.warn("Skip sending share email because resend.from-email is not configured");
            return;
        }

        String documentUrl = buildDocumentUrl(document.getId());
        String html = buildDocumentSharedHtml(receiver, owner, document, documentUrl);

        Map<String, Object> body = new HashMap<>();
        body.put("from", resendProperties.getFromEmail());
        body.put("to", List.of(receiver.getEmail()));
        body.put("subject", DOCUMENT_SHARED_SUBJECT);
        body.put("html", html);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(resendProperties.getApiKey());
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(
                    RESEND_EMAIL_API_URL,
                    requestEntity,
                    String.class
            );

            log.info(
                    "Share email sent. documentId={}, receiverEmail={}",
                    document.getId(),
                    receiver.getEmail()
            );
        } catch (RestClientException ex) {
            log.warn(
                    "Failed to send share email. documentId={}, receiverEmail={}",
                    document.getId(),
                    receiver.getEmail(),
                    ex
            );
            throw ex;
        }
    }

    private String buildDocumentUrl(Long documentId) {
        String frontendUrl = resendProperties.getFrontendUrl();

        if (isBlank(frontendUrl)) {
            frontendUrl = "http://localhost:5173";
        }

        return trimTrailingSlash(frontendUrl) + "/documents/" + documentId;
    }

    private String buildDocumentSharedHtml(
            User receiver,
            User owner,
            Document document,
            String documentUrl
    ) {
        String receiverName = isBlank(receiver.getFullName())
                ? receiver.getEmail()
                : receiver.getFullName();

        String ownerName = isBlank(owner.getFullName())
                ? owner.getEmail()
                : owner.getFullName();

        String documentTitle = isBlank(document.getTitle())
                ? "Untitled document"
                : document.getTitle();

        return """
                <!doctype html>
                <html>
                <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
                    <p>Hello %s,</p>
                    <p><strong>%s</strong> has shared a document with you on AI Study Hub.</p>
                    <p><strong>Document:</strong> %s</p>
                    <p>
                        <a href="%s"
                           style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
                            Open document
                        </a>
                    </p>
                    <p>
                        Please sign in with this email address to view the document:
                        <strong>%s</strong>
                    </p>
                    <p>If the button does not work, copy and paste this link into your browser:</p>
                    <p><a href="%s">%s</a></p>
                </body>
                </html>
                """.formatted(
                escapeHtml(receiverName),
                escapeHtml(ownerName),
                escapeHtml(documentTitle),
                escapeHtml(documentUrl),
                escapeHtml(receiver.getEmail()),
                escapeHtml(documentUrl),
                escapeHtml(documentUrl)
        );
    }

    private String trimTrailingSlash(String value) {
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }

        return value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
