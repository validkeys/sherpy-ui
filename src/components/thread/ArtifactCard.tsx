interface ArtifactCardProps {
  stepName: string;
  content: string;
}

export function ArtifactCard({ stepName, content }: ArtifactCardProps) {
  return (
    <div className="border border-border-2 rounded-lg p-4 bg-bg-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-fg-3">✓ Generated Artifact</span>
          <span className="text-xs font-mono text-fg-2">{stepName}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(content);
          }}
          className="text-xs font-mono text-fg-3 hover:text-fg-1 px-2 py-1 rounded hover:bg-bg-3"
        >
          Copy
        </button>
      </div>
      <pre className="text-xs font-mono text-fg-2 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}
