/* eslint-disable */
// Sherpy onboarding wireframes — sketchy, low-fi, b&w with hint of color.

const { useState, useEffect, useRef } = React;

// ============================================================
// SHARED PRIMITIVES — sketchy lo-fi vocab
// ============================================================

const sketchStyles = {
  body: {
    fontFamily: 'var(--font-sans)',
    color: 'var(--neutral-7)',
    fontSize: 13,
    lineHeight: 1.45,
  },
  hand: {
    fontFamily: '"Caveat", "Kalam", "Comic Sans MS", cursive',
  },
};

// Wobbly pencil border via SVG filter
const PencilDefs = ({ sketchiness = 'soft' }) => {
  const presets = {
    clean:  { hard: 0,   soft: 0   },
    soft:   { hard: 1.4, soft: 0.8 },
    wobble: { hard: 2.6, soft: 1.7 },
  };
  const p = presets[sketchiness] || presets.soft;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id="pencil">
          <feTurbulence baseFrequency="0.04" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale={p.hard} />
        </filter>
        <filter id="pencil-soft">
          <feTurbulence baseFrequency="0.06" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale={p.soft} />
        </filter>
      </defs>
    </svg>
  );
};

// Sketchy box (the workhorse — pencil-wobble border)
function Box({ children, style, color, dashed, fill, density = 'cozy', onClick, hover }) {
  const pad = density === 'compact' ? '8px 10px' : density === 'airy' ? '20px 22px' : '12px 14px';
  return (
    <div
      onClick={onClick}
      style={{
        border: `1.5px ${dashed ? 'dashed' : 'solid'} ${color || 'var(--neutral-7)'}`,
        background: fill || 'transparent',
        borderRadius: 6,
        padding: pad,
        filter: 'url(#pencil-soft)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 140ms',
        ...style,
      }}
      onMouseEnter={hover ? (e) => (e.currentTarget.style.background = 'var(--neutral-1)') : undefined}
      onMouseLeave={hover ? (e) => (e.currentTarget.style.background = fill || 'transparent') : undefined}
    >
      {children}
    </div>
  );
}

// Sketchy line
function Line({ w = '100%', style, color, weight = 1.5, dashed }) {
  return (
    <div
      style={{
        width: w,
        height: 0,
        borderTop: `${weight}px ${dashed ? 'dashed' : 'solid'} ${color || 'var(--neutral-6)'}`,
        filter: 'url(#pencil-soft)',
        ...style,
      }}
    />
  );
}

// Hand-written annotation
function Note({ children, style, color, rotate = 0 }) {
  return (
    <span
      style={{
        ...sketchStyles.hand,
        fontSize: 16,
        color: color || 'var(--accent-2)',
        transform: `rotate(${rotate}deg)`,
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// Squiggly arrow callout
function Arrow({ d, style, color }) {
  return (
    <svg
      style={{ position: 'absolute', overflow: 'visible', filter: 'url(#pencil)', ...style }}
      width="80" height="60" viewBox="0 0 80 60" fill="none"
    >
      <path d={d} stroke={color || 'var(--accent-2)'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Eyebrow({ children, style, color }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: color || 'var(--neutral-5)',
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Placeholder text (gray bars)
function Placeholder({ w = '100%', h = 8, color, style }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: color || 'var(--neutral-3)',
        borderRadius: 2,
        opacity: 0.5,
        ...style,
      }}
    />
  );
}

// Phase rail — vertical
function PhaseRail({ active = 2, completed = [1], skipped = [], compact = false }) {
  const phases = [
    { n: 1, name: 'Gap analysis', color: 'var(--bot-1)' },
    { n: 2, name: 'Business reqs', color: 'var(--bot-2)' },
    { n: 3, name: 'Technical reqs', color: 'var(--bot-3)' },
    { n: 4, name: 'Style anchors', color: 'var(--bot-4)' },
    { n: 5, name: 'Implementation', color: 'var(--bot-5)' },
    { n: 6, name: 'Plan review', color: 'var(--bot-6)' },
    { n: 7, name: 'ADRs', color: 'var(--bot-7)' },
    { n: 8, name: 'Timeline', color: 'var(--bot-8)' },
    { n: 9, name: 'QA plan', color: 'var(--bot-9)' },
    { n: 10, name: 'Summaries', color: 'var(--neutral-6)' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6 }}>
      {phases.map((p) => {
        const isDone = completed.includes(p.n);
        const isActive = p.n === active;
        const isSkipped = skipped.includes(p.n);
        return (
          <div
            key={p.n}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: compact ? '4px 6px' : '6px 8px',
              borderRadius: 4,
              background: isActive ? 'var(--neutral-1)' : 'transparent',
              border: isActive ? '1.5px solid var(--neutral-7)' : '1.5px solid transparent',
              filter: isActive ? 'url(#pencil-soft)' : 'none',
              opacity: isSkipped ? 0.4 : 1,
            }}
          >
            <div
              style={{
                width: 16, height: 16, borderRadius: 999,
                border: `1.5px solid ${isDone ? 'var(--success)' : isActive ? 'var(--neutral-7)' : 'var(--neutral-4)'}`,
                background: isDone ? 'var(--success)' : isActive ? 'var(--neutral-7)' : 'transparent',
                color: 'white', display: 'grid', placeItems: 'center',
                fontSize: 9, fontFamily: 'var(--font-mono)', flexShrink: 0,
                filter: 'url(#pencil-soft)',
              }}
            >
              {isDone ? '✓' : isSkipped ? '–' : isActive ? '●' : ''}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neutral-4)',
                letterSpacing: '0.08em',
              }}>
                STEP {String(p.n).padStart(2, '0')}
              </div>
              <div style={{
                fontSize: compact ? 11 : 12,
                color: isActive ? 'var(--neutral-7)' : isDone ? 'var(--neutral-6)' : 'var(--neutral-5)',
                fontWeight: isActive ? 500 : 400,
                textDecoration: isSkipped ? 'line-through' : 'none',
              }}>
                {p.name}
              </div>
            </div>
            {isActive && <Note rotate={-4} style={{ fontSize: 13 }}>here</Note>}
          </div>
        );
      })}
    </div>
  );
}

// Sherpy logo / wordmark — tiny mountain
function Brand({ size = 18 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: 'url(#pencil-soft)' }}>
        <path d="M3 19 L11 7 L19 19 Z" stroke="var(--neutral-7)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <path d="M7 19 L13 11 L17 19" stroke="var(--neutral-5)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      </svg>
      <span style={{ fontSize: size * 0.85, fontWeight: 500, letterSpacing: '-0.02em' }}>sherpy</span>
    </div>
  );
}

