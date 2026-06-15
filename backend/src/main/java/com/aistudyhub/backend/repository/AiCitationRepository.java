package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.AiCitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiCitationRepository extends JpaRepository<AiCitation, String> {

    // Retrieve all citations for a given AI message, sorted by score descending
    List<AiCitation> findByAiMessageMessageIdOrderByScoreDesc(String messageId);
}
