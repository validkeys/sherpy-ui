import type { Artifact } from '../types'

export function downloadArtifact(artifact: Artifact): void {
	const ext = artifact.format === 'yaml' ? 'yaml' : 'md'
	const filename = `${artifact.key}.${ext}`
	const blob = new Blob([artifact.content], { type: 'text/plain' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}