// Frame container — a single screen mock
function Frame({ title, subtitle, children, w = 720, h = 460, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        {label && (
          <div style={{
            ...sketchStyles.hand, fontSize: 22, color: 'var(--accent-2)', fontWeight: 600,
          }}>
            {label}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-7)' }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--neutral-5)' }}>{subtitle}</div>
          )}
        </div>
      </div>
      <div
        style={{
          width: w, height: h, position: 'relative',
          background: '#FFFEFB',
          border: '1.5px solid var(--neutral-7)',
          borderRadius: 8,
          filter: 'url(#pencil-soft)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// App chrome inside a frame — top header + left rail
function AppChrome({ children, activePhase = 2, completed = [1], skipped = [], showRail = true, density = 'cozy', railVariant = 'pipeline' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: showRail ? '180px 1fr' : '1fr', height: '100%' }}>
      {showRail && (railVariant === 'workspace' ? <WorkspaceRail /> : (
        <aside style={{
          background: 'var(--neutral-1)',
          borderRight: '1.5px solid var(--neutral-3)',
          padding: '14px 10px',
          display: 'flex', flexDirection: 'column', gap: 14,
          filter: 'url(#pencil-soft)',
        }}>
          <Brand size={18} />
          <div>
            <Eyebrow style={{ marginBottom: 6, paddingLeft: 4 }}>Project</Eyebrow>
            <div style={{
              fontSize: 12, padding: '5px 8px', borderRadius: 4,
              background: 'white', border: '1.5px solid var(--neutral-3)',
              fontFamily: 'var(--font-mono)',
            }}>
              sherpy-web
            </div>
          </div>
          <div>
            <Eyebrow style={{ marginBottom: 6, paddingLeft: 4 }}>Pipeline</Eyebrow>
            <PhaseRail active={activePhase} completed={completed} skipped={skipped} compact={density === 'compact'} />
          </div>
        </aside>
      ))}
      <div style={{ minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

// Workspace rail — matches the design system's web-app: projects + recent runs
function WorkspaceRail() {
  return (
    <aside style={{
      background: 'var(--neutral-1)',
      borderRight: '1.5px solid var(--neutral-3)',
      padding: '14px 10px',
      display: 'flex', flexDirection: 'column', gap: 14,
      filter: 'url(#pencil-soft)',
      minWidth: 0,
    }}>
      <Brand size={18} />
      <div>
        <Eyebrow style={{ marginBottom: 4, paddingLeft: 4 }}>Workspace</Eyebrow>
        <NavItem active label="sherpy-web" count="5" />
        <NavItem label="billing-platform" />
        <NavItem label="+ New project" muted />
      </div>
      <div>
        <Eyebrow style={{ marginBottom: 4, paddingLeft: 4 }}>Recent runs</Eyebrow>
        <NavItem label="biz-req-04" dot="var(--accent-2)" />
        <NavItem label="biz-req-03" dot="var(--success)" />
        <NavItem label="style-anchors" dot="var(--neutral-4)" />
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px',
                    borderTop: '1px solid var(--neutral-3)', paddingTop: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--neutral-3)',
                       display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 9.5,
                       color: 'var(--neutral-7)' }}>KW</span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--neutral-7)' }}>Kyle Welsby</span>
          <span style={{ fontSize: 10, color: 'var(--neutral-5)', fontFamily: 'var(--font-mono)' }}>@validkeys</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ label, count, active, muted, dot }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 8px',
      borderRadius: 4,
      background: active ? 'white' : 'transparent',
      border: active ? '1.5px solid var(--neutral-3)' : '1.5px solid transparent',
      filter: active ? 'url(#pencil-soft)' : 'none',
      fontSize: 11.5,
      color: muted ? 'var(--neutral-5)' : 'var(--neutral-7)',
      cursor: 'pointer',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, flexShrink: 0 }} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                     fontFamily: dot ? 'var(--font-mono)' : 'var(--font-sans)' }}>{label}</span>
      {count && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--neutral-5)' }}>{count}</span>}
    </div>
  );
}

