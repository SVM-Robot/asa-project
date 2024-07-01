import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { onlineSolver, PddlExecutor, PddlProblem, Beliefset, PddlDomain, PddlAction } from "@unitn-asa/pddl-client";
import fs from 'fs';


(:action move
    :parameters (?me ?from ?to)
    :precondition (and
        (me ?me)
        (at ?me ?from)
        (or
            (right ?from ?to)
            (left ?from ?to)
            (up ?from ?to)
            (down ?from ?to)
        )
    )
    :effect (and
        (at ?me ?to)
        (not (at ?me ?from))
    )
)



initializeMap() {
    for (let y = 0; y < this.map.length; y++) {
        for (let x = 0; x < this.map[y].length; x++) {
          const tileName = `t${x}_${y}`;
          objects += `(${tileName} - tile) `;
          switch (this.map[y][x]) {
            case 0: // Blocked
              init += `(is_blocked ${tileName}) `;
              break;
            case 1: // Walkable spawning
              init += `(is_walkable ${tileName}) `;
              break;
            case 2: // Delivery
              init += `(is_walkable ${tileName}) `;
              init += `(is_delivery ${tileName}) `;
              break;
            case 3: // Walkable non-spawning
              init += `(is_walkable ${tileName}) `;
              init += `(is_walkable_non_spawn ${tileName}) `;
              break;
          }
          // Add adjacent relationships
          if (x > 0) init += `(adjacent t${x-1}_${y} ${tileName}) (adjacent ${tileName} t${x-1}_${y}) `;
          if (y > 0) init += `(adjacent t${x}_${y-1} ${tileName}) (adjacent ${tileName} t${x}_${y-1}) `;
        }
      }
}






generateProblemDefinition0() {
    const goal = `(at agent t${this.targetX}_${this.targetY})`;
    console.log('Goal:', goal);
    // Combine the static map definition with the dynamic goal
    return {
      domain: domain,
      objects: this.objects,
      init: this.init,
      goal: goal
    };
  }