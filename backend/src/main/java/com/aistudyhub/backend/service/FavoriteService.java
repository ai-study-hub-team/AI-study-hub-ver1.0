package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.FavoriteDocumentResponse;
import com.aistudyhub.backend.entity.CloudFile;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentStatus;
import com.aistudyhub.backend.entity.Favorite;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final DocumentRepository documentRepository;
    private final CurrentUserService currentUserService;
    private final DocumentAccessService documentAccessService;

    /**
     * Method them document vao danh sach yeu thich.
     * Lay user tu JWT/SecurityContext sau do check xem user co quyen xem ko
     * Check da favorite chua neu roi thi dung lai row cu ko can tao lai, neu chua thi tao ms
     * sau do Response tra FavoriteDocumentResponse
     */
    @Transactional
    public FavoriteDocumentResponse addFavorite(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = documentAccessService.getAccessibleDocument(currentUser, documentId);

        Favorite favorite = favoriteRepository
                .findByUserIdAndDocumentId(currentUser.getId(), document.getId())
                .orElseGet(() -> favoriteRepository.save(
                        Favorite.builder()
                                .user(currentUser)
                                .document(document)
                                .build()
                ));

        return toResponse(favorite);
    }

    /**
     * Method xoa document khoi danh sach yeu thich.
     * Lay current user tu JWT sau do kiem tra co ton tai hay khong
     * Xoa yeu thich theo current user id va doc id
     */

    @Transactional
    public void removeFavorite(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();

        if (!documentRepository.existsById(documentId)) {
            throw new RuntimeException("Document not found with id: " + documentId);
        }

        favoriteRepository.deleteByUserIdAndDocumentId(currentUser.getId(), documentId);
    }

    /**
     * Method lay danh sach favorite caa current user.
     * Lay current user tu JWT sau do repository query favorite cua current user va chi lay document ACTIVE
     * Sau đo map sang response
     */
    @Transactional(readOnly = true)
    public Page<FavoriteDocumentResponse> getMyFavorites(Pageable pageable) {
        User currentUser = currentUserService.getCurrentUser();

        return favoriteRepository
                .findAccessibleByUserIdOrderByCreatedAtDesc(
                        currentUser.getId(),
                        DocumentStatus.ACTIVE,
                        pageable
                )
                .map(this::toResponse);
    }

    /**
     * Method map entity sang DTO
     */
    private FavoriteDocumentResponse toResponse(Favorite favorite) {
        Document document = favorite.getDocument();
        CloudFile cloudFile = document.getCloudFile();
        User owner = document.getUser();

        return FavoriteDocumentResponse.builder()
                .favoriteId(favorite.getId())
                .documentId(document.getId())
                .title(document.getTitle())
                .description(document.getDescription())
                .fileType(cloudFile != null ? cloudFile.getFileType() : null)
                .processStatus(document.getProcessStatus() != null ? document.getProcessStatus().name() : null)
                .visibility(documentAccessService.isPublicDocument(document) ? "PUBLIC" : "PRIVATE")
                .ownerId(owner != null ? owner.getId() : null)
                .ownerName(owner != null ? owner.getFullName() : null)
                .favoritedAt(favorite.getCreatedAt())
                .build();
    }
}
