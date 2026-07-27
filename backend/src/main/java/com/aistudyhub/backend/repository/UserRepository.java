package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.dto.response.AdminActiveUserResponse;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    List<User> findByRoleInAndStatus(Collection<UserRole> roles, UserStatus status);

    @Query("""
            SELECT new com.aistudyhub.backend.dto.response.AdminActiveUserResponse(
                u.id,
                u.fullName,
                u.email,
                u.role,
                u.status,
                u.createdAt,
                u.updatedAt,
                COALESCE(u.totalStorageUsedBytes, 0)
            )
            FROM User u
            WHERE u.status = com.aistudyhub.backend.enums.UserStatus.ACTIVE
            ORDER BY u.createdAt DESC
            """)
    List<AdminActiveUserResponse> findActiveUserResponses();
    long countByRoleAndStatus(UserRole role, UserStatus status);
    List<User> findByRoleAndStatus(UserRole role, UserStatus status);

    @Query("""
            select u
            from User u
            where (:keyword is null
                   or lower(u.email) like lower(concat('%', :keyword, '%'))
                   or lower(u.fullName) like lower(concat('%', :keyword, '%')))
              and (:role is null or u.role = :role)
              and (:status is null or u.status = :status)
              and (:fromDate is null or u.lastActiveAt >= :fromDate or u.lastLoginAt >= :fromDate)
              and (:toDate is null or u.lastActiveAt <= :toDate or u.lastLoginAt <= :toDate)
            """)
    Page<User> searchRecentUsers(
            @Param("keyword") String keyword,
            @Param("role") UserRole role,
            @Param("status") UserStatus status,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );

    // ─── Atomic quota mutations ────────────────────────────────────────────────
    //
    // These JPQL bulk updates bypass the JPA first-level cache.
    // @Modifying(clearAutomatically = true, flushAutomatically = true) is set on every
    // mutation to ensure any managed User entity in the current session is invalidated
    // and must be re-fetched before use. Do NOT call userRepository.save(user) to change
    // totalStorageUsedBytes; always go through these methods.

    /**
     * Atomically adds {@code bytes} to the user's storage counter IF the result
     * would not exceed {@code quotaLimitBytes}.
     *
     * <p>Implements the atomic pattern:
     * <pre>
     * UPDATE users
     * SET    total_storage_used_bytes = total_storage_used_bytes + :bytes
     * WHERE  id = :userId
     *   AND  (total_storage_used_bytes + :bytes) <= :quotaLimitBytes
     * </pre>
     *
     * @return 1 if the update was applied; 0 if the user would exceed quota.
     *         A return value of 0 must be treated as a hard failure — the caller
     *         must throw {@code StorageCapacityException} without writing any file.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE User u
            SET u.totalStorageUsedBytes = COALESCE(u.totalStorageUsedBytes, 0) + :bytes
            WHERE u.id = :userId
              AND (COALESCE(u.totalStorageUsedBytes, 0) + :bytes) <= :quotaLimitBytes
            """)
    int atomicAddStorageIfWithinQuota(
            @Param("userId") Long userId,
            @Param("bytes") long bytes,
            @Param("quotaLimitBytes") long quotaLimitBytes
    );

    /**
     * Atomically adds {@code bytes} to the user's storage counter unconditionally.
     * Used by legacy direct-upload paths that validate quota separately.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE User u
            SET u.totalStorageUsedBytes = COALESCE(u.totalStorageUsedBytes, 0) + :bytes
            WHERE u.id = :userId
            """)
    int atomicAddStorage(
            @Param("userId") Long userId,
            @Param("bytes") long bytes
    );

    /**
     * Atomically subtracts {@code bytes} from the user's storage counter.
     * Never goes below zero (GREATEST(0, current - bytes) semantics via native SQL).
     *
     * <p>Idempotent: calling this multiple times is safe because the result cannot
     * go negative.  The caller must separately guard against releasing quota
     * more than once using {@code quotaReleasedAt}.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        value = """
            UPDATE users
            SET total_storage_used_bytes = GREATEST(0, COALESCE(total_storage_used_bytes, 0) - :bytes)
            WHERE id = :userId
            """,
        nativeQuery = true
    )
    int atomicSubtractStorage(
            @Param("userId") Long userId,
            @Param("bytes") long bytes
    );
}
