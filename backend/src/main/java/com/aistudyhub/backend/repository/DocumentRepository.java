package com.aistudyhub.backend.repository;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long>, JpaSpecificationExecutor<Document> {

    // Get all ACTIVE documents (paginated)
    Page<Document> findByStatus(DocumentStatus status, Pageable pageable);

    // Get all ACTIVE documents for a user
    List<Document> findByUser_IdAndStatus(Long userId, DocumentStatus status);

    // Calculate total storage used by a user for ACTIVE documents
    @Query("SELECT COALESCE(SUM(c.fileSize), 0) FROM Document d JOIN d.cloudFile c WHERE d.user.id = :userId AND d.status = com.aistudyhub.backend.entity.DocumentStatus.ACTIVE")
    Long calculateTotalStorageUsedByUserId(@Param("userId") Long userId);

    // Search by keyword in title, description, or tags (case-insensitive, ACTIVE only)
    @Query("SELECT d FROM Document d WHERE d.status = 'ACTIVE' AND " +
           "(LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(d.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(d.tags) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Document> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    // ─── Folder-related queries ────────────────────────────────────────────────

    /**
     * Count non-deleted documents inside a given folder.
     * Used by FolderService.toResponse() for the documentCount field.
     */
    long countByFolderIdAndStatusNot(Long folderId, DocumentStatus status);

    /**
     * Move all documents in a folder back to root (set folder = null).
     * Called by FolderService.deleteFolder() before deleting the folder.
     */
    @Modifying
    @Query("UPDATE Document d SET d.folder = null, d.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE d.folder.id = :folderId")
    int clearFolderForDocumentsInFolder(@Param("folderId") Long folderId);
}
