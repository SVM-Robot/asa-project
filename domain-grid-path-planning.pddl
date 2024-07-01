(define (domain grid-path-planning)
  (:requirements :strips :typing)
  (:types
    tile
    agent
  )
  (:predicates
    (at ?agent - agent ?tile - tile)
    (adjacent ?from - tile ?to - tile)
    (is_walkable ?tile - tile)
    (is_blocked ?tile - tile)
    ; Add more predicates as needed, e.g., for parcels or delivery points
  )

  (:action move
    :parameters (?agent - agent ?from - tile ?to - tile)
    :precondition (and
      (not (is_blocked ?to))
      (at ?agent ?from)
      (adjacent ?from ?to)
      (is_walkable ?to)
    )
    :effect (and
      (at ?agent ?to)
      (not (at ?agent ?from))
    )
  )

  ; Define additional actions as needed
)