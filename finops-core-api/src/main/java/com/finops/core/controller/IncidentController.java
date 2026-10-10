package com.finops.core.controller;

import com.finops.core.entity.Incident;
import com.finops.core.service.IncidentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    /**
     * GET /api/incidents?status=OPEN&severity=HIGH&page=0&size=20
     * Lists incidents paginated, filtered. All authenticated roles can read.
     */
    @GetMapping
    public ResponseEntity<Page<Incident>> listIncidents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(incidentService.listIncidents(status, severity, page, size));
    }

    /**
     * GET /api/incidents/{id}
     * Incident detail including anomalies (evidence) and timeline.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Incident> getIncident(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(incidentService.getIncidentDetail(id));
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * PATCH /api/incidents/{id}/status
     * Body: {"status": "ACKNOWLEDGED"}
     * Only OPERATOR and ADMIN roles — enforced in SecurityConfig and here.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN')")
    public ResponseEntity<?> transitionStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "status field is required"));
        }

        try {
            return ResponseEntity.ok(incidentService.transitionStatus(id, newStatus.toUpperCase()));
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            // Invalid transition — return 400 with explanation so the UI can show it
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
