package com.finops.core.repository;

import com.finops.core.entity.Event;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    /**
     * Returns the most recent N events by occurred_at desc.
     * Called by GET /api/events/recent for dashboard initial load.
     */
    List<Event> findAllByOrderByOccurredAtDesc(Pageable pageable);
}
