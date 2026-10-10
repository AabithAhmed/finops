package com.finops.core.service;

import com.finops.core.entity.Incident;
import com.finops.core.entity.IncidentEvent;
import com.finops.core.repository.IncidentEventRepository;
import com.finops.core.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepo;
    private final IncidentEventRepository incidentEventRepo;

    /**
     * Valid status transitions — each key maps to the set of statuses it can transition TO.
     * This is the core business logic of this service; invalid transitions are rejected with 400.
     *
     * The linear flow is: DETECTED → OPEN → ACKNOWLEDGED → INVESTIGATING → MITIGATED → RESOLVED
     * We also allow direct jump from any intermediate state to RESOLVED for emergency resolves.
     */
    private static final Map<String, Set<String>> VALID_TRANSITIONS = Map.of(
        "DETECTED",      Set.of("OPEN"),
        "OPEN",          Set.of("ACKNOWLEDGED", "RESOLVED"),
        "ACKNOWLEDGED",  Set.of("INVESTIGATING", "RESOLVED"),
        "INVESTIGATING", Set.of("MITIGATED", "RESOLVED"),
        "MITIGATED",     Set.of("RESOLVED"),
        "RESOLVED",      Set.of() // terminal state — no further transitions
    );

    public Page<Incident> listIncidents(String status, String severity, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return incidentRepo.findFiltered(status, severity, pageable);
    }

    /**
     * Returns the full incident detail by merging two separate fetch results
     * (anomalies + timeline) to avoid Cartesian product from double JOIN FETCH.
     */
    @Transactional(readOnly = true)
    public Incident getIncidentDetail(Long id) {
        // Fetch with anomalies
        Incident incident = incidentRepo.findByIdWithAnomalies(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Incident not found: " + id));
        // Fetch timeline into same session — Hibernate merges them via identity map
        incidentRepo.findByIdWithTimeline(id);
        return incident;
    }

    /**
     * Transitions an incident's status.
     * Validates the transition is legal, updates the status,
     * and appends a row to incident_events for the timeline.
     */
    @Transactional
    public Incident transitionStatus(Long id, String newStatus) {
        Incident incident = incidentRepo.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Incident not found: " + id));

        String currentStatus = incident.getStatus();
        Set<String> allowed = VALID_TRANSITIONS.getOrDefault(currentStatus, Set.of());

        if (!allowed.contains(newStatus)) {
            throw new IllegalStateException(
                String.format("Cannot transition from %s to %s. Allowed: %s",
                    currentStatus, newStatus, allowed)
            );
        }

        incident.setStatus(newStatus);

        // If resolving, record the resolved timestamp
        if ("RESOLVED".equals(newStatus)) {
            incident.setResolvedAt(OffsetDateTime.now());
        }

        incidentRepo.save(incident);

        // Append a timeline entry describing the transition
        IncidentEvent timelineEntry = new IncidentEvent();
        timelineEntry.setIncident(incident);
        timelineEntry.setEventDescription(
            String.format("Status changed from %s to %s", currentStatus, newStatus)
        );
        timelineEntry.setOccurredAt(OffsetDateTime.now());
        incidentEventRepo.save(timelineEntry);

        return incident;
    }

    /**
     * Validates whether a status transition is allowed.
     * Used directly by unit tests — pure logic, no DB.
     */
    public static boolean isValidTransition(String from, String to) {
        return VALID_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }
}
