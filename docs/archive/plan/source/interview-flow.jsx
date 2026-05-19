/* eslint-disable */
// Sherpy onboarding wireframes — INTERVIEW FLOW
// New section, separate from wireframes.jsx so existing work isn't touched.
// Uses primitives already on window: AppChrome, ChromeHeader, SpectrumBar, Frame,
// SubHeader, ThreadDivider, ThreadMsg, Eyebrow, Line, Brand, PencilDefs.

// ============================================================
// SHARED — interview-only primitives
// ============================================================

// Question number badge — counts up, no denominator (we don't know the total)
function QNumber({ n, current }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10.5,
      color: current ? 'var(--neutral-7)' : 'var(--neutral-5)',
      letterSpacing: '0.04em', fontWeight: current ? 600 : 400,
      whiteSpace: 'nowrap',
    }}>
      Question {String(n).padStart(2, '0')}
    </span>
  );
}

// "Recommended" badge — small pill, accent color
function RecommendedBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--font-mono)', fontSize: 9.5,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 999,
      background: 'var(--accent-2)', color: 'white',
      filter: 'url(#pencil-soft)',
    }}>
      ★ recommended
    </span>
  );
}

// Stacked option card — full row with title + body + (collapsed) why-this affordance
function OptionCard({ letter, title, body, recommended, selected, onClick, density = 'cozy' }) {
  const pad = density === 'compact' ? '10px 12px' : '12px 14px';
  return (
    <div onClick={onClick}
      style={{
        border: `1.5px solid ${selected ? 'var(--neutral-7)' : 'var(--neutral-3)'}`,
        background: selected ? 'var(--neutral-1)' : 'white',
        borderRadius: 8, padding: pad, cursor: 'pointer',
        filter: 'url(#pencil-soft)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
      {/* Letter badge */}
      <div style={{
        width: 22, height: 22, borderRadius: 4, flexShrink: 0,
        border: '1.5px solid var(--neutral-7)',
        background: selected ? 'var(--neutral-7)' : 'white',
        color: selected ? 'white' : 'var(--neutral-7)',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
        display: 'grid', placeItems: 'center',
        filter: 'url(#pencil-soft)',
      }}>
        {letter}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 13, fontWeight: 500, color: 'var(--neutral-7)',
          }}>{title}</span>
          {recommended && <RecommendedBadge />}
        </div>
        {body && (
          <div style={{ fontSize: 11.5, color: 'var(--neutral-5)', lineHeight: 1.45 }}>
            {body}
          </div>
        )}
        {/* Why-this affordance — hidden by default per spec */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5,
          color: 'var(--neutral-4)', marginTop: 2, cursor: 'pointer',
        }}>
          ? why this
        </div>
      </div>
    </div>
  );
}

// Question block — header line (Question NN) + the Q text + options + free-text + actions.
// Designed to live as the "current question" pinned at the bottom of a scrollable thread.
function QuestionBlock({
  n, question, options, selected, density = 'cozy',
  showAsk = true, dimmed = false, askPill = null,
}) {
  return (
    <div style={{
      border: '1.5px solid var(--neutral-7)', borderRadius: 12,
      background: 'white', filter: 'url(#pencil-soft)',
      padding: density === 'compact' ? '12px 14px 10px' : '14px 16px 12px',
      display: 'flex', flexDirection: 'column',
      gap: density === 'compact' ? 8 : 10,
      opacity: dimmed ? 0.55 : 1,
      boxShadow: '0 -2px 0 var(--neutral-1)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <QNumber n={n} current />
        {askPill}
      </div>

      {/* Question */}
      <div style={{
        fontSize: density === 'compact' ? 14 : 15,
        fontWeight: 500, color: 'var(--neutral-7)', lineHeight: 1.35,
      }}>
        {question}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map((o, i) => (
          <OptionCard key={i}
            letter={o.letter}
            title={o.title}
            body={o.body}
            recommended={o.recommended}
            selected={selected === o.letter}
            density={density}
          />
        ))}
      </div>

      {/* Free-text + actions */}
      <Line dashed />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12.5, color: 'var(--neutral-4)', fontStyle: 'italic', flex: 1 }}>
          …or type your own answer
        </span>
        {showAsk && (
          <button style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 999,
            border: '1.5px solid var(--neutral-7)', background: 'transparent',
            cursor: 'pointer', filter: 'url(#pencil-soft)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>? Ask Sherpy</button>
        )}
        <button style={{
          fontSize: 12, padding: '5px 12px', borderRadius: 4,
          border: 'none',
          background: selected ? 'var(--neutral-7)' : 'var(--neutral-3)',
          color: selected ? 'white' : 'var(--neutral-5)',
          cursor: selected ? 'pointer' : 'not-allowed',
          fontWeight: 500, filter: 'url(#pencil-soft)',
        }}>Send ↵</button>
      </div>
    </div>
  );
}

