package com.finops.core.repository;

import com.finops.core.entity.Incident;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface IncidentRepository extends JpaRepository<Incident, Long> {

    /**
     * Filterable list with optional status and severity.
     * Passing null for a filter means "ignore this filter" — achieved via IS NULL OR = :param.
     */
    @Query("""
        SELECT i FROM Incident i
        WHERE (:status IS NULL OR i.status = :status)
          AND (:severity IS NULL OR i.severity = :severity)
        ORDER BY i.createdAt DESC
        """)
    Page<Incident> findFiltered(
            @Param("status") String status,
            @Param("severity") String severity,
            Pageable pageable);

    /**
     * Eagerly load anomalies and timeline for the detail endpoint.
     * Two separate queries prevent the N+1 problem (JOIN FETCH on multiple
     * collections causes Cartesian product, so we fetch them separately).
     */
    @Query("SELECT DISTINCT i FROM Incident i LEFT JOIN FETCH i.anomalies WHERE i.id = :id")
    Optional<Incident> findByIdWithAnomalies(@Param("id") Long id);

    @Query("SELECT DISTINCT i FROM Incident i LEFT JOIN FETCH i.timeline WHERE i.id = :id")
    Optional<Incident> findByIdWithTimeline(@Param("id") Long id);
}
