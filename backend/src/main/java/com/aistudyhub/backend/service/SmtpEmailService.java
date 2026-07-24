package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.MailProperties;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.EmailNotificationLog;
import com.aistudyhub.backend.entity.EmailNotificationStatus;
import com.aistudyhub.backend.entity.EmailNotificationType;
import com.aistudyhub.backend.entity.Folder;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.repository.EmailNotificationLogRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmtpEmailService {

    private static final String DOCUMENT_SHARED_SUBJECT = "A document has been shared with you";
    private static final String FOLDER_SHARED_SUBJECT = "A folder has been shared with you";
    private static final String EMAIL_VERIFICATION_SUBJECT = "Verify your AI Study Hub email";
    private static final String PASSWORD_RESET_SUBJECT = "Reset your AI Study Hub password";
    private static final DateTimeFormatter EMAIL_DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final EmailNotificationLogRepository emailNotificationLogRepository;
    private final MailProperties mailProperties;
    private final JavaMailSender mailSender;

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
        if (receiver == null || isBlank(receiver.getEmail())) {
            log.warn("Skip sending share email because receiver email is missing");
            return;
        }

        if (owner == null || document == null) {
            log.warn("Skip sending share email because owner or document is missing");
            return;
        }

        String documentUrl = buildDocumentUrl(document.getId());
        String html = buildDocumentSharedHtml(receiver, owner, document, permission, documentUrl);

        sendHtmlEmail(
                receiver.getEmail(),
                DOCUMENT_SHARED_SUBJECT,
                html,
                EmailNotificationType.DOCUMENT_SHARED,
                true
        );

        log.info(
                "Share email sent. documentId={}, receiverEmail={}",
                document.getId(),
                receiver.getEmail()
        );
    }

    public void sendFolderSharedEmail(
            User receiver,
            User owner,
            Folder folder,
            DocumentSharePermission permission
    ) {
        if (receiver == null || isBlank(receiver.getEmail())) {
            log.warn("Skip sending folder share email because receiver email is missing");
            return;
        }

        if (owner == null || folder == null) {
            log.warn("Skip sending folder share email because owner or folder is missing");
            return;
        }

        String folderUrl = buildFolderUrl(folder.getId());
        String html = buildFolderSharedHtml(receiver, owner, folder, permission, folderUrl);

        sendHtmlEmail(
                receiver.getEmail(),
                FOLDER_SHARED_SUBJECT,
                html,
                EmailNotificationType.FOLDER_SHARED,
                true
        );

        log.info(
                "Folder share email sent. folderId={}, receiverEmail={}",
                folder.getId(),
                receiver.getEmail()
        );
    }

    public void sendEmailVerificationEmail(
            User user,
            String verificationToken,
            LocalDateTime expiredAt
    ) {
        if (user == null || isBlank(user.getEmail())) {
            log.warn("Skip sending verification email because user email is missing");
            return;
        }

        if (isBlank(verificationToken)) {
            log.warn("Skip sending verification email because token is missing");
            return;
        }

        String verificationUrl = buildVerificationUrl(verificationToken);
        String html = buildEmailVerificationHtml(user, verificationUrl, expiredAt);

        sendHtmlEmail(
                user.getEmail(),
                EMAIL_VERIFICATION_SUBJECT,
                html,
                EmailNotificationType.EMAIL_VERIFICATION,
                true
        );

        log.info(
                "Verification email sent. userId={}, email={}",
                user.getId(),
                user.getEmail()
        );
    }

    public void sendPaymentResultEmail(
            User receiver,
            String planName,
            String amountText,
            String durationText,
            boolean success
    ) {
        if (receiver == null || isBlank(receiver.getEmail())) {
            log.warn("Skip sending payment email because receiver email is missing");
            return;
        }

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
                escapeHtml(getDisplayName(receiver)),
                success ? "SUCCESS" : "FAILED",
                escapeHtml(planName),
                escapeHtml(amountText),
                escapeHtml(durationText)
        );

        sendHtmlEmail(receiver.getEmail(), subject, html, type, false);
    }

    public void sendSubscriptionExpiryEmail(
            User receiver,
            String planName,
            LocalDateTime endDate,
            boolean expired
    ) {
        if (receiver == null || isBlank(receiver.getEmail())) {
            log.warn("Skip sending subscription email because receiver email is missing");
            return;
        }

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
                escapeHtml(getDisplayName(receiver)),
                escapeHtml(planName),
                expired ? "has expired" : "will expire soon",
                escapeHtml(endDate != null ? endDate.toString() : "")
        );

        sendHtmlEmail(receiver.getEmail(), subject, html, type, false);
    }

    public void sendPasswordResetEmail(
            User user,
            String resetToken,
            LocalDateTime expiredAt
    ) {
        if (user == null || isBlank(user.getEmail())) {
            log.warn("Skip sending password reset email because user email is missing");
            return;
        }

        if (isBlank(resetToken)) {
            log.warn("Skip sending password reset email because token is missing");
            return;
        }

        String resetUrl = buildPasswordResetUrl(resetToken);
        String html = buildPasswordResetHtml(user, resetUrl, expiredAt);

        sendHtmlEmail(user.getEmail(), PASSWORD_RESET_SUBJECT, html, null, true);

        log.info(
                "Password reset email sent. userId={}, email={}",
                user.getId(),
                user.getEmail()
        );
    }

    private void sendHtmlEmail(
            String receiverEmail,
            String subject,
            String html,
            EmailNotificationType type,
            boolean rethrowOnFailure
    ) {
        if (isBlank(receiverEmail) || isBlank(mailProperties.getFromEmail())) {
            logEmail(receiverEmail, subject, type, EmailNotificationStatus.SKIPPED, "SMTP sender is not configured");
            log.warn("Skip sending email because receiver or from email is missing");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(mailProperties.getFromEmail());
            helper.setTo(receiverEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            logEmail(receiverEmail, subject, type, EmailNotificationStatus.SENT, null);
        } catch (MessagingException | MailException ex) {
            logEmail(receiverEmail, subject, type, EmailNotificationStatus.FAILED, ex.getMessage());
            log.warn("Failed to send SMTP email. receiverEmail={}, subject={}", receiverEmail, subject, ex);

            if (rethrowOnFailure) {
                throw new IllegalStateException("Failed to send email", ex);
            }
        }
    }

    private String buildDocumentUrl(Long documentId) {
        return getFrontendUrl() + "/app/library/" + documentId + "/preview";
    }

    private String buildFolderUrl(Long folderId) {
        return getFrontendUrl() + "/app/folders/" + folderId;
    }

    private String buildVerificationUrl(String token) {
        return getFrontendUrl()
                + "/verify-email?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    private String buildPasswordResetUrl(String token) {
        return getFrontendUrl()
                + "/reset-password?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    private String getFrontendUrl() {
        String frontendUrl = mailProperties.getFrontendUrl();

        if (isBlank(frontendUrl)) {
            frontendUrl = "http://localhost:5173";
        }

        return trimTrailingSlash(frontendUrl);
    }

    private String buildDocumentSharedHtml(
            User receiver,
            User owner,
            Document document,
            DocumentSharePermission permission,
            String documentUrl
    ) {
        String receiverName = getDisplayName(receiver);
        String ownerName = getDisplayName(owner);
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
        String receiverName = getDisplayName(receiver);
        String ownerName = getDisplayName(owner);
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

    private String buildEmailVerificationHtml(
            User user,
            String verificationUrl,
            LocalDateTime expiredAt
    ) {
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
                escapeHtml(getDisplayName(user)),
                escapeHtml(verificationUrl),
                escapeHtml(expiresAtText),
                escapeHtml(verificationUrl),
                escapeHtml(verificationUrl)
        );
    }

    private String buildPasswordResetHtml(
            User user,
            String resetUrl,
            LocalDateTime expiredAt
    ) {
        String expiresAtText = expiredAt == null
                ? "the configured expiry time"
                : expiredAt.format(EMAIL_DATE_TIME_FORMAT);

        return """
                <!doctype html>
                <html>
                <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
                    <p>Hello %s,</p>
                    <p>We received a request to reset your <strong>AI Study Hub</strong> password.</p>
                    <p>
                        <a href="%s"
                           style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
                            Reset password
                        </a>
                    </p>
                    <p>This password reset link expires at <strong>%s</strong>.</p>
                    <p>If the button does not work, copy and paste this link into your browser:</p>
                    <p><a href="%s">%s</a></p>
                    <p>If you did not request a password reset, you can safely ignore this email.</p>
                </body>
                </html>
                """.formatted(
                escapeHtml(getDisplayName(user)),
                escapeHtml(resetUrl),
                escapeHtml(expiresAtText),
                escapeHtml(resetUrl),
                escapeHtml(resetUrl)
        );
    }

    private void logEmail(
            String receiverEmail,
            String subject,
            EmailNotificationType type,
            EmailNotificationStatus status,
            String errorMessage
    ) {
        if (type == null) {
            return;
        }

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

    private String getDisplayName(User user) {
        if (user == null) {
            return "";
        }

        return isBlank(user.getFullName()) ? user.getEmail() : user.getFullName();
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
