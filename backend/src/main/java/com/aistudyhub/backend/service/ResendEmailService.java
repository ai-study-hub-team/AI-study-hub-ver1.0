package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.ResendProperties;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.Folder;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.EmailNotificationLog;
import com.aistudyhub.backend.entity.EmailNotificationStatus;
import com.aistudyhub.backend.entity.EmailNotificationType;
import com.aistudyhub.backend.repository.EmailNotificationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;


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
    private static final String EMAIL_VERIFICATION_SUBJECT = "Verify your AI Study Hub email";
    private static final DateTimeFormatter EMAIL_DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private final EmailNotificationLogRepository emailNotificationLogRepository;

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

    public void sendEmailVerificationEmail(
            User user,
            String verificationToken,
            LocalDateTime expiredAt
    ) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("Skip sending verification email because user email is missing");
            return;
        }

        if (isBlank(verificationToken)) {
            log.warn("Skip sending verification email because token is missing");
            return;
        }

        if (isBlank(resendProperties.getApiKey())) {
            log.warn("Skip sending verification email because RESEND_API_KEY is not configured");
            return;
        }

        if (isBlank(resendProperties.getFromEmail())) {
            log.warn("Skip sending verification email because resend.from-email is not configured");
            return;
        }

        String verificationUrl = buildVerificationUrl(verificationToken);
        String html = buildEmailVerificationHtml(user, verificationUrl, expiredAt);

        Map<String, Object> body = new HashMap<>();
        body.put("from", resendProperties.getFromEmail());
        body.put("to", List.of(user.getEmail()));
        body.put("subject", EMAIL_VERIFICATION_SUBJECT);
        body.put("html", html);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(resendProperties.getApiKey());
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> requestEntity =
                new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(
                    RESEND_EMAIL_API_URL,
                    requestEntity,
                    String.class
            );

            log.info(
                    "Verification email sent. userId={}, email={}",
                    user.getId(),
                    user.getEmail()
            );
        } catch (RestClientException ex) {
            log.warn(
                    "Failed to send verification email. userId={}, email={}",
                    user.getId(),
                    user.getEmail(),
                    ex
            );
            throw ex;
        }
    }

    private String buildVerificationUrl(String token) {
        String frontendUrl = resendProperties.getFrontendUrl();

        if (isBlank(frontendUrl)) {
            frontendUrl = "http://localhost:5173";
        }

        return trimTrailingSlash(frontendUrl)
                + "/verify-email?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    private String buildEmailVerificationHtml(
            User user,
            String verificationUrl,
            LocalDateTime expiredAt
    ) {
        String name = isBlank(user.getFullName())
                ? user.getEmail()
                : user.getFullName();

        String expiresAtText = expiredAt == null
                ? "the configured expiry time"
                : expiredAt.format(EMAIL_DATE_TIME_FORMAT);

        return """
                <!doctype html>
                <html>
                <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
                    <p>Hello %s,</p>
                    <p>Welcome to <strong>AI Study Hub</strong>. Please verify your email address to finish creating your account.</p>
                    <p>
                        <a href="%s"
                           style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
                            Verify email
                        </a>
                    </p>
                    <p>This verification link expires at <strong>%s</strong>.</p>
                    <p>If the button does not work, copy and paste this link into your browser:</p>
                    <p><a href="%s">%s</a></p>
                    <p>If you did not register for AI Study Hub, you can safely ignore this email.</p>
                </body>
                </html>
                """.formatted(
                escapeHtml(name),
                escapeHtml(verificationUrl),
                escapeHtml(expiresAtText),
                escapeHtml(verificationUrl),
                escapeHtml(verificationUrl)
        );
    }

    private void logEmail(
            String receiverEmail,
            String subject,
            EmailNotificationType type,
            EmailNotificationStatus status,
            String errorMessage
    ) {
        try {
            emailNotificationLogRepository.save(EmailNotificationLog.builder()
                    .receiverEmail(receiverEmail)
                    .subject(subject)
                    .type(type)
                    .status(status)
                    .errorMessage(errorMessage)
                    .sentAt(status == EmailNotificationStatus.SENT ? LocalDateTime.now() : null)
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to save email notification log", ex);
        }
    }

    public void sendPaymentResultEmail(
            User receiver,
            String planName,
            String amountText,
            String durationText,
            boolean success
    ) {
        String subject = success
                ? "Payment successful on AI Study Hub"
                : "Payment failed on AI Study Hub";

        EmailNotificationType type = success
                ? EmailNotificationType.PAYMENT_SUCCESS
                : EmailNotificationType.PAYMENT_FAILED;

        String html = """
                <!doctype html>
                <html><body style="font-family: Arial, sans-serif;">
                    <p>Hello %s,</p>
                    <p>Your payment status: <strong>%s</strong></p>
                    <p><strong>Plan:</strong> %s</p>
                    <p><strong>Amount:</strong> %s</p>
                    <p><strong>Duration:</strong> %s</p>
                </body></html>
                """.formatted(
                escapeHtml(receiver.getFullName()),
                success ? "SUCCESS" : "FAILED",
                escapeHtml(planName),
                escapeHtml(amountText),
                escapeHtml(durationText)
        );

        sendRawHtmlEmail(receiver.getEmail(), subject, html, type);
    }

    public void sendSubscriptionExpiryEmail(
            User receiver,
            String planName,
            LocalDateTime endDate,
            boolean expired
    ) {
        String subject = expired
                ? "Your AI Study Hub subscription has expired"
                : "Your AI Study Hub subscription expires in 7 days";

        EmailNotificationType type = expired
                ? EmailNotificationType.SUBSCRIPTION_EXPIRED
                : EmailNotificationType.SUBSCRIPTION_EXPIRING_7_DAYS;

        String html = """
                <!doctype html>
                <html><body style="font-family: Arial, sans-serif;">
                    <p>Hello %s,</p>
                    <p>Your plan <strong>%s</strong> %s.</p>
                    <p><strong>End date:</strong> %s</p>
                </body></html>
                """.formatted(
                escapeHtml(receiver.getFullName()),
                escapeHtml(planName),
                expired ? "has expired" : "will expire soon",
                escapeHtml(endDate != null ? endDate.toString() : "")
        );

        sendRawHtmlEmail(receiver.getEmail(), subject, html, type);
    }

    private void sendRawHtmlEmail(
            String receiverEmail,
            String subject,
            String html,
            EmailNotificationType type
    ) {
        if (isBlank(resendProperties.getApiKey()) || isBlank(resendProperties.getFromEmail())) {
            logEmail(receiverEmail, subject, type, EmailNotificationStatus.SKIPPED, "Email provider is not configured");
            return;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("from", resendProperties.getFromEmail());
        body.put("to", List.of(receiverEmail));
        body.put("subject", subject);
        body.put("html", html);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(resendProperties.getApiKey());
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            restTemplate.postForEntity(
                    RESEND_EMAIL_API_URL,
                    new HttpEntity<>(body, headers),
                    String.class
            );
            logEmail(receiverEmail, subject, type, EmailNotificationStatus.SENT, null);
        } catch (RestClientException ex) {
            logEmail(receiverEmail, subject, type, EmailNotificationStatus.FAILED, ex.getMessage());
            log.warn("Failed to send email. receiverEmail={}, subject={}", receiverEmail, subject, ex);
        }
    }

}
