/**
 * Debug Panel - Real-time XState Machine State Inspector
 *
 * Shows current machine state, context, and allows sending test events.
 * Only rendered in development mode.
 */

import React, { useState, useEffect } from 'react';
import { usePlanningMachine, useSelector } from '../machines/PlanningMachineContext';

export function DebugPanel() {
  const actor = usePlanningMachine();
  const [expanded, setExpanded] = useState(true);
  const [eventHistory, setEventHistory] = useState<string[]>([]);

  // Subscribe to all state changes
  useEffect(() => {
    const subscription = actor.subscribe((snapshot) => {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
      setEventHistory(prev => [...prev.slice(-9), `${timestamp}: State changed to ${JSON.stringify(snapshot.value)}`]);
    });

    return () => subscription.unsubscribe();
  }, [actor]);

  // Get full snapshot
  const snapshot = actor.getSnapshot();

  const stateValue = snapshot.value;
  const context = snapshot.context;
  const status = snapshot.status;

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '8px 12px',
          background: '#1a1a1a',
          color: '#00ff00',
          border: '1px solid #00ff00',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 10000,
        }}
      >
        🐛 Show Debug Panel
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: '600px',
      maxHeight: '80vh',
      background: '#1a1a1a',
      color: '#00ff00',
      border: '2px solid #00ff00',
      borderRadius: '8px',
      padding: '16px',
      fontFamily: 'monospace',
      fontSize: '11px',
      overflow: 'auto',
      zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0, 255, 0, 0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#00ff00', fontSize: '14px' }}>🐛 XState Machine Debug Panel</h3>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'transparent',
            border: '1px solid #00ff00',
            color: '#00ff00',
            padding: '4px 8px',
            cursor: 'pointer',
            borderRadius: '3px',
          }}
        >
          Minimize
        </button>
      </div>

      {/* Actor Status */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#0a0a0a', borderRadius: '4px' }}>
        <strong>Actor Status:</strong> <span style={{ color: status === 'active' ? '#00ff00' : '#ff0000' }}>{status}</span>
        <br />
        <strong>Actor ID:</strong> {actor.id}
      </div>

      {/* Current State */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#0a0a0a', borderRadius: '4px' }}>
        <strong>Current State:</strong>
        <pre style={{ margin: '4px 0 0 0', color: '#00ffff' }}>
          {JSON.stringify(stateValue, null, 2)}
        </pre>
      </div>

      {/* Step Info */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#0a0a0a', borderRadius: '4px' }}>
        <strong>Current Step Number:</strong> {context.currentStepNumber}
        <br />
        <strong>Completed Steps:</strong> [{context.completedSteps.join(', ')}]
      </div>

      {/* Step 1 Responses - CRITICAL FOR DEBUGGING */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#0a0a0a', borderRadius: '4px', border: '2px solid #ffff00' }}>
        <strong style={{ color: '#ffff00' }}>⚠️ Step 1 Responses (CRITICAL):</strong>
        <pre style={{ margin: '4px 0 0 0', color: context.step1Responses && Object.keys(context.step1Responses).length > 0 ? '#00ff00' : '#ff0000' }}>
          {JSON.stringify(context.step1Responses, null, 2)}
        </pre>
        {(!context.step1Responses || Object.keys(context.step1Responses).length === 0) && (
          <div style={{ color: '#ff0000', marginTop: '4px' }}>
            ❌ EMPTY! This is the bug - form data not captured
          </div>
        )}
      </div>

      {/* Other Context */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#0a0a0a', borderRadius: '4px' }}>
        <strong>Step 2 Answers:</strong> {context.step2Answers.length} items
        <br />
        <strong>Step 3 Answers:</strong> {context.step3Answers.length} items
        <br />
        <strong>Artifacts:</strong> {Object.keys(context.artifacts).length} generated
        <br />
        {context.error && (
          <div style={{ color: '#ff0000', marginTop: '4px' }}>
            <strong>Error:</strong> {context.error}
          </div>
        )}
      </div>

      {/* Event History */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#0a0a0a', borderRadius: '4px' }}>
        <strong>Recent State Changes:</strong>
        <div style={{ maxHeight: '100px', overflow: 'auto', marginTop: '4px' }}>
          {eventHistory.length === 0 ? (
            <div style={{ color: '#666' }}>No state changes yet</div>
          ) : (
            eventHistory.map((evt, idx) => (
              <div key={idx} style={{ fontSize: '10px', marginBottom: '2px', color: '#888' }}>
                {evt}
              </div>
            ))
          )}
        </div>
      </div>

      {/* DOM Form Values */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#0a0a0a', borderRadius: '4px' }}>
        <strong>DOM Form Values (Real-time):</strong>
        <DOMFormValues />
      </div>

      {/* Manual Event Sender */}
      <div style={{ padding: '8px', background: '#0a0a0a', borderRadius: '4px' }}>
        <strong>Manual Event Sender:</strong>
        <ManualEventSender actor={actor} />
      </div>
    </div>
  );
}

function DOMFormValues() {
  const [values, setValues] = useState<any>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const field1 = document.getElementById('existingRequirements') as HTMLInputElement;
      const field2 = document.getElementById('projectDescription') as HTMLTextAreaElement;

      setValues({
        existingRequirements: field1?.value || '(field not found)',
        projectDescription: field2?.value || '(field not found)',
        submitButtonText: document.querySelector('button[type="submit"]')?.textContent,
        submitDisabled: document.querySelector('button[type="submit"]')?.disabled,
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <pre style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#ffaa00' }}>
      {JSON.stringify(values, null, 2)}
    </pre>
  );
}

function ManualEventSender({ actor }: { actor: any }) {
  const [testData, setTestData] = useState({
    field1: 'Test requirements',
    field2: 'Test project description',
  });

  const sendTestSubmit = () => {
    const event = {
      type: 'SUBMIT_FORM' as const,
      stepNumber: 1,
      responses: {
        existingRequirements: testData.field1,
        projectDescription: testData.field2,
      },
    };

    console.log('[DebugPanel] Manually sending SUBMIT_FORM event:', event);
    actor.send(event);
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <button
        onClick={sendTestSubmit}
        style={{
          background: '#006600',
          color: '#00ff00',
          border: '1px solid #00ff00',
          padding: '6px 12px',
          cursor: 'pointer',
          borderRadius: '4px',
          fontSize: '11px',
          width: '100%',
          marginTop: '8px',
        }}
      >
        🧪 Send Test SUBMIT_FORM Event (with hardcoded data)
      </button>
      <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
        This bypasses the form and sends the event directly to test if the machine responds
      </div>
    </div>
  );
}