// Tiny pill that shows "Chatted · N messages — view" sitting above the question
function ChattedPill({ count = 4, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-mono)', fontSize: 10,
        padding: '3px 10px', borderRadius: 999,
        border: '1.5px solid var(--bot-2)',
        background: 'var(--bot-2-soft, color-mix(in oklab, var(--bot-2) 14%, white))',
        color: 'var(--bot-2)',
        cursor: 'pointer', filter: 'url(#pencil-soft)',
        whiteSpace: 'nowrap',
      }}>
      <span>💬</span>
      <span>chatted · {count} msgs</span>
      <span style={{ color: 'var(--neutral-5)' }}>· view</span>
    </div>
  );
}

// ============================================================
// FRAMES — interview flow
// ============================================================

// I1 — First question of business reqs (entering from gap analysis)
function I_FirstQuestion({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={2} completed={[1]} density={density}>
      <ChromeHeader phase="Business requirements" stage="just started" density={density} />
      {showSpectrum && <SpectrumBar active={2} completed={[1]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 14px' : '8px 32px 16px',
                    display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                      gap: density === 'compact' ? 10 : 14, paddingBottom: 12 }}>
          <ThreadDivider label="Gap analysis · signed off · 9 of 9 resolved" tone="success" />
          <div style={{
            fontSize: 12, color: 'var(--neutral-5)', fontStyle: 'italic',
            textAlign: 'center', padding: '4px 0',
          }}>
            Sherpy will keep going until the requirements are solid — no fixed length.
          </div>
        </div>

        <QuestionBlock
          n={1}
          density={density}
          question="What outcome should we be able to point to and say 'this is why we built it'?"
          options={[
            { letter: 'A', title: 'A measurable user behavior',
              body: 'e.g. "users complete a Sherpy run end-to-end in <30 min" — concrete, testable, scope-limiting.',
              recommended: true },
            { letter: 'B', title: 'A revenue or pipeline target',
              body: 'e.g. "$5k MRR by month 6" — sharp but often disconnected from build choices.' },
            { letter: 'C', title: 'A qualitative feel',
              body: 'e.g. "feels like a senior PM in your pocket" — easy to align on, hard to verify.' },
          ]}
        />
      </div>
    </AppChrome>
  );
}

