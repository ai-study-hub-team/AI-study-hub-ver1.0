package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentNoteRepository extends JpaRepository<DocumentNote, Long> {
    List<DocumentNote> findByUser_IdAndDocument_IdOrderByUpdatedAtDesc(Long userId, Long documentId);
    Optional<DocumentNote> findByIdAndUser_Id(Long id, Long userId);
}
