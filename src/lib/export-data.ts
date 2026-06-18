export function exportLocalStorageData(projectId: string): void {
  const key = `planning-machine-${projectId}`;
  const data = localStorage.getItem(key);

  if (!data) {
    console.error("[exportData] No data found for project:", projectId);
    return;
  }

  try {
    // Parse and pretty-print for readability
    const parsed = JSON.parse(data);
    const formatted = JSON.stringify(parsed, null, 2);

    // Create blob and download
    const blob = new Blob([formatted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sherpy-project-${projectId}-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(
      "[exportData] Successfully exported data for project:",
      projectId,
    );
  } catch (error) {
    console.error("[exportData] Failed to export:", error);
  }
}
