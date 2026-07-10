
package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.EmailVerificationToken;
import com.aistudyhub.backend.entity.EmailVerificationTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByToken(String token);

    Optional<EmailVerificationToken> findTopByUserIdAndTokenTypeOrderByCreatedAtDescIdDesc(
            Long userId,
            EmailVerificationTokenType tokenType
    );

    @Modifying
    @Query("""
            UPDATE EmailVerificationToken token
            SET token.used = true,
                token.usedAt = :usedAt,
                token.updatedAt = :usedAt
            WHERE token.user.id = :userId
              AND token.tokenType = :tokenType
              AND token.used = false
            """)
    int markUnusedTokensAsUsed(
            @Param("userId") Long userId,
            @Param("tokenType") EmailVerificationTokenType tokenType,
            @Param("usedAt") LocalDateTime usedAt
    );
}