// Horizontal multi-color spectrum bar — matches the design system's web-app reference.
// 9 segments mapped to bot-1 … bot-9; segment labels show on hover (hint shown for current).
function SpectrumBar({ active = 2, completed = [1], showLabels = false, density = 'cozy' }) {
  const phases = [
    { n: 1, name: 'Gap analysis',           c: 'var(--bot-1)' },
    { n: 2, name: 'Business requirements',  c: 'var(--bot-2)' },
    { n: 3, name: 'Technical requirements', c: 'var(--bot-3)' },
    { n: 4, name: 'Style anchors',          c: 'var(--bot-4)' },
    { n: 5, name: 'Implementation',         c: 'var(--bot-5)' },
    { n: 6, name: 'Plan review',            c: 'var(--bot-6)' },
    { n: 7, name: 'Architecture',           c: 'var(--bot-7)' },
    { n: 8, name: 'Timeline',               c: 'var(--bot-8)' },
    { n: 9, name: 'QA test plan',           c: 'var(--bot-9)' },
  ];
  return (
    <div style={{ padding: density === 'compact' ? '10px 24px 8px' : '14px 32px 10px', flexShrink: 0 }}>
      <div style={{ display: 'flex', height: 5, gap: 2, borderRadius: 999, overflow: 'hidden' }}>
        {phases.map((p) => {
          const done = completed.includes(p.n);
          const now = p.n === active;
          const op = now ? 1 : done ? 0.95 : 0.22;
          return (
            <div key={p.n} title={`${String(p.n).padStart(2,'0')} · ${p.name}`}
                 style={{
                   flex: 1,
                   background: p.c,
                   opacity: op,
                   borderRadius: 2,
                   boxShadow: now ? `0 0 0 1px rgba(255,255,255,0.6) inset, 0 0 10px ${p.c}` : 'none',
                   cursor: 'pointer',
                 }} />
          );
        })}
      </div>
      {showLabels && (
        <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
          {phases.map((p) => {
            const now = p.n === active;
            const done = completed.includes(p.n);
            return (
              <div key={p.n} style={{
                flex: 1, textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 8.5,
                color: now ? 'var(--neutral-7)' : done ? 'var(--neutral-5)' : 'var(--neutral-4)',
                fontWeight: now ? 500 : 400,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{String(p.n).padStart(2,'0')}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Header bar that goes ABOVE the spectrum — matches web-app: crumb · stage label · mode toggle
function ChromeHeader({ phase = 'Business requirements', stage = '02 of 10', density = 'cozy', skipAction }) {
  return (
    <div style={{
      padding: density === 'compact' ? '12px 24px 0' : '14px 32px 0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      flexShrink: 0,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)',
        letterSpacing: '0.04em', display: 'flex', gap: 6,
      }}>
        <span style={{ cursor: 'pointer' }}>sherpy-web</span>
        <span style={{ color: 'var(--neutral-4)' }}>/</span>
        <span style={{ cursor: 'pointer' }}>run-04</span>
        <span style={{ color: 'var(--neutral-4)' }}>/</span>
        <span style={{ color: 'var(--neutral-7)' }}>{phase.toLowerCase()}</span>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: 'var(--neutral-4)' }}>stage {stage}</span>
        <span>·</span>
        <span style={{ color: 'var(--neutral-7)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>{phase}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {skipAction && (
          <button style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 999,
            border: '1.5px solid var(--neutral-7)', background: 'white',
            color: 'var(--neutral-7)', cursor: 'pointer', fontWeight: 500,
            filter: 'url(#pencil-soft)', display: 'flex', alignItems: 'center', gap: 4,
            whiteSpace: 'nowrap',
          }}>{skipAction} →</button>
        )}
        <div style={{
          display: 'inline-flex', padding: 2, borderRadius: 999,
          background: 'var(--neutral-1)', border: '1.5px solid var(--neutral-3)',
          filter: 'url(#pencil-soft)',
        }}>
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 999,
            background: 'white', border: '1.5px solid var(--neutral-3)', fontWeight: 500,
          }}>Build</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, color: 'var(--neutral-5)' }}>Review</span>
        </div>
      </div>
    </div>
  );
}

// Question card — the workhorse: prompt + suggested answers + ask button + free text
function QuestionCard({
  qNum = '4 / 17',
  phase = 'Business requirements',
  question,
  suggestions = [],
  selected,
  onSelect,
  onAsk,
  showAsk = false,
  density = 'cozy',
  showFree = true,
}) {
  return (
    <div style={{
      background: 'white',
      border: '1.5px solid var(--neutral-7)',
      borderRadius: 8,
      padding: density === 'compact' ? '14px 16px' : '20px 22px',
      filter: 'url(#pencil-soft)',
      display: 'flex', flexDirection: 'column',
      gap: density === 'compact' ? 10 : 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>{phase} · Q{qNum}</Eyebrow>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--neutral-5)',
          letterSpacing: '0.06em',
        }}>
          single select
        </div>
      </div>

      <div style={{
        fontSize: density === 'compact' ? 16 : 18,
        fontWeight: 500,
        color: 'var(--neutral-7)',
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      }}>
        {question}
      </div>

      {/* Ask-back inline */}
      {showAsk && <AskBackPanel />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 5 : 7 }}>
        <Eyebrow color="var(--neutral-5)">Suggested answers · pick or edit</Eyebrow>
        {suggestions.map((s, i) => {
          const isSel = selected === i;
          return (
            <div
              key={i}
              onClick={() => onSelect && onSelect(i)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: density === 'compact' ? '8px 10px' : '10px 12px',
                border: `1.5px solid ${isSel ? 'var(--neutral-7)' : 'var(--neutral-3)'}`,
                background: isSel ? 'var(--neutral-1)' : 'white',
                borderRadius: 5,
                cursor: 'pointer',
                filter: 'url(#pencil-soft)',
                fontSize: 13,
              }}
            >
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                width: 16, height: 16, border: '1.5px solid var(--neutral-5)',
                borderRadius: 3, display: 'grid', placeItems: 'center',
                background: isSel ? 'var(--neutral-7)' : 'transparent',
                color: isSel ? 'white' : 'var(--neutral-5)',
                flexShrink: 0,
              }}>
                {String.fromCharCode(65 + i)}
              </div>
              <span style={{ flex: 1, color: 'var(--neutral-7)' }}>{s}</span>
            </div>
          );
        })}
      </div>

      {showFree && (
        <div style={{
          border: '1.5px dashed var(--neutral-3)',
          borderRadius: 5,
          padding: '10px 12px',
          filter: 'url(#pencil-soft)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral-4)' }}>
            E ·
          </span>
          <span style={{ fontSize: 12, color: 'var(--neutral-4)', fontStyle: 'italic' }}>
            Or type your own answer…
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <button
          onClick={onAsk}
          style={{
            background: showAsk ? 'var(--neutral-7)' : 'transparent',
            color: showAsk ? 'white' : 'var(--neutral-7)',
            border: '1.5px solid var(--neutral-7)',
            borderRadius: 999,
            padding: '5px 12px',
            fontSize: 11.5,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            filter: 'url(#pencil-soft)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)' }}>?</span>
          Ask Sherpy about this
        </button>
        <button style={{
          background: 'var(--neutral-7)', color: 'white',
          border: 'none', borderRadius: 4,
          padding: '6px 14px', fontSize: 12, fontWeight: 500,
          cursor: 'pointer', filter: 'url(#pencil-soft)',
          opacity: selected != null ? 1 : 0.4,
        }}>
          Submit answer →
        </button>
      </div>
    </div>
  );
}

// Inline ask-back mini-thread
function AskBackPanel() {
  return (
    <div style={{
      border: '1.5px solid var(--accent-2)',
      borderRadius: 6,
      padding: '10px 12px',
      filter: 'url(#pencil-soft)',
      background: 'var(--accent-2-soft)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow color="var(--accent-2)">Aside · ask Sherpy</Eyebrow>
        <span style={{ fontSize: 10, color: 'var(--neutral-5)', cursor: 'pointer' }}>collapse ×</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--neutral-5)',
          padding: '2px 6px', border: '1.5px solid var(--neutral-4)', borderRadius: 999,
          flexShrink: 0,
        }}>you</span>
        <div style={{ fontSize: 12.5, color: 'var(--neutral-7)' }}>
          What's the difference between an "outcome" and an "acceptance criterion"?
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'white',
          padding: '2px 6px', background: 'var(--neutral-7)', borderRadius: 999,
          flexShrink: 0,
        }}>S</span>
        <div style={{ fontSize: 12.5, color: 'var(--neutral-7)', lineHeight: 1.45 }}>
          An outcome is the user-visible change you want — measurable, often a metric.
          An acceptance criterion is a binary check that proves the outcome is met.
          Outcomes belong in <code style={{
            fontFamily: 'var(--font-mono)', fontSize: 11.5,
            background: 'white', padding: '1px 4px', borderRadius: 3,
          }}>outcomes:</code>; acceptance lives under <code style={{
            fontFamily: 'var(--font-mono)', fontSize: 11.5,
            background: 'white', padding: '1px 4px', borderRadius: 3,
          }}>acceptance:</code>.
        </div>
      </div>
      <div style={{
        border: '1.5px dashed var(--neutral-4)', borderRadius: 4,
        padding: '6px 8px', fontSize: 11.5, color: 'var(--neutral-5)', fontStyle: 'italic',
      }}>
        Ask a follow-up… (or close to return to Q4)
      </div>
    </div>
  );
}

// ============================================================
// DIRECTION 2 — "TRAIL" (climbing/path metaphor, scrolly thread)
// ============================================================

