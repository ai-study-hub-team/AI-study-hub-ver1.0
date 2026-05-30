package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.CloudFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CloudFileRepository extends JpaRepository<CloudFile, Long> {
}