// I2 — Mid-interview, typical question with options
function I_MidInterview({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={2} completed={[1]} density={density}>
      <ChromeHeader phase="Business requirements" stage="in progress" density={density} />
      {showSpectrum && <SpectrumBar active={2} completed={[1]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 14px' : '8px 32px 16px',
                    display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                      gap: density === 'compact' ? 10 : 14, paddingBottom: 12 }}>
          <ThreadDivider label="Gap analysis · signed off · 9 of 9 resolved" tone="success" />
          <ThreadMsg who="S" body="Question 04 — Who's the v1 decider on scope changes?" />
          <ThreadMsg who="you" body="Me. Full-time PM. Engineering escalates to me." />
          <ThreadMsg who="S" body="Question 05 — Who is the primary user on day one?" />
          <ThreadMsg who="you" body="Solo engineers shipping side projects." />
          <ThreadMsg who="S" body="Question 06 — What's the v1 launch surface?" />
          <ThreadMsg who="you" body="Web app only. Mobile is post-v1." />
        </div>

        <QuestionBlock
          n={7}
          density={density}
          question="How should Sherpy handle conflicting answers between you and a future teammate?"
          options={[
            { letter: 'A', title: 'Last-writer-wins, with an audit trail',
              body: 'Whoever answers most recently sets the record. History is preserved but not blocking.',
              recommended: true },
            { letter: 'B', title: 'Flag conflicts for review',
              body: 'Sherpy pauses and surfaces both answers; one of you resolves before continuing.' },
            { letter: 'C', title: 'Owner-locked answers',
              body: 'Only the original answerer can change their answer. Others can comment.' },
            { letter: 'D', title: 'Defer — single-user only for v1',
              body: 'Skip the multi-user case entirely; revisit when you add seats.' },
          ]}
        />
      </div>
    </AppChrome>
  );
}

// I3 — Mid-chat: aside open above the dimmed question, AI mid-response
function I_MidChat({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={2} completed={[1]} density={density}>
      <ChromeHeader phase="Business requirements" stage="in progress" density={density} />
      {showSpectrum && <SpectrumBar active={2} completed={[1]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 14px' : '8px 32px 16px',
                    display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                      gap: density === 'compact' ? 8 : 12, paddingBottom: 8 }}>
          <ThreadMsg who="S" body="Question 06 — What's the v1 launch surface?" />
          <ThreadMsg who="you" body="Web app only." />
        </div>

        {/* Aside — paused above question */}
        <div style={{
          border: '1.5px solid var(--bot-2)', borderRadius: 8,
          background: 'var(--bot-2-soft, color-mix(in oklab, var(--bot-2) 10%, white))',
          padding: '10px 12px',
          filter: 'url(#pencil-soft)',
          display: 'flex', flexDirection: 'column', gap: 8,
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Eyebrow color="var(--bot-2)">Aside · Q07 paused — discussing options</Eyebrow>
            <span style={{ fontSize: 10, color: 'var(--neutral-5)', cursor: 'pointer',
                           fontFamily: 'var(--font-mono)' }}>close × · resume</span>
          </div>

          <AsideMsg who="YOU"
            body="If I pick A (last-writer-wins), what stops a teammate from accidentally overwriting my answer?" />
          <AsideMsg who="S"
            body="Two things. (1) The thread shows both versions side-by-side with timestamps. (2) Sherpy posts a notification to the original answerer when their answer gets overwritten — they can revert in one click." />
          <AsideMsg who="YOU"
            body="And what's the failure mode for B if we're both heads-down?" />
          {/* Mid-stream response */}
          <AsideMsg who="S" streaming
            body="The flagging path stalls if neither of you opens Sherpy. We'd queue a digest email after 24h, but if the question is on the critical path your run is paused. That's the trade-off — safer answers, slower throughput." />

          <div style={{
            borderTop: '1px dashed var(--bot-2)', paddingTop: 8,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: 'var(--neutral-5)', flex: 1, fontStyle: 'italic' }}>
              Ask another follow-up…
            </span>
            <button style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 999,
              border: 'none', background: 'var(--neutral-7)', color: 'white',
              cursor: 'pointer', filter: 'url(#pencil-soft)',
            }}>Send ↵</button>
          </div>
        </div>

        {/* The question itself, dimmed underneath */}
        <QuestionBlock
          n={7}
          density={density}
          dimmed
          showAsk={false}
          question="How should Sherpy handle conflicting answers between you and a future teammate?"
          options={[
            { letter: 'A', title: 'Last-writer-wins, with an audit trail',
              body: 'Whoever answers most recently sets the record.',
              recommended: true },
            { letter: 'B', title: 'Flag conflicts for review',
              body: 'Sherpy pauses and surfaces both answers.' },
          ]}
        />
      </div>
    </AppChrome>
  );
}