function Direction2({ density = 'cozy', showSpectrum = true, showAskback = true }) {
  const fw = 980;
  const fh = density === 'compact' ? 520 : 580;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '20px 4px' }}>
      {/* Row 1 — pre-flight + intake */}
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Frame label="A" title="Blank state — pick your starting point"
               subtitle="Outside the run. Pre-flight only." w={fw} h={fh}>
          <D2_Blank density={density} />
        </Frame>
        <Frame label="B" title="Intake captured — about to start gap analysis"
               subtitle="Doc pasted. Spectrum bar shows nothing-done-yet." w={fw} h={fh}>
          <D2_BaseCamp density={density} showSpectrum={showSpectrum} />
        </Frame>
      </div>

      {/* Row 2 — gap analysis cycle (the new flow) */}
      <SubHeader n="Gap analysis cycle" hint="Worksheet generated → filled offline → uploaded → merged. Skip-to-interview is one click away the whole time." />
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Frame label="C" title="Gaps worksheet generated"
               subtitle="9 gaps detected. Download to fill offline, or skip to start the interview now."
               w={fw} h={fh}>
          <D2_GapsGenerated density={density} showSpectrum={showSpectrum} />
        </Frame>
        <Frame label="D" title="Awaiting filled worksheet"
               subtitle="Run paused. Drop-zone for the filled doc. Skip-to-interview still available."
               w={fw} h={fh}>
          <D2_AwaitingFill density={density} showSpectrum={showSpectrum} />
        </Frame>
        <Frame label="E" title="Merging answers into the worksheet"
               subtitle="AI reads the filled doc row-by-row; flags filled / review / pending."
               w={fw} h={fh}>
          <D2_Merging density={density} showSpectrum={showSpectrum} />
        </Frame>
        <Frame label="F" title="Worksheet updated — ready for the interview"
               subtitle="One row flagged for review; rest accepted. CTA flips to 'Begin interview'."
               w={fw} h={fh}>
          <D2_GapsResolved density={density} showSpectrum={showSpectrum} />
        </Frame>
      </div>

      {/* Row 3 — interview proper */}
      <SubHeader n="Business interview" hint="Same shell, phase 02. Composer pinned, suggestions live in the composer." />
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Frame label="G" title="Mid-interview — Q&A thread"
               subtitle="Smart suggestions on top of the composer; free text below; ? Ask opens an aside."
               w={fw} h={fh}>
          <D2_Thread density={density} showSpectrum={showSpectrum} />
        </Frame>
        {showAskback && (
          <Frame label="H" title="Ask-back inline above the composer"
                 subtitle="Current Q paused; thread context preserved; close × resumes."
                 w={fw} h={fh}>
            <D2_Ask density={density} showSpectrum={showSpectrum} />
          </Frame>
        )}
      </div>
    </div>
  );
}

function SubHeader({ n, hint }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6,
      paddingBottom: 8, borderBottom: '1px dashed var(--neutral-3)',
    }}>
      <span style={{
        fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--neutral-7)',
        letterSpacing: '-0.015em',
      }}>{n}</span>
      {hint && <span style={{ fontSize: 12, color: 'var(--neutral-5)', fontStyle: 'italic' }}>
        {hint}
      </span>}
    </div>
  );
}

