package com.aistudyhub.backend.shareupload;

import com.aistudyhub.backend.dto.request.SharedDocumentRejectRequest;
import com.aistudyhub.backend.entity.DocumentShareLink;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.entity.SharedDocumentSubmission;
import com.aistudyhub.backend.entity.SharedSubmissionStatus;
import com.aistudyhub.backend.entity.ShareLinkAccessPolicy;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.StorageCapacityException;
import com.aistudyhub.backend.repository.CategoryRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.DocumentShareLinkRepository;
import com.aistudyhub.backend.repository.FolderRepository;
import com.aistudyhub.backend.repository.SharedDocumentSubmissionRepository;
import com.aistudyhub.backend.repository.UserRepository;
import com.aistudyhub.backend.service.CloudinaryStorageService;
import com.aistudyhub.backend.service.DocumentProcessingAsyncService;
import com.aistudyhub.backend.service.DocumentShareLinkService;
import com.aistudyhub.backend.service.FileStorageService;
import com.aistudyhub.backend.service.ShareLinkAccessPolicyService;
import com.aistudyhub.backend.service.SharedDocumentSubmissionService;
import com.aistudyhub.backend.service.StorageQuotaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SharedUploadSecurityTest {

    @Mock SharedDocumentSubmissionRepository submissionRepository;
    @Mock DocumentShareLinkRepository shareLinkRepository;
    @Mock DocumentRepository documentRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock FolderRepository folderRepository;
    @Mock UserRepository userRepository;
    @Mock CloudinaryStorageService cloudinaryStorageService;
    @Mock DocumentProcessingAsyncService documentProcessingAsyncService;
    @Mock StorageQuotaService storageQuotaService;
    @Mock ShareLinkAccessPolicyService accessPolicyService;
    @Mock FileStorageService fileStorageService;
    @InjectMocks SharedDocumentSubmissionService submissionService;

    private User owner;
    private User uploader;
    private DocumentShareLink activeLink;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).fullName("Owner").email("owner@test.com").build();
        uploader = User.builder().id(2L).fullName("Uploader").email("uploader@test.com").build();
        activeLink = DocumentShareLink.builder().id(10L).owner(owner).tokenHash("hash")
                .status(DocumentShareStatus.ACTIVE).accessPolicy(ShareLinkAccessPolicy.PRIVATE_ALLOWLIST)
                .build();
    }

    @Test
    @DisplayName("Upload is denied when an authenticated user is not allowlisted")
    void uploadDeniedWhenNotOnAllowlist() {
        doThrow(new ForbiddenException("Not on allowlist"))
                .when(accessPolicyService).assertCanUpload(activeLink, uploader);
        DocumentShareLinkService linkService = linkService();
        MockMultipartFile file = pdfFile();

        assertThatThrownBy(() -> submissionService.handleAuthenticatedUpload(
                "token", file, null, null, uploader, linkService))
                .isInstanceOf(ForbiddenException.class);
        verify(cloudinaryStorageService, never()).upload(any(MockMultipartFile.class));
    }

    @Test
    @DisplayName("Quota failure does not upload to Cloudinary")
    void quotaFailureDoesNotUpload() {
        DocumentShareLinkService linkService = linkService();
        arrangeValidation();
        doThrow(new StorageCapacityException("Owner out of quota"))
                .when(storageQuotaService).reserveStorageForSharedUpload(owner.getId(), 100L);

        assertThatThrownBy(() -> submissionService.handleAuthenticatedUpload(
                "token", pdfFile(), null, null, uploader, linkService))
                .isInstanceOf(StorageCapacityException.class);
        verify(cloudinaryStorageService, never()).upload(any(MockMultipartFile.class));
        verify(submissionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cloudinary upload failure releases the owner's reservation")
    void cloudUploadFailureReleasesOwnerQuota() {
        DocumentShareLinkService linkService = linkService();
        arrangeValidation();
        doNothing().when(storageQuotaService).reserveStorageForSharedUpload(owner.getId(), 100L);
        doThrow(new RuntimeException("Cloudinary unavailable"))
                .when(cloudinaryStorageService).upload(any(MockMultipartFile.class));

        assertThatThrownBy(() -> submissionService.handleAuthenticatedUpload(
                "token", pdfFile(), null, null, uploader, linkService))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Cloud upload failed");
        verify(storageQuotaService).releaseStorageForSubmission(owner.getId(), 100L);
        verify(submissionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Authenticated uploader identity and Cloudinary metadata are persisted")
    void uploadUsesJwtIdentityAndCloudinaryMetadata() {
        DocumentShareLinkService linkService = linkService();
        arrangeValidation();
        doNothing().when(storageQuotaService).reserveStorageForSharedUpload(owner.getId(), 100L);
        CloudinaryStorageService.UploadResult result = CloudinaryStorageService.UploadResult.builder()
                .publicId("shared/file").secureUrl("https://cloud.example/file")
                .resourceType("raw").fileSize(100L).build();
        when(cloudinaryStorageService.upload(any(MockMultipartFile.class))).thenReturn(result);
        when(submissionRepository.save(any(SharedDocumentSubmission.class))).thenAnswer(i -> i.getArgument(0));

        submissionService.handleAuthenticatedUpload("token", pdfFile(), null, null, uploader, linkService);

        ArgumentCaptor<SharedDocumentSubmission> captor = ArgumentCaptor.forClass(SharedDocumentSubmission.class);
        verify(submissionRepository).save(captor.capture());
        SharedDocumentSubmission saved = captor.getValue();
        assertThat(saved.getUploaderUserId()).isEqualTo(uploader.getId());
        assertThat(saved.getUploaderNameSnapshot()).isEqualTo("Uploader");
        assertThat(saved.getCloudPublicId()).isEqualTo("shared/file");
        assertThat(saved.getCloudSecureUrl()).isEqualTo("https://cloud.example/file");
        assertThat(saved.getQuotaOwnerId()).isEqualTo(owner.getId());
    }

    @Test
    @DisplayName("Rejection deletes Cloudinary before releasing owner quota")
    void rejectionDeletesCloudinaryBeforeQuotaRelease() {
        SharedDocumentSubmission pending = pendingSubmission(5L);
        when(submissionRepository.findByIdAndOwnerUserId(5L, owner.getId())).thenReturn(Optional.of(pending));
        when(submissionRepository.atomicClaimQuotaRelease(5L)).thenReturn(1);
        when(submissionRepository.save(any(SharedDocumentSubmission.class))).thenAnswer(i -> i.getArgument(0));

        submissionService.rejectSubmission(5L, new SharedDocumentRejectRequest(), owner);

        var order = org.mockito.Mockito.inOrder(cloudinaryStorageService, storageQuotaService);
        order.verify(cloudinaryStorageService).delete("shared/file", "raw");
        order.verify(storageQuotaService).releaseStorageForSubmission(owner.getId(), 100L);
    }

    @Test
    @DisplayName("Failed Cloudinary deletion keeps quota charged for a scheduler retry")
    void failedDeletionDoesNotReleaseQuota() {
        SharedDocumentSubmission pending = pendingSubmission(6L);
        when(submissionRepository.findByIdAndOwnerUserId(6L, owner.getId())).thenReturn(Optional.of(pending));
        doThrow(new RuntimeException("delete failed"))
                .when(cloudinaryStorageService).delete("shared/file", "raw");
        when(submissionRepository.save(any(SharedDocumentSubmission.class))).thenAnswer(i -> i.getArgument(0));

        submissionService.rejectSubmission(6L, new SharedDocumentRejectRequest(), owner);

        assertThat(pending.getCloudDeleteFailedId()).isEqualTo("shared/file");
        assertThat(pending.getCloudDeleteAttempts()).isEqualTo(1);
        verify(storageQuotaService, never()).releaseStorageForSubmission(anyLong(), anyLong());
    }

    private DocumentShareLinkService linkService() {
        DocumentShareLinkService service = org.mockito.Mockito.mock(DocumentShareLinkService.class);
        when(service.findAndValidateLinkForUpload("token")).thenReturn(activeLink);
        return service;
    }

    private void arrangeValidation() {
        doNothing().when(accessPolicyService).assertCanUpload(activeLink, uploader);
        when(fileStorageService.detectMimeType(any(MockMultipartFile.class))).thenReturn("application/pdf");
        doNothing().when(storageQuotaService).validateFileRestrictions(owner.getId(), "application/pdf");
        when(storageQuotaService.getPlanFileSizeLimitBytes(owner.getId())).thenReturn(1_000_000L);
    }

    private MockMultipartFile pdfFile() {
        return new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[100]);
    }

    private SharedDocumentSubmission pendingSubmission(Long id) {
        return SharedDocumentSubmission.builder().id(id).ownerUserId(owner.getId())
                .quotaOwnerId(owner.getId()).uploaderUserId(uploader.getId()).shareLink(activeLink)
                .status(SharedSubmissionStatus.PENDING_REVIEW).fileSize(100L).fileType("application/pdf")
                .cloudPublicId("shared/file").cloudResourceType("raw")
                .cloudSecureUrl("https://cloud.example/file").build();
    }
}
