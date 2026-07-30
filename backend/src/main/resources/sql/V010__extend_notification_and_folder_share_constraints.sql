-- Extend Hibernate-generated PostgreSQL CHECK constraints for new backend enums.
-- Hibernate ddl-auto=update does not reliably widen existing enum CHECK constraints.

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'AI_PROCESSING_COMPLETED',
            'DOCUMENT_REPORTED',
            'REPORT_RESOLVED',
            'PAYMENT_SUCCESS',
            'PAYMENT_FAILED',
            'SUBSCRIPTION_EXPIRING_7_DAYS',
            'SUBSCRIPTION_EXPIRED',
            'DOCUMENT_SHARED',
            'FOLDER_SHARED',
            'DOCUMENT_SHARE_SENT',
            'DOCUMENT_SHARE_REVOKED_BY_OWNER',
            'DOCUMENT_ACCESS_REVOKED',
            'DOCUMENT_SHARE_EXPIRED_OWNER',
            'DOCUMENT_SHARE_EXPIRED_RECEIVER',
            'FOLDER_SHARE_SENT',
            'FOLDER_SHARE_REVOKED_BY_OWNER',
            'FOLDER_ACCESS_REVOKED',
            'FOLDER_SHARE_EXPIRED_OWNER',
            'FOLDER_SHARE_EXPIRED_RECEIVER',
            'UPLOAD_LINK_CREATED',
            'UPLOAD_LINK_ACCESS_GRANTED',
            'UPLOAD_LINK_USER_ADDED',
            'UPLOAD_LINK_USER_REMOVED',
            'UPLOAD_LINK_ACCESS_REMOVED',
            'UPLOAD_LINK_REVOKED_OWNER',
            'UPLOAD_LINK_REVOKED_RECEIVER',
            'UPLOAD_LINK_EXPIRED_OWNER',
            'UPLOAD_LINK_EXPIRED_RECEIVER',
            'SHARED_UPLOAD_SUBMITTED_RECEIVER',
            'SHARED_UPLOAD_SUBMITTED_OWNER',
            'SHARED_UPLOAD_APPROVED',
            'SHARED_UPLOAD_REJECTED'
        )
    );

ALTER TABLE folder_shares
    DROP CONSTRAINT IF EXISTS folder_shares_status_check;

ALTER TABLE folder_shares
    ADD CONSTRAINT folder_shares_status_check CHECK (
        status IN ('ACTIVE', 'REVOKED', 'EXPIRED')
    );
