import { Activity, useState } from "react";
import { DocBrowser } from "@/components/doc-browser";
import { Header } from "@/components/header";
import { LeftRail } from "@/components/left-rail";
import type { Mode } from "@/components/mode-toggle";
import type { Stage } from "@/components/spectrum-stepper";
import { SpectrumStepper } from "@/components/spectrum-stepper";
import {
  Composer,
  OptionCard,
  OptionStack,
  QuestionCard,
  ThreadDivider,
  ThreadView,
} from "@/components/thread";

const SAMPLE_BREADCRUMB = [
  { label: "sherpy-web" },
  { label: "run-04" },
  { label: "business requirements" },
];

const SAMPLE_STAGES: Stage[] = [
  { id: "discovery", num: 1, name: "Discovery", status: "complete" },
  { id: "biz-req", num: 2, name: "Business requirements", status: "now" },
  { id: "stakeholder", num: 3, name: "Stakeholder map", status: "pending" },
  {
    id: "func-req",
    num: 4,
    name: "Functional requirements",
    status: "pending",
  },
  { id: "non-func", num: 5, name: "Non-functional", status: "pending" },
  { id: "architecture", num: 6, name: "Architecture", status: "pending" },
  { id: "tech-design", num: 7, name: "Technical design", status: "pending" },
  { id: "impl-plan", num: 8, name: "Implementation plan", status: "pending" },
  { id: "validation", num: 9, name: "Validation", status: "pending" },
  { id: "sign-off", num: 10, name: "Sign-off", status: "pending" },
];

export function AppShell() {
  const [mode, setMode] = useState<Mode>("build");
  const [activeStage, setActiveStage] = useState(1);

  const stages = SAMPLE_STAGES.map((s, i) => ({
    ...s,
    status:
      i < activeStage
        ? ("complete" as const)
        : i === activeStage
          ? ("now" as const)
          : ("pending" as const),
  }));

  return (
    <div className="grid grid-cols-[240px_1fr] h-screen min-h-[760px]">
      <LeftRail />
      <main className="flex flex-col min-h-0 bg-page overflow-hidden">
        <Header
          breadcrumb={SAMPLE_BREADCRUMB}
          stageNum={activeStage + 1}
          stageTotal={SAMPLE_STAGES.length}
          stageName={SAMPLE_STAGES[activeStage]?.name ?? ""}
          mode={mode}
          artifactCount={7}
          onModeChange={setMode}
        />
        <SpectrumStepper
          stages={stages}
          activeIndex={activeStage}
          onStageClick={setActiveStage}
        />
        <Activity mode={mode === "build" ? "visible" : "hidden"}>
          <ThreadView
            divider={
              <ThreadDivider
                label="Gap analysis · signed off · 9 of 9 resolved"
                tone="success"
              />
            }
            question={
              <QuestionCard
                n={1}
                text="What outcome should we be able to point to and say 'this is why we built it'?"
              />
            }
            options={
              <OptionStack>
                <OptionCard
                  letter="A"
                  title="A measurable user behavior"
                  body="e.g. users complete a run end-to-end in <30 min"
                  recommended
                />
                <OptionCard
                  letter="B"
                  title="A revenue or pipeline target"
                  body="e.g. $5k MRR by month 6"
                />
              </OptionStack>
            }
            composer={
              <Composer
                cta={
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      aria-label="Ask Sherpy"
                      className="text-[11px] px-[9px] py-[3px] rounded-pill border-[1.5px] border-border-emph bg-transparent text-fg-1 cursor-pointer"
                    >
                      ? Ask Sherpy
                    </button>
                    <button
                      type="button"
                      aria-label="Send answer"
                      className="text-[12px] px-3 py-[5px] rounded border-none bg-inverse text-fg-on-inverse font-medium cursor-pointer"
                    >
                      Send ↵
                    </button>
                  </div>
                }
              />
            }
          />
        </Activity>
        <Activity mode={mode === "review" ? "visible" : "hidden"}>
          <DocBrowser />
        </Activity>
      </main>
    </div>
  );
}
