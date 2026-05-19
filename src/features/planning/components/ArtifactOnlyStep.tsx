/**
 * Artifact-Only Step Component for Step 7 (Architecture Decisions)
 * Allows reviewing and editing the generated artifact before approval
 */

import React, { useState, useEffect } from 'react';
import { usePlanningMachine, useSelector } from '../machines/PlanningMachineContext';

type Props = {
  stepKey: string;
  stepName: string;
};

export function ArtifactOnlyStep({ stepKey, stepName }: Props) {
  const actor = usePlanningMachine();
  const stepNumber = 7; // Architecture Decisions is always step 7

  // Select artifact and edits
  const artifact = useSelector((state) => state.context.artifacts[stepNumber]);
  const existingEdits = useSelector((state) => state.context.step7Edits);
  const error = useSelector((state) => state.context.error);

  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Initialize edited content
  useEffect(() => {
    if (existingEdits) {
      setEditedContent(existingEdits);
    } else if (artifact) {
      setEditedContent(artifact.content);
    }
  }, [artifact, existingEdits]);

  const handleSaveEdit = () => {
    actor.send({
      type: 'EDIT_ARTIFACT',
      stepNumber,
      content: editedContent,
    });
    setIsEditing(false);
  };

  const handleApprove = () => {
    actor.send({
      type: 'APPROVE_ARTIFACT',
      stepNumber,
    });
  };

  const handleRetry = () => {
    actor.send({
      type: 'RETRY',
      stepNumber,
    });
  };

  if (!artifact) {
    return (
      <div className="artifact-only-step">
        <h2>{stepName}</h2>
        <div className="no-artifact">
          <p>Waiting for artifact generation...</p>
        </div>
      </div>
    );
  }

  const displayContent = existingEdits || artifact.content;

  return (
    <div className="artifact-only-step">
      <h2>{stepName}</h2>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={handleRetry}>Retry</button>
        </div>
      )}

      <div className="artifact-meta">
        <span className="artifact-type">{artifact.type.toUpperCase()}</span>
        <span className="artifact-date">
          Generated: {new Date(artifact.generatedAt).toLocaleString()}
        </span>
        {existingEdits && <span className="edited-badge">Edited</span>}
      </div>

      {isEditing ? (
        <div className="edit-mode">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={20}
            className="artifact-editor"
          />
          <div className="edit-actions">
            <button onClick={handleSaveEdit}>Save Changes</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="view-mode">
          <pre className="artifact-content">{displayContent}</pre>
          <div className="actions">
            <button onClick={() => setIsEditing(true)}>Edit</button>
            <button onClick={handleApprove} className="approve-button">
              Approve & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
