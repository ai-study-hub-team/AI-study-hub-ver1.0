package com.aistudyhub.backend.summary;

import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.DocumentSummaryRepository;
import com.aistudyhub.backend.service.CurrentUserService;
import com.aistudyhub.backend.service.SummaryService;
import com.aistudyhub.backend.service.TokenPricingService;
import com.aistudyhub.backend.service.TokenUsageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SummaryServiceJwtOwnershipTest {

    @Mock DocumentRepository documentRepository;
    @Mock DocumentChunkRepository documentChunkRepository;
    @Mock DocumentSummaryRepository documentSummaryRepository;
    @Mock TokenUsageService tokenUsageService;
    @Mock TokenPricingService tokenPricingService;
    @Mock CurrentUserService currentUserService;

    private SummaryService service;

    @BeforeEach
    void setUp() {
        service = new SummaryService(
                documentRepository,
                documentChunkRepository,
                documentSummaryRepository,
                tokenUsageService,
                tokenPricingService,
                currentUserService
        );
    }

    @Test
    void listUsesAuthenticatedUserIdInsteadOfRequestInput() {
        User currentUser = User.builder().id(10L).email("user@example.com").build();
        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(documentSummaryRepository.findByUser_IdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of());

        assertThat(service.getCurrentUserSummaries()).isEmpty();

        verify(documentSummaryRepository).findByUser_IdOrderByCreatedAtDesc(10L);
    }

    @Test
    void documentSummaryLookupHidesAnotherUsersDocument() {
        User currentUser = User.builder().id(10L).email("user@example.com").build();
        User owner = User.builder().id(20L).email("owner@example.com").build();
        Document foreignDocument = Document.builder().id(25L).user(owner).build();

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(documentRepository.findById(25L)).thenReturn(Optional.of(foreignDocument));

        assertThatThrownBy(() -> service.getSummariesByDocumentId(25L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Document not found with id: 25");

        verifyNoInteractions(documentSummaryRepository);
    }
}
