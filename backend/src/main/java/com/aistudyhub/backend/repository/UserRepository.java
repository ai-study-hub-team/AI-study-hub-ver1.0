package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.dto.response.AdminActiveUserResponse;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

}