// AsideMsg — used inside the chat aside
function AsideMsg({ who, body, streaming }) {
  const isYou = who === 'YOU';
  return (
    <div style={{ fontSize: 12.5, color: 'var(--neutral-7)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        color: 'var(--bot-2)', fontFamily: 'var(--font-mono)', fontSize: 10,
        paddingTop: 2, fontWeight: isYou ? 600 : 400, minWidth: 28,
      }}>{who}</span>
      <span style={{ flex: 1, lineHeight: 1.5 }}>
        {body}
        {streaming && (
          <span style={{
            display: 'inline-block', width: 6, height: 12, marginLeft: 3,
            background: 'var(--bot-2)', verticalAlign: '-2px',
            animation: 'aside-blink 1s steps(2) infinite',
          }} />
        )}
      </span>
    </div>
  );
}

// I4 — After chat: aside collapsed into a "chatted · N msgs" pill, options now full opacity, recommended one selected
function I_AfterChat({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={2} completed={[1]} density={density}>
      <ChromeHeader phase="Business requirements" stage="in progress" density={density} />
      {showSpectrum && <SpectrumBar active={2} completed={[1]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 14px' : '8px 32px 16px',
                    display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                      gap: density === 'compact' ? 10 : 14, paddingBottom: 12 }}>
          <ThreadMsg who="S" body="Question 06 — What's the v1 launch surface?" />
          <ThreadMsg who="you" body="Web app only." />
        </div>

        <QuestionBlock
          n={7}
          density={density}
          selected="A"
          askPill={<ChattedPill count={4} />}
          question="How should Sherpy handle conflicting answers between you and a future teammate?"
          options={[
            { letter: 'A', title: 'Last-writer-wins, with an audit trail',
              body: 'Whoever answers most recently sets the record. History is preserved but not blocking.',
              recommended: true },
            { letter: 'B', title: 'Flag conflicts for review',
              body: 'Sherpy pauses and surfaces both answers; one of you resolves before continuing.' },
            { letter: 'C', title: 'Owner-locked answers',
              body: 'Only the original answerer can change their answer. Others can comment.' },
            { letter: 'D', title: 'Defer — single-user only for v1',
              body: 'Skip the multi-user case entirely.' },
          ]}
        />
      </div>
    </AppChrome>
  );
}

