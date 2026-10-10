package com.finops.core.controller;

import com.finops.core.entity.Event;
import com.finops.core.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventRepository eventRepo;

    /**
     * GET /api/events/recent?n=50
     * Returns the last N payment events sorted by occurred_at desc.
     * Used by the React dashboard on initial page load — the live stream
     * itself comes from the Node.js WebSocket service.
     */
    @GetMapping("/recent")
    public ResponseEntity<List<Event>> getRecentEvents(
            @RequestParam(defaultValue = "50") int n) {
        // Cap at 200 to prevent accidental large fetches
        int limit = Math.min(n, 200);
        List<Event> events = eventRepo.findAllByOrderByOccurredAtDesc(PageRequest.of(0, limit));
        return ResponseEntity.ok(events);
    }
}
