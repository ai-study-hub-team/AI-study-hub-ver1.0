package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.SharedItemResponse;
import com.aistudyhub.backend.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SharedWithMeService {

    private final DocumentShareService documentShareService;
    private final FolderShareService folderShareService;

    @Transactional(readOnly = true)
    public Page<SharedItemResponse> getSharedWithMe(String rawType, int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page must be greater than or equal to 0");
        }
        if (size < 1) {
            throw new BadRequestException("size must be greater than 0");
        }

        SharedItemType type = parseType(rawType);
        List<SharedItemResponse> items = new ArrayList<>();

        if (type == SharedItemType.ALL || type == SharedItemType.DOCUMENT) {
            items.addAll(documentShareService.getSharedDocumentsForCurrentUser());
        }
        if (type == SharedItemType.ALL || type == SharedItemType.FOLDER) {
            items.addAll(folderShareService.getSharedFoldersForCurrentUser());
        }

        Comparator<LocalDateTime> newestFirst = Comparator.nullsLast(Comparator.reverseOrder());
        items.sort(Comparator.comparing(SharedItemResponse::getSharedAt, newestFirst));

        Pageable pageable = PageRequest.of(page, size);
        int start = (int) Math.min(pageable.getOffset(), items.size());
        int end = Math.min(start + pageable.getPageSize(), items.size());

        return new PageImpl<>(items.subList(start, end), pageable, items.size());
    }

    private SharedItemType parseType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            return SharedItemType.ALL;
        }

        try {
            return SharedItemType.valueOf(rawType.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("type must be ALL, DOCUMENT or FOLDER");
        }
    }

    private enum SharedItemType {
        ALL,
        DOCUMENT,
        FOLDER
    }
}

