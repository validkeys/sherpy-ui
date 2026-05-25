import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LeftRail } from "@/components/left-rail";
import { CreateProjectFlow } from "@/features/projects/components/CreateProjectFlow";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-[var(--left-rail-width)_1fr] h-screen min-h-[760px]">
      <LeftRail onNewProject={() => setCreateOpen(true)} />
      <main className="flex flex-col bg-page overflow-hidden">{children}</main>
      <CreateProjectFlow
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(newProjectId) => {
          navigate({
            to: "/project/$projectId/build",
            params: { projectId: newProjectId },
          });
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
