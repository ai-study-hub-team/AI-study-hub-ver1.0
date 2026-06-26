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

    @Transactional
    public void removeFavorite(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();

        if (!documentRepository.existsById(documentId)) {
            throw new RuntimeException("Document not found with id: " + documentId);
        }

        favoriteRepository.deleteByUserIdAndDocumentId(currentUser.getId(), documentId);
    }

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
