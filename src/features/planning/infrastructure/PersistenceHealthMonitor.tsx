import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Actor } from "xstate";
import { ErrorModal } from "@/components/ui/error-modal";
import { exportLocalStorageData } from "@/lib/export-data";

interface HealthState {
  failureCount: number;
  lastError: string | null;
  isBlocked: boolean;
}

export function PersistenceHealthMonitor({
  projectId,
  actor,
}: {
  projectId: string;
  actor: Actor<any>;
}) {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthState>({
    failureCount: 0,
    lastError: null,
    isBlocked: false,
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const subscription = actor.subscribe(async (snapshot) => {
      if (!isMounted) return;

      try {
        // Attempt to sync to database
        const { $savePlanningState } = await import("./server-functions");
        const cleanSnapshot = JSON.parse(JSON.stringify(snapshot.toJSON()));
        await $savePlanningState({
          data: {
            projectId,
            snapshot: cleanSnapshot,
          },
        });

        // Success - reset failure count
        if (isMounted) {
          setHealth({
            failureCount: 0,
            lastError: null,
            isBlocked: false,
          });
        }
      } catch (error) {
        if (!isMounted) return;

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("[PersistenceHealthMonitor] Sync failed:", errorMessage);

        setHealth((prev) => ({
          failureCount: prev.failureCount + 1,
          lastError: errorMessage,
          isBlocked:
            errorMessage.includes("FOREIGN KEY") || prev.failureCount >= 2,
        }));

        // Show modal on critical errors
        if (errorMessage.includes("FOREIGN KEY") || health.failureCount >= 2) {
          setShowModal(true);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [projectId, actor, health.failureCount]);

  // Handle FOREIGN KEY constraint (project doesn't exist)
  if (health.lastError?.includes("FOREIGN KEY")) {
    return (
      <ErrorModal
        open={showModal}
        title="Cannot Save Progress"
        message="This project doesn't exist in the database. Your work cannot be saved. This usually happens if you navigated to a project URL that was never properly created."
        severity="error"
        actions={[
          {
            label: "Export Data",
            onClick: () => {
              exportLocalStorageData(projectId);
              setShowModal(false);
            },
            variant: "secondary",
          },
          {
            label: "Create New Project",
            onClick: () => navigate({ to: "/dashboard" }),
            variant: "danger",
          },
        ]}
      />
    );
  }

  // Handle multiple failures (connection issue)
  if (health.failureCount >= 3) {
    return (
      <ErrorModal
        open={showModal}
        title="Database Connection Lost"
        message={`Failed to save progress ${health.failureCount} times. Your work may not be saved. Error: ${health.lastError}`}
        severity="error"
        actions={[
          {
            label: "Export Data",
            onClick: () => {
              exportLocalStorageData(projectId);
              setShowModal(false);
            },
            variant: "secondary",
          },
          {
            label: "Retry",
            onClick: () => {
              setHealth({ failureCount: 0, lastError: null, isBlocked: false });
              setShowModal(false);
            },
            variant: "primary",
          },
        ]}
      />
    );
  }

  // Visual indicator for minor failures
  if (health.failureCount > 0 && health.failureCount < 3) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <p className="text-yellow-800 font-medium">
          ⚠️ Warning: Changes may not be saving ({health.failureCount} failures)
        </p>
        <p className="text-yellow-700 text-sm mt-1">{health.lastError}</p>
      </div>
    );
  }

  return null;
}
