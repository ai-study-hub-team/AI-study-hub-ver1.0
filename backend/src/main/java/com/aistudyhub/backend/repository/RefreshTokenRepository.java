package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    List<RefreshToken> findByUserIdAndRevokedFalse(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select rt from RefreshToken rt " +
            "join fetch rt.user where rt.token = :token")
    Optional<RefreshToken> findByTokenForUpdate(
            @Param("token") String token
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update RefreshToken rt set rt.revoked = true " +
            "where rt.user.id = :userId and rt.revoked = false")
    int revokeAllActiveByUserId(@Param("userId") Long userId);
}
