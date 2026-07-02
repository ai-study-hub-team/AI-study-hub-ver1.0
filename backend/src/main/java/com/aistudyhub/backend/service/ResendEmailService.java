package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.ResendProperties;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.Folder;
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
    private static final String FOLDER_SHARED_SUBJECT = "A folder has been shared with you";

    private final ResendProperties resendProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    public void sendDocumentSharedEmail(
            User receiver,
            User owner,
            Document document
    ) {
        sendDocumentSharedEmail(receiver, owner, document, null);
    }

    public void sendDocumentSharedEmail(
            User receiver,
            User owner,
            Document document,
            DocumentSharePermission permission
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
        String html = buildDocumentSharedHtml(receiver, owner, document, permission, documentUrl);

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

    public void sendFolderSharedEmail(
            User receiver,
            User owner,
            Folder folder,
            DocumentSharePermission permission
    ) {
        if (receiver == null || receiver.getEmail() == null || receiver.getEmail().isBlank()) {
            log.warn("Skip sending folder share email because receiver email is missing");
            return;
        }

        if (owner == null || folder == null) {
            log.warn("Skip sending folder share email because owner or folder is missing");
            return;
        }

        if (isBlank(resendProperties.getApiKey())) {
            log.warn("Skip sending folder share email because RESEND_API_KEY is not configured");
            return;
        }

        if (isBlank(resendProperties.getFromEmail())) {
            log.warn("Skip sending folder share email because resend.from-email is not configured");
            return;
        }

        String folderUrl = buildFolderUrl(folder.getId());
        String html = buildFolderSharedHtml(receiver, owner, folder, permission, folderUrl);

        Map<String, Object> body = new HashMap<>();
        body.put("from", resendProperties.getFromEmail());
        body.put("to", List.of(receiver.getEmail()));
        body.put("subject", FOLDER_SHARED_SUBJECT);
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
                    "Folder share email sent. folderId={}, receiverEmail={}",
                    folder.getId(),
                    receiver.getEmail()
            );
        } catch (RestClientException ex) {
            log.warn(
                    "Failed to send folder share email. folderId={}, receiverEmail={}",
                    folder.getId(),
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

    private String buildFolderUrl(Long folderId) {
        String frontendUrl = resendProperties.getFrontendUrl();

        if (isBlank(frontendUrl)) {
            frontendUrl = "http://localhost:5173";
        }

        return trimTrailingSlash(frontendUrl) + "/folders/" + folderId;
    }

    private String buildDocumentSharedHtml(
            User receiver,
            User owner,
            Document document,
            DocumentSharePermission permission,
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
                    <p><strong>Permission:</strong> %s</p>
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
                escapeHtml(permission != null ? permission.name() : "VIEW"),
                escapeHtml(documentUrl),
                escapeHtml(receiver.getEmail()),
                escapeHtml(documentUrl),
                escapeHtml(documentUrl)
        );
    }

    private String buildFolderSharedHtml(
            User receiver,
            User owner,
            Folder folder,
            DocumentSharePermission permission,
            String folderUrl
    ) {
        String receiverName = isBlank(receiver.getFullName())
                ? receiver.getEmail()
                : receiver.getFullName();

        String ownerName = isBlank(owner.getFullName())
                ? owner.getEmail()
                : owner.getFullName();

        String folderName = isBlank(folder.getName())
                ? "Untitled folder"
                : folder.getName();

        return """
                <!doctype html>
                <html>
                <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
                    <p>Hello %s,</p>
                    <p><strong>%s</strong> has shared a folder with you on AI Study Hub.</p>
                    <p><strong>Folder:</strong> %s</p>
                    <p><strong>Permission:</strong> %s</p>
                    <p>
                        <a href="%s"
                           style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
                            Open folder
                        </a>
                    </p>
                    <p>
                        Please sign in with this email address to view the folder:
                        <strong>%s</strong>
                    </p>
                    <p>If the button does not work, copy and paste this link into your browser:</p>
                    <p><a href="%s">%s</a></p>
                </body>
                </html>
                """.formatted(
                escapeHtml(receiverName),
                escapeHtml(ownerName),
                escapeHtml(folderName),
                escapeHtml(permission != null ? permission.name() : "VIEW"),
                escapeHtml(folderUrl),
                escapeHtml(receiver.getEmail()),
                escapeHtml(folderUrl),
                escapeHtml(folderUrl)
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
