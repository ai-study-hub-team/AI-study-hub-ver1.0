package com.aistudyhub.backend.specification;

import com.aistudyhub.backend.entity.Category;
import com.aistudyhub.backend.entity.CloudFile;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentProcessStatus;
import com.aistudyhub.backend.entity.DocumentStatus;
import com.aistudyhub.backend.entity.Folder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DocumentSpecification {

    /**
     * Builds a combined Specification for document listing/search.
     *
     * <p>Folder filtering rules:
     * <ul>
     *   <li>{@code folderId} non-null → return only documents in that folder.</li>
     *   <li>{@code rootOnly=true} → return only documents where folder_id IS NULL.</li>
     *   <li>Neither provided → no folder filter (original behaviour).</li>
     * </ul>
     */
    public static Specification<Document> filterDocuments(
            String keyword,
            Long categoryId,
            DocumentProcessStatus processStatus,
            String fileType,
            String tag,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Long folderId,
            Boolean rootOnly
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Neu co join, distinct giup tranh trung lap ket qua.
            query.distinct(true);

            // Chi lay document dang ACTIVE, khong lay document da soft delete.
            predicates.add(cb.equal(root.get("status"), DocumentStatus.ACTIVE));

            // Exclude trashed documents from all normal listings (default: isTrashed = false).
            predicates.add(cb.equal(root.get("isTrashed"), false));

            // Join voi category va cloudFile theo quan he trong Entity Document.
            Join<Document, Category>  categoryJoin  = root.join("category",  JoinType.LEFT);
            Join<Document, CloudFile> cloudFileJoin = root.join("cloudFile", JoinType.LEFT);
            Join<Document, Folder>    folderJoin    = root.join("folder",    JoinType.LEFT);

            // Search theo keyword trong title, description, tags, originalName.
            if (keyword != null && !keyword.isBlank()) {
                String searchValue = "%" + keyword.trim().toLowerCase() + "%";

                Expression<String> titleExpression =
                        cb.lower(root.<String>get("title"));

                Expression<String> descriptionExpression =
                        cb.lower(cb.coalesce(root.<String>get("description"), ""));

                Expression<String> tagsExpression =
                        cb.lower(cb.coalesce(root.<String>get("tags"), ""));

                Expression<String> originalNameExpression =
                        cb.lower(cb.coalesce(cloudFileJoin.<String>get("originalName"), ""));

                Predicate titleLike        = cb.like(titleExpression,        searchValue);
                Predicate descriptionLike  = cb.like(descriptionExpression,  searchValue);
                Predicate tagsLike         = cb.like(tagsExpression,         searchValue);
                Predicate originalNameLike = cb.like(originalNameExpression, searchValue);

                predicates.add(cb.or(titleLike, descriptionLike, tagsLike, originalNameLike));
            }

            // Loc theo category.
            if (categoryId != null) {
                predicates.add(cb.equal(categoryJoin.get("id"), categoryId));
            }

            // Loc theo trang thai xu ly AI.
            if (processStatus != null) {
                predicates.add(cb.equal(root.get("processStatus"), processStatus));
            }

            // Loc theo fileType, vi du "pdf" se match "application/pdf".
            if (fileType != null && !fileType.isBlank()) {
                String fileTypeValue = "%" + fileType.trim().toLowerCase() + "%";

                Expression<String> fileTypeExpression =
                        cb.lower(cb.coalesce(cloudFileJoin.<String>get("fileType"), ""));

                predicates.add(cb.like(fileTypeExpression, fileTypeValue));
            }

            // Loc theo tag, vi du LECTURE, PUBLIC, PRIVATE.
            if (tag != null && !tag.isBlank()) {
                String tagValue = "%" + tag.trim().toLowerCase() + "%";

                Expression<String> tagsExpression =
                        cb.lower(cb.coalesce(root.<String>get("tags"), ""));

                predicates.add(cb.like(tagsExpression, tagValue));
            }

            // Loc tu ngay.
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("createdAt"), fromDate));
            }

            // Loc den ngay.
            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<LocalDateTime>get("createdAt"), toDate));
            }

            // ── Folder filters ───────────────────────────────────────────────
            if (folderId != null) {
                // Documents in a specific folder
                predicates.add(cb.equal(folderJoin.get("id"), folderId));
            } else if (Boolean.TRUE.equals(rootOnly)) {
                // Documents with no folder (root-level)
                predicates.add(cb.isNull(root.get("folder")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ─── Backward-compatible overload (no folder params) ──────────────────────

    /**
     * Original 7-argument signature kept for any internal callers
     * that do not need folder filtering (e.g. getAiReadyDocuments).
     */
    public static Specification<Document> filterDocuments(
            String keyword,
            Long categoryId,
            DocumentProcessStatus processStatus,
            String fileType,
            String tag,
            LocalDateTime fromDate,
            LocalDateTime toDate
    ) {
        return filterDocuments(keyword, categoryId, processStatus,
                fileType, tag, fromDate, toDate, null, null);
    }
}
