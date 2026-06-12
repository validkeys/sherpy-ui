/**
 * useActorRef - Maintains stable reference to XState actor
 *
 * BUG-012 FIX: Store actor in a ref and update it on every render. The ref.current
 * always points to the latest actor, even after React StrictMode remounts.
 *
 * PROBLEM: Event handlers capture the actor value from their creation render.
 * When React StrictMode unmounts/remounts the component, a NEW actor is created
 * but the old handler closure still references the OLD (stopped) actor.
 *
 * SOLUTION: Store actor in a ref and update it on every render. The ref.current
 * always points to the latest actor, even after remounts.
 *
 * WHY useRef: Refs persist across renders but don't trigger re-renders when updated.
 * This is perfect for mutable values that need to stay in sync with props/context.
 */

import { useEffect, useRef } from "react";
import type { ActorRefFrom } from "xstate";
import type { planningMachine } from "../machines/planningMachine";

export type PlanningMachineActor = ActorRefFrom<typeof planningMachine>;

export function useActorRef(actor: PlanningMachineActor) {
  const actorRef = useRef(actor);

  // Update ref whenever actor changes (e.g., after provider remount)
  useEffect(() => {
    actorRef.current = actor;
    console.log("[useActorRef] ✅ Actor ref updated:", {
      actorId: actor.id,
      status: actor.getSnapshot().status,
      refId: actorRef.current.id,
    });
  }, [actor]); // Re-run whenever actor instance changes

  return actorRef;
}
