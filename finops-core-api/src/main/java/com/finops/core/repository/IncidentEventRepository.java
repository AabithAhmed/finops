package com.finops.core.repository;

import com.finops.core.entity.IncidentEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentEventRepository extends JpaRepository<IncidentEvent, Long> {
}
