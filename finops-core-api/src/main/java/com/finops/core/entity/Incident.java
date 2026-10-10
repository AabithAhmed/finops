package com.finops.core.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Maps to the incidents table — the central domain object of this service.
 * Written by the Python AI service; read and status-transitioned here.
 *
 * Note on the embedding column: it's a vector(384) in Postgres (pgvector).
 * We skip mapping it in JPA — the Python service manages it, and Spring Boot
 * has no need to read or write it. Hibernate validate will still pass because
 * we're not declaring it as managed.
 * 
 * Wait — actually Hibernate validate WILL fail if there are extra DB columns
 * that have no corresponding JPA field, IF we use the strict validation mode.
 * To handle the vector column cleanly, we add @Column but as a transient-like
 * ignored byte[], OR we switch to ddl-auto=none for safety. See application.yml.
 */
@Entity
@Table(name = "incidents")
@Getter @Setter @NoArgsConstructor
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "incident_code", nullable = false, unique = true)
    private String incidentCode;

    @Column(name = "severity", nullable = false)
    private String severity;

    @Column(name = "status", nullable = false)
    private String status = "DETECTED";

    /**
     * Array of service names affected. Postgres text[] maps to String[].
     */
    @Column(name = "affected_services", columnDefinition = "text[]")
    private String[] affectedServices = new String[0];

    @Column(name = "root_cause_summary")
    private String rootCauseSummary;

    @Column(name = "root_cause_confidence")
    private BigDecimal rootCauseConfidence;

    // We intentionally do NOT map the embedding (vector) column here.
    // Python manages it; we don't need it in the API responses.

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    /**
     * Linked anomalies via the incident_anomalies join table.
     * Loaded lazily — only fetched when we load incident detail.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "incident_anomalies",
        joinColumns = @JoinColumn(name = "incident_id"),
        inverseJoinColumns = @JoinColumn(name = "anomaly_id")
    )
    private List<Anomaly> anomalies = new ArrayList<>();

    /**
     * Timeline events for this incident.
     */
    @OneToMany(mappedBy = "incident", fetch = FetchType.LAZY)
    @OrderBy("occurred_at ASC")
    private List<IncidentEvent> timeline = new ArrayList<>();
}