function D2_Blank({ density = 'cozy' }) {
  return (
    <AppChrome railVariant="workspace" activePhase={0} completed={[]} density={density}>
      <div style={{
        padding: density === 'compact' ? '12px 24px 0' : '14px 32px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)', letterSpacing: '0.04em' }}>
          sherpy-web <span style={{ color: 'var(--neutral-4)' }}>/</span> <span style={{ color: 'var(--neutral-7)' }}>new run</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)' }}>
          pre-flight · 0 of 10
        </div>
      </div>
      <div style={{ display: 'flex', height: 5, gap: 2, margin: density === 'compact' ? '10px 24px 8px' : '14px 32px 10px', opacity: 0.22 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <div key={n} style={{ flex: 1, background: `var(--bot-${n})`, borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '0 32px 24px' }}>
        <div style={{ width: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 32, lineHeight: 1.05,
            letterSpacing: '-0.02em', color: 'var(--neutral-7)',
          }}>
            What are you bringing in?
          </div>
          <div style={{ fontSize: 13, color: 'var(--neutral-5)' }}>
            Sherpy routes you to the right starting step. You can revisit earlier steps once running, but you can't skip ahead.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
            <PathCard
              title="I have a doc"
              sub="Confluence, PRD, brief — paste it in. Sherpy runs gap analysis first."
              meta="Most common · ~5 min"
              active />
            <PathCard
              title="I have an idea"
              sub="Just a few sentences. Skip gap analysis, go straight to the business interview."
              meta="Fast path" />
          </div>
        </div>
      </div>
    </AppChrome>
  );
}

function PathCard({ title, sub, meta, active }) {
  return (
    <div style={{
      padding: '14px 14px 12px',
      border: `1.5px solid ${active ? 'var(--neutral-7)' : 'var(--neutral-3)'}`,
      background: active ? 'var(--neutral-1)' : 'white',
      borderRadius: 6,
      filter: 'url(#pencil-soft)',
      cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-7)' }}>{title}</div>
        {meta && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--neutral-5)' }}>{meta}</div>}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--neutral-5)', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

// Tiny trail svg illo — bottom of D2 blank
function TrailIllustration() {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, opacity: 0.35, pointerEvents: 'none' }}>
      <svg viewBox="0 0 680 80" width="100%" height="100%" style={{ filter: 'url(#pencil-soft)' }}>
        <path d="M 0 70 Q 100 50 180 60 Q 260 70 340 40 Q 420 10 520 30 Q 600 45 680 25"
              stroke="var(--neutral-5)" strokeWidth="1.5" fill="none" strokeDasharray="4 5" />
        {[80, 200, 330, 460, 600].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={i === 0 ? 60 : i === 1 ? 65 : i === 2 ? 50 : i === 3 ? 25 : 30} r="3"
                    fill="var(--neutral-6)" />
            <text x={x} y={i === 0 ? 78 : i === 1 ? 80 : i === 2 ? 68 : i === 3 ? 14 : 18}
                  fontSize="9" fontFamily="var(--font-mono)" fill="var(--neutral-5)" textAnchor="middle">
              {['intake', 'gap', 'biz', 'tech', 'ship'][i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function D2_BaseCamp({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={1} completed={[]} density={density}>
      <ChromeHeader phase="Gap analysis" stage="01 of 09" density={density} />
      {showSpectrum && <SpectrumBar active={1} completed={[]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 20px' : '10px 32px 24px',
                    display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 10 : 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: density === 'compact' ? 22 : 26,
            color: 'var(--neutral-7)', letterSpacing: '-0.015em',
          }}>
            Intake captured. Ready to find the gaps.
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)' }}>
            est. 4 min
          </span>
        </div>

        <div style={{
          border: '1.5px solid var(--neutral-3)', borderRadius: 6,
          padding: '12px 14px', filter: 'url(#pencil-soft)', background: 'white',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              padding: '2px 7px', borderRadius: 999,
              background: 'var(--bot-1-soft, var(--neutral-1))',
              border: '1.5px solid var(--bot-1)',
              color: 'var(--neutral-7)',
            }}>📄 Confluence · PRD-2026-04</span>
            <span style={{ fontSize: 11, color: 'var(--neutral-5)' }}>2,140 words · 5 sections · pasted just now</span>
            <a style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--neutral-5)', cursor: 'pointer' }}>preview ↗</a>
          </div>
          <div style={{ borderTop: '1px dashed var(--neutral-3)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Placeholder w="92%" />
            <Placeholder w="78%" />
            <Placeholder w="64%" />
          </div>
        </div>

        <div style={{
          background: 'var(--neutral-1)', border: '1.5px solid var(--neutral-3)',
          borderRadius: 6, padding: '10px 14px', filter: 'url(#pencil-soft)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <Eyebrow>What happens next</Eyebrow>
          <div style={{ fontSize: 12.5, color: 'var(--neutral-7)', lineHeight: 1.5 }}>
            Sherpy reads the doc and surfaces missing pieces (success metrics, user roles, constraints).
            You confirm or fill the gaps, then we move into the business interview proper.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 'auto' }}>
          <button style={{
            background: 'var(--neutral-7)', color: 'white',
            border: 'none', borderRadius: 5, padding: '9px 18px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            filter: 'url(#pencil-soft)',
          }}>Begin gap analysis →</button>
          <button style={{
            background: 'transparent', color: 'var(--neutral-5)',
            border: '1.5px solid var(--neutral-3)', borderRadius: 5,
            padding: '8px 14px', fontSize: 12.5, cursor: 'pointer',
            filter: 'url(#pencil-soft)',
          }}>Skip — go straight to business reqs</button>
          <span style={{ fontSize: 11, color: 'var(--neutral-5)', marginLeft: 'auto' }}>
            ⌘K to switch project · ⌘/ for help
          </span>
        </div>
      </div>
    </AppChrome>
  );
}

function TinyTrail() {
  const stops = [
    { l: 'gap', s: 'now', x: 30 },
    { l: 'biz', s: 'next', x: 130 },
    { l: 'tech', s: '', x: 220 },
    { l: 'style', s: '', x: 290 },
    { l: 'plan', s: '', x: 360 },
    { l: 'qa', s: '', x: 430 },
    { l: 'ship', s: 'goal', x: 480 },
  ];
  return (
    <svg viewBox="0 0 500 50" width="100%" height="50" style={{ filter: 'url(#pencil-soft)' }}>
      <path d="M 20 30 Q 80 15 130 30 Q 200 45 290 20 Q 380 0 480 20"
            stroke="var(--neutral-5)" strokeWidth="1.5" fill="none" strokeDasharray="4 5" />
      {stops.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={i === 0 ? 30 : i === 1 ? 30 : i === 2 ? 38 : i === 3 ? 30 : i === 4 ? 18 : i === 5 ? 12 : 20}
                  r={s.s === 'now' ? '5' : '3.5'}
                  fill={s.s === 'now' ? 'var(--accent-2)' : s.s === 'goal' ? 'var(--neutral-7)' : 'white'}
                  stroke="var(--neutral-7)" strokeWidth="1.5" />
          <text x={s.x} y="48" fontSize="9" fontFamily="var(--font-mono)"
                fill={s.s === 'now' ? 'var(--accent-2)' : 'var(--neutral-5)'} textAnchor="middle">
            {s.l}
          </text>
        </g>
      ))}
    </svg>
  );
}

function D2_GapsGenerated({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={1} completed={[]} density={density}>
      <ChromeHeader phase="Gap analysis" stage="01 of 09" density={density}
        skipAction="Skip — start business interview" />
      {showSpectrum && <SpectrumBar active={1} completed={[]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 16px' : '8px 32px 20px',
                    display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 10 : 14, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: density === 'compact' ? 22 : 26,
            color: 'var(--neutral-7)', letterSpacing: '-0.015em',
          }}>
            9 gaps to resolve before the business interview.
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)' }}>
            generated 12s ago · gpt-4
          </span>
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--neutral-5)', maxWidth: 720, lineHeight: 1.5 }}>
          Sherpy read the doc and surfaced what's missing. Download the worksheet, fill it offline
          with the right people, then upload the filled version — Sherpy will merge the answers in.
          You can also skip and answer these in the interview.
        </div>

        <div style={{
          border: '1.5px solid var(--neutral-3)', borderRadius: 8, background: 'white',
          filter: 'url(#pencil-soft)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: '1.5px solid var(--neutral-3)',
            background: 'var(--neutral-1)', display: 'flex',
            alignItems: 'center', gap: 10,
          }}>
            <Eyebrow>gap-worksheet · sherpy-web · run-04</Eyebrow>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--neutral-5)',
                           fontFamily: 'var(--font-mono)' }}>9 open · 0 filled</span>
          </div>
          <WorksheetGapRow n="01" cat="Success metrics" q="What's the v1 success metric and target value?"
                  why="Doc states 'measure outcomes' but no metric defined." />
          <WorksheetGapRow n="02" cat="User roles" q="Are there read-only viewers, or is it write-access for everyone?"
                  why="PRD lists 'users' once. Permissions implied but not specified." />
          <WorksheetGapRow n="03" cat="Constraints" q="Hard launch date — is it a real deadline or directional?"
                  why="'Q2 launch' mentioned without commitment language." />
          <WorksheetGapRow n="04" cat="Scope" q="Does v1 include billing, or is that a fast-follow?" muted
                  why="Billing referenced in goals but not in feature list." />
          <WorksheetGapRow n="05" cat="Integrations" q="Which existing systems must this read from / write to?" muted />
          <div style={{
            padding: '8px 14px', borderTop: '1.5px solid var(--neutral-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)',
          }}>
            + 4 more gaps · scroll to view
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 'auto' }}>
          <button style={{
            background: 'var(--neutral-7)', color: 'white',
            border: 'none', borderRadius: 5, padding: '9px 18px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            filter: 'url(#pencil-soft)', display: 'flex', alignItems: 'center', gap: 6,
          }}>↓ Download worksheet (.md)</button>
          <button style={{
            background: 'transparent', color: 'var(--neutral-7)',
            border: '1.5px solid var(--neutral-7)', borderRadius: 5,
            padding: '8px 14px', fontSize: 12.5, cursor: 'pointer',
            filter: 'url(#pencil-soft)',
          }}>Copy as Confluence</button>
          <span style={{ fontSize: 11.5, color: 'var(--neutral-5)', marginLeft: 'auto' }}>
            We'll wait. Re-open this run when the worksheet is filled.
          </span>
        </div>
      </div>
    </AppChrome>
  );
}

