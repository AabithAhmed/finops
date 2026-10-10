package com.finops.core.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Maps to the anomalies table — written by the Python AI service.
 * Spring Boot exposes these as part of incident detail responses.
 * The evidence column is JSONB in Postgres; we map it to Map<String, Object>.
 */
@Entity
@Table(name = "anomalies")
@Getter @Setter @NoArgsConstructor
public class Anomaly {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "anomaly_type", nullable = false)
    private String anomalyType;

    @Column(name = "metric_name", nullable = false)
    private String metricName;

    @Column(name = "metric_value", nullable = false)
    private BigDecimal metricValue;

    @Column(name = "baseline_value", nullable = false)
    private BigDecimal baselineValue;

    @Column(name = "deviation_pct", nullable = false)
    private BigDecimal deviationPct;

    @Column(name = "anomaly_score", nullable = false)
    private BigDecimal anomalyScore;

    /**
     * JSONB column — Hibernate maps this to a Java Map using the JSON JDBC type.
     * Structured evidence: {"failure_rate": {"value": 42.0, "baseline": 1.3, ...}}
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "evidence", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> evidence;

    @Column(name = "window_start", nullable = false)
    private OffsetDateTime windowStart;

    @Column(name = "window_end", nullable = false)
    private OffsetDateTime windowEnd;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
