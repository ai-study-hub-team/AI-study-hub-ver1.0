CREATE DATABASE IF NOT EXISTS ai_study_hub_fe_erd
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE ai_study_hub_fe_erd;

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  avatar_url VARCHAR(500),
  role VARCHAR(50) NOT NULL DEFAULT 'USER',
  account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  auth_type VARCHAR(50) NOT NULL DEFAULT 'LOCAL',
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS oauth_accounts (
  oauth_account_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (oauth_account_id),
  KEY idx_oauth_user_id (user_id),
  UNIQUE KEY uk_oauth_provider_user (provider, provider_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  reset_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expired_at DATETIME(6) NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  used_at DATETIME(6),
  PRIMARY KEY (reset_id),
  UNIQUE KEY uk_password_resets_token (token),
  KEY idx_password_resets_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verifications (
  verification_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expired_at DATETIME(6) NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  used_at DATETIME(6),
  PRIMARY KEY (verification_id),
  UNIQUE KEY uk_email_verifications_token (token),
  KEY idx_email_verifications_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  category_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (category_id),
  KEY idx_categories_user_id (user_id),
  KEY idx_categories_name (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_upload_links (
  upload_link_id BIGINT NOT NULL AUTO_INCREMENT,
  owner_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL,
  link_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (upload_link_id),
  UNIQUE KEY uk_user_upload_links_token (token),
  KEY idx_user_upload_links_owner_id (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  document_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  category_id BIGINT,
  upload_link_id BIGINT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(100),
  visibility VARCHAR(50) NOT NULL DEFAULT 'PRIVATE',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (document_id),
  KEY idx_documents_user_id (user_id),
  KEY idx_documents_category_id (category_id),
  KEY idx_documents_upload_link_id (upload_link_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cloud_files (
  cloud_file_id BIGINT NOT NULL AUTO_INCREMENT,
  document_id BIGINT NOT NULL,
  file_name VARCHAR(255),
  file_url VARCHAR(500),
  file_type VARCHAR(100),
  file_size BIGINT,
  storage_provider VARCHAR(100),
  uploaded_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (cloud_file_id),
  KEY idx_cloud_files_document_id (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_chunks (
  chunk_id BIGINT NOT NULL AUTO_INCREMENT,
  document_id BIGINT NOT NULL,
  chunk_index INT NOT NULL,
  chunk_text LONGTEXT NOT NULL,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (chunk_id),
  KEY idx_document_chunks_document_id (document_id),
  KEY idx_document_chunks_document_chunk (document_id, chunk_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_sessions (
  chat_session_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  document_id BIGINT,
  title VARCHAR(255),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (chat_session_id),
  KEY idx_chat_sessions_user_id (user_id),
  KEY idx_chat_sessions_document_id (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  chat_message_id BIGINT NOT NULL AUTO_INCREMENT,
  chat_session_id BIGINT NOT NULL,
  sender_type VARCHAR(50) NOT NULL,
  message_content LONGTEXT NOT NULL,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (chat_message_id),
  KEY idx_chat_messages_chat_session_id (chat_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_citations (
  citation_id BIGINT NOT NULL AUTO_INCREMENT,
  chat_message_id BIGINT NOT NULL,
  chunk_id BIGINT NOT NULL,
  similarity_score DECIMAL(8,6),
  citation_order INT,
  PRIMARY KEY (citation_id),
  KEY idx_ai_citations_chat_message_id (chat_message_id),
  KEY idx_ai_citations_chunk_id (chunk_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_preferences (
  preference_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  preferred_name VARCHAR(255),
  communication_style VARCHAR(100),
  language_preference VARCHAR(50),
  personal_note TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (preference_id),
  KEY idx_chatbot_preferences_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_notes (
  note_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  note_title VARCHAR(255),
  note_content TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (note_id),
  KEY idx_document_notes_user_id (user_id),
  KEY idx_document_notes_document_id (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorite_documents (
  favorite_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (favorite_id),
  UNIQUE KEY uk_favorite_documents_user_document (user_id, document_id),
  KEY idx_favorite_documents_document_id (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS view_histories (
  view_history_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  viewed_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  last_viewed_page_no INT,
  PRIMARY KEY (view_history_id),
  KEY idx_view_histories_user_id (user_id),
  KEY idx_view_histories_document_id (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_shares (
  share_id BIGINT NOT NULL AUTO_INCREMENT,
  document_id BIGINT NOT NULL,
  shared_by_user_id BIGINT NOT NULL,
  shared_with_user_id BIGINT,
  share_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  shared_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (share_id),
  KEY idx_document_shares_document_id (document_id),
  KEY idx_document_shares_shared_by (shared_by_user_id),
  KEY idx_document_shares_shared_with (shared_with_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  related_document_id BIGINT,
  related_report_id BIGINT,
  notification_type VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (notification_id),
  KEY idx_notifications_user_id (user_id),
  KEY idx_notifications_related_document_id (related_document_id),
  KEY idx_notifications_related_report_id (related_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  report_id BIGINT NOT NULL AUTO_INCREMENT,
  document_id BIGINT NOT NULL,
  reporter_id BIGINT NOT NULL,
  processed_by_admin_id BIGINT,
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  report_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  admin_action VARCHAR(100),
  admin_note TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  processed_at DATETIME(6),
  PRIMARY KEY (report_id),
  KEY idx_reports_document_id (document_id),
  KEY idx_reports_reporter_id (reporter_id),
  KEY idx_reports_processed_by_admin_id (processed_by_admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id BIGINT NOT NULL AUTO_INCREMENT,
  plan_name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_days INT,
  max_storage_mb BIGINT,
  max_upload_size_mb BIGINT,
  max_ai_questions_per_day INT,
  max_documents INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  subscription_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  plan_id BIGINT NOT NULL,
  start_date DATETIME(6) NOT NULL,
  end_date DATETIME(6),
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (subscription_id),
  KEY idx_user_subscriptions_user_id (user_id),
  KEY idx_user_subscriptions_plan_id (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT NOT NULL AUTO_INCREMENT,
  subscription_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  payment_method VARCHAR(100),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  transaction_code VARCHAR(255),
  paid_at DATETIME(6),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (payment_id),
  KEY idx_payments_subscription_id (subscription_id),
  KEY idx_payments_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usage_trackers (
  usage_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  subscription_id BIGINT,
  tracked_date DATE NOT NULL,
  ai_question_count INT NOT NULL DEFAULT 0,
  uploaded_document_count INT NOT NULL DEFAULT 0,
  storage_used_mb BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (usage_id),
  UNIQUE KEY uk_usage_user_date (user_id, tracked_date),
  KEY idx_usage_subscription_id (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- SAMPLE DATA FOR FRONTEND TESTING
-- =========================

INSERT INTO users (full_name, email, password_hash, avatar_url, role, account_status, auth_type)
VALUES
('Nguyen Van A', 'vana@gmail.com', '$2a$10$fakehash', 'https://i.pravatar.cc/150?img=1', 'USER', 'ACTIVE', 'LOCAL'),
('Tran Thi B', 'thib@gmail.com', '$2a$10$fakehash', 'https://i.pravatar.cc/150?img=2', 'ADMIN', 'ACTIVE', 'LOCAL'),
('Le Minh C', 'minhc@gmail.com', '$2a$10$fakehash', 'https://i.pravatar.cc/150?img=3', 'USER', 'ACTIVE', 'GOOGLE');

INSERT INTO categories (user_id, category_name, description)
VALUES
(1, 'Programming', 'Tài liệu lập trình Java, React, Spring Boot'),
(1, 'Database', 'Tài liệu MySQL, SQL, ERD, database design'),
(1, 'Business Analysis', 'Tài liệu SRS, Use Case, DFD, Requirement'),
(1, 'English', 'Tài liệu học tiếng Anh'),
(3, 'AI Study', 'Tài liệu học AI, RAG, chatbot');

INSERT INTO user_upload_links (owner_id, token, link_url, is_active)
VALUES
(1, 'upload-token-001', 'https://fake-upload-link.com/u/upload-token-001', TRUE),
(3, 'upload-token-002', 'https://fake-upload-link.com/u/upload-token-002', TRUE);

INSERT INTO documents (user_id, category_id, upload_link_id, title, description, document_type, visibility, is_deleted)
VALUES
(1, 1, 1, 'Spring Boot Basic Guide', 'Tài liệu nhập môn Spring Boot', 'PDF', 'PUBLIC', FALSE),
(1, 2, 1, 'MySQL ERD Design', 'Tài liệu thiết kế ERD và database', 'DOCX', 'PRIVATE', FALSE),
(1, 3, NULL, 'SRS Template AI Study Hub', 'Tài liệu đặc tả yêu cầu phần mềm', 'PDF', 'PUBLIC', FALSE),
(3, 5, 2, 'RAG Chatbot Overview', 'Tài liệu tổng quan Retrieval Augmented Generation', 'PPTX', 'PUBLIC', FALSE);

INSERT INTO cloud_files (document_id, file_name, file_url, file_type, file_size, storage_provider)
VALUES
(1, 'spring_boot_basic.pdf', 'https://fake-storage.com/files/spring_boot_basic.pdf', 'PDF', 2048000, 'Firebase'),
(2, 'mysql_erd_design.docx', 'https://fake-storage.com/files/mysql_erd_design.docx', 'DOCX', 1048000, 'Firebase'),
(3, 'srs_template_ai_study_hub.pdf', 'https://fake-storage.com/files/srs_template_ai_study_hub.pdf', 'PDF', 3072000, 'Firebase'),
(4, 'rag_chatbot_overview.pptx', 'https://fake-storage.com/files/rag_chatbot_overview.pptx', 'PPTX', 5096000, 'Firebase');

INSERT INTO document_chunks (document_id, chunk_index, chunk_text)
VALUES
(1, 1, 'Spring Boot là framework Java giúp xây dựng backend nhanh chóng.'),
(1, 2, 'Controller nhận request từ frontend và trả response về client.'),
(2, 1, 'ERD dùng để mô tả các entity và quan hệ trong database.'),
(3, 1, 'SRS là tài liệu đặc tả yêu cầu phần mềm.'),
(4, 1, 'RAG kết hợp retrieval và generation để chatbot trả lời theo tài liệu.');

INSERT INTO chat_sessions (user_id, document_id, title)
VALUES
(1, 1, 'Hỏi đáp Spring Boot'),
(1, 3, 'Hỏi đáp SRS'),
(3, 4, 'Hỏi đáp RAG');

INSERT INTO chat_messages (chat_session_id, sender_type, message_content)
VALUES
(1, 'USER', 'Spring Boot là gì?'),
(1, 'ASSISTANT', 'Spring Boot là framework giúp xây dựng ứng dụng Java backend nhanh hơn.'),
(2, 'USER', 'SRS dùng để làm gì?'),
(2, 'ASSISTANT', 'SRS dùng để mô tả đầy đủ yêu cầu của hệ thống phần mềm.'),
(3, 'USER', 'RAG là gì?'),
(3, 'ASSISTANT', 'RAG là kỹ thuật giúp AI trả lời dựa trên tài liệu được truy xuất.');

INSERT INTO ai_citations (chat_message_id, chunk_id, similarity_score, citation_order)
VALUES
(2, 1, 0.912345, 1),
(4, 4, 0.884321, 1),
(6, 5, 0.934567, 1);

INSERT INTO chatbot_preferences (user_id, preferred_name, communication_style, language_preference, personal_note)
VALUES
(1, 'An', 'Friendly', 'vi', 'Thích giải thích dễ hiểu, có ví dụ.'),
(3, 'Minh', 'Detailed', 'vi', 'Ưu tiên giải thích kỹ thuật.');

INSERT INTO document_notes (user_id, document_id, note_title, note_content)
VALUES
(1, 1, 'Ghi chú Spring Boot', 'Cần học Controller, Service, Repository.'),
(1, 3, 'Ghi chú SRS', 'Chú ý phần Use Case Description.'),
(3, 4, 'Ghi chú RAG', 'RAG cần chunking, embedding, retrieval.');

INSERT INTO favorite_documents (user_id, document_id)
VALUES
(1, 1),
(1, 3),
(3, 4);

INSERT INTO view_histories (user_id, document_id, last_viewed_page_no)
VALUES
(1, 1, 5),
(1, 2, 2),
(1, 3, 10),
(3, 4, 7);

INSERT INTO document_shares (document_id, shared_by_user_id, shared_with_user_id, share_status)
VALUES
(1, 1, 3, 'ACCEPTED'),
(3, 1, 3, 'PENDING');

INSERT INTO reports (document_id, reporter_id, processed_by_admin_id, reason, description, report_status, admin_action, admin_note)
VALUES
(1, 3, 2, 'Duplicate content', 'Tài liệu có nội dung trùng lặp.', 'RESOLVED', 'WARNING', 'Đã kiểm tra và cảnh báo người đăng.'),
(4, 1, NULL, 'Wrong category', 'Tài liệu AI nhưng phân loại chưa đúng.', 'PENDING', NULL, NULL);

INSERT INTO notifications (user_id, related_document_id, related_report_id, notification_type, title, message, is_read)
VALUES
(1, 1, NULL, 'DOCUMENT', 'Tài liệu được xem nhiều', 'Tài liệu Spring Boot Basic Guide đang có nhiều lượt xem.', FALSE),
(3, 1, NULL, 'SHARE', 'Bạn được chia sẻ tài liệu', 'Nguyen Van A đã chia sẻ tài liệu Spring Boot cho bạn.', FALSE),
(1, 4, 2, 'REPORT', 'Báo cáo đang chờ xử lý', 'Báo cáo tài liệu RAG Chatbot Overview đang chờ admin xử lý.', TRUE);

INSERT INTO subscription_plans (plan_name, description, price, duration_days, max_storage_mb, max_upload_size_mb, max_ai_questions_per_day, max_documents, is_active)
VALUES
('FREE', 'Gói miễn phí cho người dùng cơ bản', 0.00, NULL, 500, 20, 10, 20, TRUE),
('PRO MONTHLY', 'Gói Pro theo tháng', 99000.00, 30, 10240, 200, 200, 1000, TRUE),
('PRO YEARLY', 'Gói Pro theo năm', 999000.00, 365, 51200, 500, 1000, 5000, TRUE);

INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, subscription_status, auto_renew)
VALUES
(1, 2, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'ACTIVE', TRUE),
(3, 1, NOW(), NULL, 'ACTIVE', FALSE);

INSERT INTO payments (subscription_id, user_id, amount, currency, payment_method, payment_status, transaction_code, paid_at)
VALUES
(1, 1, 99000.00, 'VND', 'VNPay', 'SUCCESS', 'TXN_FAKE_001', NOW());

INSERT INTO usage_trackers (user_id, subscription_id, tracked_date, ai_question_count, uploaded_document_count, storage_used_mb)
VALUES
(1, 1, CURDATE(), 12, 4, 350),
(3, 2, CURDATE(), 5, 2, 120);ai_citations