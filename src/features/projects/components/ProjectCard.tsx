import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Project } from "../types";

const STEP_LABELS: Record<number, string> = {
  1: "Intake",
  2: "Business Goals",
  3: "User Personas",
  4: "Technical Requirements",
  5: "Architecture",
  6: "Data Model",
  7: "API Design",
  8: "Security",
  9: "Testing Strategy",
  10: "Review & Finalize",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ProjectCardProps {
  project: Project;
  onArchive: () => void;
  onComplete: () => void;
  onClick: () => void;
}

export function ProjectCard({
  project,
  onArchive,
  onComplete,
  onClick,
}: ProjectCardProps) {
  return (
    <Card
      size="sm"
      className="cursor-pointer hover:border-border-2 transition-colors"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>
          <span className="font-mono text-xs">{project.code}</span>
          {" · "}
          {relativeTime(project.lastTouchedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-xs text-fg-3">
          Step {project.currentStep} ·{" "}
          {STEP_LABELS[project.currentStep] ?? "Unknown"}
        </span>
      </CardContent>
      {project.status === "active" && (
        <CardFooter className="gap-2">
          <button
            type="button"
            aria-label={`Archive ${project.name}`}
            className="text-xs text-fg-3 hover:text-fg-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
          >
            Archive
          </button>
          <button
            type="button"
            aria-label={`Complete ${project.name}`}
            className="text-xs text-fg-3 hover:text-fg-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
          >
            Complete
          </button>
        </CardFooter>
      )}
    </Card>
  );
}
