package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.AiUsageEvent;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.AiFeatureType;
import com.aistudyhub.backend.repository.AiUsageEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiUsageEventWriter {

    private final AiUsageEventRepository aiUsageEventRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveInNewTransaction(User user, AiFeatureType featureType, Long documentId) {
        AiUsageEvent event = AiUsageEvent.builder()
                .user(user)
                .featureType(featureType)
                .documentId(documentId)
                .build();
        aiUsageEventRepository.save(event);
        log.debug("[AiUsageAnalytics] Recorded {} event for userId={}, documentId={}",
                featureType, user.getId(), documentId);
    }
}