// I5 — Interview complete · generating the document
function I_Complete({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={2} completed={[1]} density={density}>
      <ChromeHeader phase="Business requirements" stage="complete" density={density} />
      {showSpectrum && <SpectrumBar active={2} completed={[1]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 14px' : '8px 32px 16px',
                    display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Closing thread tail */}
        <div style={{ display: 'flex', flexDirection: 'column',
                      gap: density === 'compact' ? 8 : 12, paddingBottom: 14 }}>
          <ThreadMsg who="S" body="Question 13 — Any compliance constraints (SOC2, HIPAA, GDPR)?" />
          <ThreadMsg who="you" body="GDPR only. EU customers from day one." />
          <ThreadMsg who="S" body="Question 14 — What's the rollback bar before we ship v1?" />
          <ThreadMsg who="you" body="One-click revert from the run page; no data loss." />
          <ThreadDivider label="Business requirements · 14 questions answered" tone="success" />
        </div>

        {/* Generating state — centered */}
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '8px 0 24px' }}>
          <div style={{
            width: 540, display: 'flex', flexDirection: 'column', gap: 18,
            alignItems: 'center', textAlign: 'center',
          }}>
            {/* Sage check medallion */}
            <div style={{
              width: 56, height: 56, borderRadius: 999,
              background: 'var(--bot-2-soft)',
              border: '1.5px solid var(--bot-2)',
              display: 'grid', placeItems: 'center',
              filter: 'url(#pencil-soft)',
              fontSize: 26, color: 'var(--bot-2)', lineHeight: 1,
            }}>✓</div>

            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 26,
              letterSpacing: '-0.015em', color: 'var(--neutral-7)', lineHeight: 1.15,
            }}>
              Interview complete.
            </div>

            <div style={{ fontSize: 13, color: 'var(--neutral-5)', maxWidth: 420, lineHeight: 1.5 }}>
              Sherpy is drafting your <strong>business requirements</strong> document.
              You'll review it before we move to technical requirements.
            </div>

            {/* Animated progress bar — sage stripe sweeping */}
            <div style={{
              width: '100%', height: 6, borderRadius: 999,
              background: 'var(--neutral-2)', overflow: 'hidden',
              filter: 'url(#pencil-soft)', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: '40%',
                background: 'var(--bot-2)', borderRadius: 999,
                animation: 'gen-sweep 1.6s ease-in-out infinite',
              }} />
            </div>

            {/* Sub-status — running checklist */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--neutral-5)',
              alignItems: 'flex-start', textAlign: 'left',
              border: '1.5px dashed var(--neutral-3)', borderRadius: 8,
              padding: '10px 14px', filter: 'url(#pencil-soft)',
              background: 'white', minWidth: 360,
            }}>
              <span><span style={{ color: 'var(--success)' }}>✓</span> consolidating 14 answers</span>
              <span><span style={{ color: 'var(--success)' }}>✓</span> resolving cross-references</span>
              <span><span style={{ color: 'var(--bot-2)' }}>◐</span> drafting executive summary…</span>
              <span style={{ color: 'var(--neutral-4)' }}>◯ formatting requirements list</span>
              <span style={{ color: 'var(--neutral-4)' }}>◯ generating review checklist</span>
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--neutral-5)', fontStyle: 'italic' }}>
              ~10 seconds. You can leave this tab open.
            </div>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}

// ============================================================
// STORYBOARD — wraps the four frames in a single artboard
// ============================================================

function InterviewFlow({ density = 'cozy', showSpectrum = true }) {
  const fw = 980;
  const fh = density === 'compact' ? 540 : 600;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '20px 4px' }}>
      <SubHeader n="Interview flow"
        hint="Question/answer · unknown total · 2-4 options w/ recommendation · per-Q chat aside" />

      {/* Row 1 — entering + steady state */}
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Frame label="I1" title="First question — entering from gap analysis"
               subtitle="Success divider closes the gap loop. Questions count up; no denominator."
               w={fw} h={fh}>
          <I_FirstQuestion density={density} showSpectrum={showSpectrum} />
        </Frame>
        <Frame label="I2" title="Mid-interview — typical question with options"
               subtitle="Stacked option cards. First option badged 'recommended'. ? Ask opens an aside."
               w={fw} h={fh}>
          <I_MidInterview density={density} showSpectrum={showSpectrum} />
        </Frame>
      </div>

      {/* Row 2 — chatting + after */}
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Frame label="I3" title="Mid-chat — discussing the options"
               subtitle="Aside above question; question dimmed; Sherpy mid-response."
               w={fw} h={fh}>
          <I_MidChat density={density} showSpectrum={showSpectrum} />
        </Frame>
        <Frame label="I4" title="After chat — picking with new context"
               subtitle="Aside collapses to a 'chatted · 4 msgs' pill. Recommended option selected; Send is live."
               w={fw} h={fh}>
          <I_AfterChat density={density} showSpectrum={showSpectrum} />
        </Frame>
      </div>

      {/* Row 3 — wrap-up */}
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Frame label="I5" title="Interview complete — generating the document"
               subtitle="Closing success divider; centered done state with sweep progress + checklist."
               w={fw} h={fh}>
          <I_Complete density={density} showSpectrum={showSpectrum} />
        </Frame>
      </div>

      <style>{`
        @keyframes aside-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes gen-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

// Export to window so the main wireframes file can mount it.
Object.assign(window, { InterviewFlow });
