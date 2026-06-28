package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentStatus;
import com.aistudyhub.backend.entity.Favorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByUserIdAndDocumentId(Long userId, Long documentId);

    boolean existsByUserIdAndDocumentId(Long userId, Long documentId);

    Page<Favorite> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Modifying
    void deleteByUserIdAndDocumentId(Long userId, Long documentId);

    @Query("""
            select f.document.id
            from Favorite f
            where f.user.id = :userId
              and f.document.id in :documentIds
            """)
    Set<Long> findFavoriteDocumentIds(
            @Param("userId") Long userId,
            @Param("documentIds") Collection<Long> documentIds
    );

    @Query("""
            select f
            from Favorite f
            where f.user.id = :userId
              and f.document.status = :status
              and (
                    f.document.user.id = :userId
                 or upper(coalesce(f.document.tags, '')) = 'PUBLIC'
                 or upper(coalesce(f.document.tags, '')) like 'PUBLIC,%'
                 or upper(coalesce(f.document.tags, '')) like '%,PUBLIC,%'
                 or upper(coalesce(f.document.tags, '')) like '%,PUBLIC'
                 or exists (
                        select s.id
                        from DocumentShare s
                        where s.document.id = f.document.id
                          and s.sharedWith.id = :userId
                    )
              )
            order by f.createdAt desc
            """)
    Page<Favorite> findAccessibleByUserIdOrderByCreatedAtDesc(
            @Param("userId") Long userId,
            @Param("status") DocumentStatus status,
            Pageable pageable
    );
}
