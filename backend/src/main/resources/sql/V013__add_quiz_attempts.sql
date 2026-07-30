CREATE TABLE IF NOT EXISTS quiz_attempts (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL,
    correct_count INTEGER,
    total_questions INTEGER,
    score NUMERIC(5, 2),
    started_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user_started
    ON quiz_attempts (quiz_id, user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES quiz_questions(id),
    selected_option_id BIGINT NOT NULL REFERENCES quiz_options(id),
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_quiz_attempt_answer_question
        UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt
    ON quiz_attempt_answers (attempt_id);