// One gap row, used in B2 / B4 / B5
function WorksheetGapRow({ n, cat, q, why, status, muted }) {
  // status: undefined | 'filled' | 'review' | 'missing' | 'merging'
  const statusMeta = {
    filled:  { color: 'var(--success)',  bg: 'var(--bot-2-soft)',    label: '✓ filled' },
    review:  { color: 'var(--accent-2)', bg: 'var(--accent-2-soft)', label: '⚠ needs review' },
    missing: { color: 'var(--neutral-5)', bg: 'var(--neutral-1)',    label: '… still missing' },
    merging: { color: 'var(--neutral-7)', bg: 'var(--neutral-1)',    label: '◐ merging…' },
  };
  const s = status && statusMeta[status];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '34px 110px 1fr auto', gap: 10,
      padding: '9px 14px',
      borderTop: '1px solid var(--neutral-3)',
      alignItems: 'start',
      opacity: muted ? 0.55 : 1,
      background: s ? s.bg : 'transparent',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)',
                     paddingTop: 1 }}>{n}</span>
      <span style={{ fontSize: 11, color: 'var(--neutral-7)', fontWeight: 500, paddingTop: 1 }}>{cat}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--neutral-7)', lineHeight: 1.35 }}>{q}</span>
        {why && <span style={{ fontSize: 11, color: 'var(--neutral-5)', fontStyle: 'italic',
                               lineHeight: 1.4 }}>↳ {why}</span>}
      </div>
      {s ? (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: s.color,
          padding: '2px 8px', borderRadius: 999,
          border: `1.5px solid ${s.color}`, background: 'white',
          whiteSpace: 'nowrap', alignSelf: 'start',
        }}>{s.label}</span>
      ) : (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral-5)',
                       alignSelf: 'start', paddingTop: 2 }}>open</span>
      )}
    </div>
  );
}

