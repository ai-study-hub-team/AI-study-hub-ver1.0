package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.dto.response.AdminActiveUserResponse;
import com.aistudyhub.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

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
}
