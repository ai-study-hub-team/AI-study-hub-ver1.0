package com.aistudyhub.backend.shareupload;

import com.aistudyhub.backend.dto.request.DocumentShareLinkCreateRequest;
import com.aistudyhub.backend.dto.response.PublicShareLinkResponse;
import com.aistudyhub.backend.entity.DocumentShareLink;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.repository.DocumentShareLinkAllowedUserRepository;
import com.aistudyhub.backend.repository.DocumentShareLinkRepository;
import com.aistudyhub.backend.repository.FolderRepository;
import com.aistudyhub.backend.repository.UserRepository;
import com.aistudyhub.backend.service.CurrentUserService;
import com.aistudyhub.backend.service.DocumentShareLinkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentShareLinkPlainTokenTest {

    @Mock DocumentShareLinkRepository shareLinkRepository;
    @Mock DocumentShareLinkAllowedUserRepository allowedUserRepository;
    @Mock UserRepository userRepository;
    @Mock FolderRepository folderRepository;
    @Mock CurrentUserService currentUserService;
    @InjectMocks DocumentShareLinkService shareLinkService;

    private User owner;
    private User otherUser;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).email("owner@example.com").build();
        otherUser = User.builder().id(2L).email("other@example.com").build();
        ReflectionTestUtils.setField(shareLinkService, "frontendBaseUrl", "http://localhost:5173");
    }

    @Test
    @DisplayName("creating a link stores its raw token alongside its hash")
    void createStoresPlainTokenAndHash() {
        stubEmptyAllowlist();
        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(shareLinkRepository.save(any(DocumentShareLink.class))).thenAnswer(invocation -> {
            DocumentShareLink link = invocation.getArgument(0);
            link.setId(10L);
            return link;
        });

        var response = shareLinkService.createShareLink(new DocumentShareLinkCreateRequest());

        ArgumentCaptor<DocumentShareLink> captor = ArgumentCaptor.forClass(DocumentShareLink.class);
        verify(shareLinkRepository).save(captor.capture());
        DocumentShareLink saved = captor.getValue();
        assertThat(saved.getPlainToken()).isEqualTo(response.getToken());
        assertThat(saved.getTokenHash()).isEqualTo(shareLinkService.hashToken(saved.getPlainToken()));
        assertThat(saved.getTokenHash()).isNotEqualTo(saved.getPlainToken());
        assertThat(response.getShareUrl()).isEqualTo("http://localhost:5173/shared-upload/" + saved.getPlainToken());
    }

    @Test
    @DisplayName("owner list returns a previously saved usable share URL")
    void ownerListReturnsStoredPlainTokenAndShareUrl() {
        stubEmptyAllowlist();
        DocumentShareLink link = shareLink(10L, owner, "saved-token");
        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(shareLinkRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId())).thenReturn(List.of(link));

        var response = shareLinkService.getLinksForCurrentUser().get(0);

        assertThat(response.getToken()).isEqualTo("saved-token");
        assertThat(response.getShareUrl()).isEqualTo("http://localhost:5173/shared-upload/saved-token");
    }

    @Test
    @DisplayName("legacy links without a stored raw token return no usable URL")
    void legacyLinkWithoutPlainTokenReturnsNullTokenAndUrl() {
        stubEmptyAllowlist();
        DocumentShareLink link = shareLink(10L, owner, null);
        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(shareLinkRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId())).thenReturn(List.of(link));

        var response = shareLinkService.getLinksForCurrentUser().get(0);

        assertThat(response.getToken()).isNull();
        assertThat(response.getShareUrl()).isNull();
    }

    @Test
    @DisplayName("public inspection never exposes a stored raw token or share URL")
    void publicInspectionDoesNotExposePlainTokenOrShareUrl() {
        DocumentShareLink link = shareLink(10L, owner, "saved-token");
        when(shareLinkRepository.findByTokenHash(shareLinkService.hashToken("public-token")))
                .thenReturn(java.util.Optional.of(link));

        PublicShareLinkResponse response = shareLinkService.validatePublicToken("public-token");

        assertThat(response.getTitle()).isEqualTo("Shared document");
        assertThat(Arrays.stream(PublicShareLinkResponse.class.getDeclaredFields())
                .map(java.lang.reflect.Field::getName))
                .doesNotContain("plainToken", "token", "shareUrl");
    }

    @Test
    @DisplayName("another owner cannot list a different owner's saved link")
    void anotherOwnerCannotListSavedLink() {
        when(currentUserService.getCurrentUser()).thenReturn(otherUser);
        when(shareLinkRepository.findByOwnerIdOrderByCreatedAtDesc(otherUser.getId()))
                .thenReturn(Collections.emptyList());

        assertThat(shareLinkService.getLinksForCurrentUser()).isEmpty();
        verify(shareLinkRepository).findByOwnerIdOrderByCreatedAtDesc(otherUser.getId());
    }

    private DocumentShareLink shareLink(Long id, User linkOwner, String plainToken) {
        return DocumentShareLink.builder()
                .id(id)
                .owner(linkOwner)
                .tokenHash("hash")
                .plainToken(plainToken)
                .title("Shared document")
                .status(DocumentShareStatus.ACTIVE)
                .build();
    }

    private void stubEmptyAllowlist() {
        when(allowedUserRepository.findByShareLinkId(anyLong())).thenReturn(Collections.emptyList());
    }
}