function D2_AwaitingFill({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={1} completed={[]} density={density}>
      <ChromeHeader phase="Gap analysis" stage="01 of 09" density={density}
        skipAction="Skip — start business interview" />
      {showSpectrum && <SpectrumBar active={1} completed={[]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 16px' : '8px 32px 20px',
                    display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 10 : 14, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: density === 'compact' ? 22 : 26,
            color: 'var(--neutral-7)', letterSpacing: '-0.015em',
          }}>
            Worksheet downloaded. Awaiting answers.
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--neutral-5)' }}>
            run paused · 4 min ago
          </span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 240px', gap: 14, flex: 1, minHeight: 0,
        }}>
          {/* Drop zone */}
          <div style={{
            border: '2px dashed var(--neutral-4)', borderRadius: 10,
            background: 'var(--neutral-1)', filter: 'url(#pencil-soft)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, lineHeight: 1, opacity: 0.6 }}>↓</div>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--neutral-7)',
              letterSpacing: '-0.01em',
            }}>
              Drop the filled worksheet here
            </div>
            <div style={{ fontSize: 12, color: 'var(--neutral-5)', maxWidth: 360, lineHeight: 1.5 }}>
              Markdown, Word, or paste from Confluence. Sherpy will merge the answers row-by-row
              and flag anything that still needs your eyes.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button style={{
                background: 'var(--neutral-7)', color: 'white', border: 'none',
                borderRadius: 5, padding: '7px 14px', fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer', filter: 'url(#pencil-soft)',
              }}>Choose file…</button>
              <button style={{
                background: 'white', color: 'var(--neutral-7)',
                border: '1.5px solid var(--neutral-3)', borderRadius: 5,
                padding: '6px 12px', fontSize: 12.5, cursor: 'pointer',
                filter: 'url(#pencil-soft)',
              }}>Paste text</button>
            </div>
          </div>

          {/* Status sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div style={{
              border: '1.5px solid var(--neutral-3)', borderRadius: 6,
              padding: '10px 12px', background: 'white', filter: 'url(#pencil-soft)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <Eyebrow>Worksheet status</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--neutral-7)' }}>0</span>
                <span style={{ fontSize: 12, color: 'var(--neutral-5)' }}>of 9 filled</span>
              </div>
              <div style={{ height: 4, background: 'var(--neutral-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '0%', height: '100%', background: 'var(--bot-1)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--neutral-5)', marginTop: 2 }}>
                Last download: <span style={{ fontFamily: 'var(--font-mono)' }}>worksheet-v1.md</span>
              </div>
              <a style={{ fontSize: 11, color: 'var(--neutral-7)', textDecoration: 'underline',
                          cursor: 'pointer' }}>↓ download again</a>
            </div>

            <div style={{
              border: '1.5px solid var(--neutral-3)', borderRadius: 6,
              padding: '10px 12px', background: 'var(--neutral-1)', filter: 'url(#pencil-soft)',
              display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              <Eyebrow>Or skip the wait</Eyebrow>
              <div style={{ fontSize: 11.5, color: 'var(--neutral-7)', lineHeight: 1.45 }}>
                Start the business interview now. Sherpy will ask you the unfilled gaps inline,
                one at a time, before moving on.
              </div>
              <button style={{
                marginTop: 4, alignSelf: 'flex-start',
                fontSize: 12, padding: '5px 12px', borderRadius: 4,
                border: '1.5px solid var(--neutral-7)', background: 'white',
                color: 'var(--neutral-7)', fontWeight: 500, cursor: 'pointer',
                filter: 'url(#pencil-soft)',
              }}>Start interview →</button>
            </div>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}

function D2_Merging({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={1} completed={[]} density={density}>
      <ChromeHeader phase="Gap analysis" stage="01 of 09" density={density}
        skipAction="Skip — start business interview" />
      {showSpectrum && <SpectrumBar active={1} completed={[]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 16px' : '8px 32px 20px',
                    display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 10 : 14, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: density === 'compact' ? 22 : 26,
            color: 'var(--neutral-7)', letterSpacing: '-0.015em',
          }}>
            Merging your answers into the worksheet…
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--accent-2)' }}>
            ◐ 6 of 9 read
          </span>
        </div>

        <div style={{
          border: '1.5px solid var(--neutral-3)', borderRadius: 8, background: 'white',
          filter: 'url(#pencil-soft)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: '1.5px solid var(--neutral-3)',
            background: 'var(--neutral-1)', display: 'flex',
            alignItems: 'center', gap: 10,
          }}>
            <Eyebrow>worksheet-v1-filled.md · 9 rows</Eyebrow>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5,
                           color: 'var(--neutral-5)' }}>
              <span style={{ color: 'var(--success)' }}>5 filled</span> ·
              <span style={{ color: 'var(--accent-2)' }}> 1 review</span> ·
              <span> 3 pending</span>
            </span>
          </div>
          <WorksheetGapRow n="01" cat="Success metrics" q="v1 success metric and target value"
                  status="filled" why='Answer: "WAU ≥ 200 by week 8 post-launch"' />
          <WorksheetGapRow n="02" cat="User roles" q="read-only viewers vs write-access for everyone"
                  status="filled" why='Answer: "Three roles — admin / editor / viewer"' />
          <WorksheetGapRow n="03" cat="Constraints" q="hard launch date — real or directional"
                  status="review" why='Answer: "Q2" — Sherpy: needs an exact date for sequencing.' />
          <WorksheetGapRow n="04" cat="Scope" q="billing in v1, or fast-follow"
                  status="filled" />
          <WorksheetGapRow n="05" cat="Integrations" q="which existing systems must read/write"
                  status="merging" />
          <WorksheetGapRow n="06" cat="Compliance" q="any data-residency or audit-log requirements" muted />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ flex: 1, height: 4, background: 'var(--neutral-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: '66%', height: '100%', background: 'var(--accent-2)' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--neutral-5)', fontFamily: 'var(--font-mono)' }}>
            ~10s remaining
          </span>
          <button disabled style={{
            background: 'var(--neutral-3)', color: 'var(--neutral-5)',
            border: 'none', borderRadius: 5, padding: '8px 16px',
            fontSize: 12.5, fontWeight: 500, cursor: 'not-allowed',
          }}>Begin business interview</button>
        </div>
      </div>
    </AppChrome>
  );
}

function D2_GapsResolved({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={1} completed={[]} density={density}>
      <ChromeHeader phase="Gap analysis" stage="01 of 09" density={density} />
      {showSpectrum && <SpectrumBar active={1} completed={[]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 16px' : '8px 32px 20px',
                    display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 10 : 14, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: density === 'compact' ? 22 : 26,
            color: 'var(--neutral-7)', letterSpacing: '-0.015em',
          }}>
            Worksheet updated. 1 row needs your eyes.
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--success)' }}>
            ✓ merged
          </span>
        </div>

        <div style={{
          border: '1.5px solid var(--neutral-3)', borderRadius: 8, background: 'white',
          filter: 'url(#pencil-soft)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: '1.5px solid var(--neutral-3)',
            background: 'var(--neutral-1)', display: 'flex',
            alignItems: 'center', gap: 10,
          }}>
            <Eyebrow>gap-worksheet · v2 · merged with worksheet-v1-filled.md</Eyebrow>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5,
                           color: 'var(--neutral-5)' }}>
              <span style={{ color: 'var(--success)' }}>8 filled</span> ·
              <span style={{ color: 'var(--accent-2)' }}> 1 review</span>
            </span>
          </div>
          <WorksheetGapRow n="01" cat="Success metrics" q="v1 success metric and target value"
                  status="filled" why='WAU ≥ 200 by week 8 post-launch' />
          <WorksheetGapRow n="02" cat="User roles" q="read-only viewers vs write-access for everyone"
                  status="filled" why='Three roles — admin / editor / viewer' />
          <WorksheetGapRow n="03" cat="Constraints" q="hard launch date — real or directional"
                  status="review" why='Answer was "Q2". Sherpy needs an exact date for sequencing — pick one or confirm directional.' />
          <WorksheetGapRow n="04" cat="Scope" q="billing in v1, or fast-follow"
                  status="filled" why='Fast-follow — billing not in v1' />
          <WorksheetGapRow n="05" cat="Integrations" q="which existing systems must read/write"
                  status="filled" why='Read: GitHub, Slack. Write: Confluence.' />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 'auto' }}>
          <button style={{
            background: 'var(--neutral-7)', color: 'white',
            border: 'none', borderRadius: 5, padding: '9px 18px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            filter: 'url(#pencil-soft)',
          }}>Begin business interview →</button>
          <button style={{
            background: 'white', color: 'var(--neutral-7)',
            border: '1.5px solid var(--neutral-3)', borderRadius: 5,
            padding: '8px 14px', fontSize: 12.5, cursor: 'pointer',
            filter: 'url(#pencil-soft)',
          }}>Resolve review row first</button>
          <span style={{ fontSize: 11, color: 'var(--neutral-5)', marginLeft: 'auto' }}>
            ↻ re-upload worksheet · ↓ download v2
          </span>
        </div>
      </div>
    </AppChrome>
  );
}

function D2_Thread({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={2} completed={[1]} density={density}>
      <ChromeHeader phase="Business requirements" stage="02 of 09" density={density} />
      {showSpectrum && <SpectrumBar active={2} completed={[1]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 14px' : '8px 32px 16px',
                    display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                      gap: density === 'compact' ? 10 : 14, paddingBottom: 12 }}>
          <ThreadDivider label="Gap analysis · signed off · 3 gaps resolved" tone="success" />
          <ThreadMsg who="S" body="Q3 / 17 — Who's the v1 decider on scope changes?" />
          <ThreadMsg who="you" body="Me. Full-time PM. Engineering escalates to me." />
          <ThreadMsg who="S" body="Q4 / 17 — Who is the primary user of the Sherpy web app on day one?" current />
        </div>

        <div style={{
          border: '1.5px solid var(--neutral-7)', borderRadius: 12,
          padding: '10px 12px 8px', background: 'white', filter: 'url(#pencil-soft)',
          display: 'flex', flexDirection: 'column', gap: 8,
          boxShadow: '0 -2px 0 var(--neutral-1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Eyebrow>Sherpy suggests · pick one or write your own</Eyebrow>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--neutral-5)' }}>↹ to cycle</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <SuggChip selected>A · Solo engineers shipping side projects</SuggChip>
            <SuggChip>B · Tech leads at small teams</SuggChip>
            <SuggChip>C · PMs writing PRDs solo</SuggChip>
            <SuggChip muted>D · Other…</SuggChip>
          </div>
          <Line dashed />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--neutral-4)', fontStyle: 'italic', flex: 1 }}>
              …or type your own answer
            </span>
            <button style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 999,
              border: '1.5px solid var(--neutral-7)', background: 'transparent',
              cursor: 'pointer', filter: 'url(#pencil-soft)', display: 'flex', alignItems: 'center', gap: 4,
            }}>? Ask Sherpy</button>
            <button style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 4,
              border: 'none', background: 'var(--neutral-7)', color: 'white',
              cursor: 'pointer', fontWeight: 500, filter: 'url(#pencil-soft)',
            }}>Send ↵</button>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}

function ThreadDivider({ label, tone }) {
  const c = tone === 'success' ? 'var(--success)' : 'var(--neutral-5)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--neutral-3)' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c, letterSpacing: '0.04em' }}>
        ✓ {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--neutral-3)' }} />
    </div>
  );
}

function ThreadMsg({ who, body, current }) {
  const isYou = who === 'you';
  return (
    <div style={{ display: 'flex', gap: 10, opacity: current ? 1 : 0.7 }}>
      <span style={{
        width: 24, height: 24, borderRadius: 999, flexShrink: 0,
        background: isYou ? 'white' : 'var(--neutral-7)',
        color: isYou ? 'var(--neutral-7)' : 'white',
        border: isYou ? '1.5px solid var(--neutral-3)' : 'none',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        display: 'grid', placeItems: 'center',
      }}>{isYou ? 'KW' : 'S'}</span>
      <div style={{
        fontSize: current ? 14 : 12.5,
        color: 'var(--neutral-7)',
        flex: 1,
        fontWeight: current ? 500 : 400,
      }}>
        {body}
      </div>
    </div>
  );
}

function SuggChip({ children, selected, muted }) {
  return (
    <div style={{
      padding: '5px 10px',
      borderRadius: 999,
      border: `1.5px solid ${selected ? 'var(--neutral-7)' : 'var(--neutral-3)'}`,
      background: selected ? 'var(--neutral-1)' : 'white',
      fontSize: 12, color: muted ? 'var(--neutral-5)' : 'var(--neutral-7)',
      fontStyle: muted ? 'italic' : 'normal',
      cursor: 'pointer', filter: 'url(#pencil-soft)',
    }}>
      {children}
    </div>
  );
}

function D2_Ask({ density = 'cozy', showSpectrum = true }) {
  return (
    <AppChrome railVariant="workspace" activePhase={2} completed={[1]} density={density}>
      <ChromeHeader phase="Business requirements" stage="02 of 09" density={density} />
      {showSpectrum && <SpectrumBar active={2} completed={[1]} showLabels density={density} />}
      <div style={{ flex: 1, padding: density === 'compact' ? '6px 32px 14px' : '8px 32px 16px',
                    display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                      gap: density === 'compact' ? 10 : 14, paddingBottom: 8 }}>
          <ThreadMsg who="S" body="Q3 / 17 — Who's the v1 decider on scope changes?" />
          <ThreadMsg who="you" body="Me. Full-time PM." />
          <ThreadMsg who="S" body="Q4 / 17 — Who is the primary user of the Sherpy web app on day one?" current />
        </div>

        {/* Aside — paused above composer */}
        <div style={{
          border: '1.5px solid var(--accent-2)', borderRadius: 8,
          background: 'var(--accent-2-soft, var(--neutral-1))', padding: '10px 12px',
          filter: 'url(#pencil-soft)', display: 'flex', flexDirection: 'column', gap: 8,
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Eyebrow color="var(--accent-2)">Aside · Q4 paused — composer below disabled</Eyebrow>
            <span style={{ fontSize: 10, color: 'var(--neutral-5)', cursor: 'pointer',
                           fontFamily: 'var(--font-mono)' }}>close × · resume Q4</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--neutral-7)', display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent-2)', fontFamily: 'var(--font-mono)', fontSize: 10, paddingTop: 2 }}>YOU</span>
            <span style={{ flex: 1 }}>Why does Sherpy ask about the primary user before scope?</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--neutral-7)', display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent-2)', fontFamily: 'var(--font-mono)', fontSize: 10, paddingTop: 2 }}>S</span>
            <span style={{ flex: 1, lineHeight: 1.5 }}>Outcomes are framed against a primary user. Without one, scope decisions later will lack a reference point.</span>
          </div>
          <div style={{
            borderTop: '1px dashed var(--accent-2)', paddingTop: 8,
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

        {/* Disabled composer — peeking under the aside */}
        <div style={{
          border: '1.5px solid var(--neutral-3)', borderRadius: 12,
          padding: '8px 12px', background: 'var(--neutral-1)', opacity: 0.55,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 11.5, color: 'var(--neutral-5)', flex: 1, fontStyle: 'italic' }}>
            Q4 answer paused while you ask back…
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--neutral-5)' }}>disabled</span>
        </div>
      </div>
    </AppChrome>
  );
}

// MAIN — design canvas wrapper
// ============================================================

function App() {
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "density": "cozy",
    "showSpectrum": true,
    "showAskback": true,
    "sketchiness": "soft"
  }/*EDITMODE-END*/);

  return (
    <>
      <PencilDefs sketchiness={tweaks.sketchiness} />
      <DesignCanvas>
        <DCSection id="intro" title="Brief">
          <DCArtboard id="brief" label="Read me first" width={760} height={540}>
            <BriefCard />
          </DCArtboard>
        </DCSection>

        <DCSection id="d2" title="Direction 02 — Thread (web-app shell)">
          <DCArtboard id="d2-all" label="Storyboard A→H · gap-analysis cycle" width={2120} height={tweaks.density === 'compact' ? 1820 : 2000}>
            <Direction2
              density={tweaks.density}
              showSpectrum={tweaks.showSpectrum}
              showAskback={tweaks.showAskback}
            />
          </DCArtboard>
        </DCSection>

        <DCSection id="interview" title="Interview flow — Q&A with chat aside">
          <DCArtboard id="interview-all" label="Storyboard I1 → I5" width={2120} height={tweaks.density === 'compact' ? 1820 : 2000}>
            <InterviewFlow
              density={tweaks.density}
              showSpectrum={tweaks.showSpectrum}
            />
          </DCArtboard>
        </DCSection>

      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Direction 02" />
        <TweakRadio
          label="Density"
          value={tweaks.density}
          onChange={(v) => setTweak('density', v)}
          options={[
            { value: 'cozy', label: 'Airy' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
        <TweakToggle
          label="Spectrum bar"
          value={tweaks.showSpectrum}
          onChange={(v) => setTweak('showSpectrum', v)}
        />
        <TweakToggle
          label="Ask-back frame"
          value={tweaks.showAskback}
          onChange={(v) => setTweak('showAskback', v)}
        />

        <TweakSection label="Sketch fidelity" />
        <TweakRadio
          label="Pencil"
          value={tweaks.sketchiness}
          onChange={(v) => setTweak('sketchiness', v)}
          options={[
            { value: 'clean', label: 'Clean' },
            { value: 'soft', label: 'Soft' },
            { value: 'wobble', label: 'Wobble' },
          ]}
        />
      </TweaksPanel>
    </>
  );
}

function BriefCard() {
  return (
    <div style={{
      padding: '40px 44px', display: 'flex', flexDirection: 'column', gap: 16,
      background: 'var(--neutral-0)', height: '100%', boxSizing: 'border-box',
    }}>
      <PencilDefs />
      <Brand size={22} />
      <Eyebrow>Sherpy onboarding · wireframe storyboard</Eyebrow>
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 36, lineHeight: 1,
        letterSpacing: '-0.02em', color: 'var(--neutral-7)',
      }}>
        Thread — a storyboard for the<br /> <em>first 90 seconds</em> of a Sherpy run.
      </div>
      <div style={{ fontSize: 13, color: 'var(--neutral-5)', maxWidth: 560, lineHeight: 1.55 }}>
        The storyboard walks the same beats: <strong>blank state</strong> → <strong>intake</strong> →
        <strong> gap-analysis cycle</strong> (worksheet generated, filled offline, uploaded, merged) →
        <strong> business interview</strong>.
        Goals: minimal user typing, locked into the flow, but flexible —
        the user can ask Sherpy a question before answering, and skip-to-interview is one click away the whole time.
      </div>
      <Line dashed />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 12.5, color: 'var(--neutral-6)' }}>
        <Eyebrow style={{ alignSelf: 'center' }}>02 · Thread</Eyebrow>
        <span>Standard web-app shell — workspace rail + spectrum bar from the design system. Scrollable Q&A thread, composer pinned, suggestions live in the composer. Gap-analysis cycle handles offline worksheet fill-and-merge before the interview begins.</span>
      </div>
      <Line dashed />
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--neutral-5)' }}>
        <span><strong style={{ color: 'var(--neutral-7)' }}>Principles:</strong> medium lock-in (rail visible, can revisit, can't jump ahead) · doc-paste flow detected as the typical entry · gap analysis is skippable when the idea is minimal · the ask-back never loses the current question.</span>
      </div>
      <Note style={{ alignSelf: 'flex-end', fontSize: 16, marginTop: 'auto' }} rotate={-3}>
        scroll right →
      </Note>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
