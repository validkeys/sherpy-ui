import { describe, it, expect, beforeEach } from 'vitest'
import type { Artifact } from './types'
import {
	listArtifacts,
	getArtifact,
	upsertArtifact,
	seedArtifacts,
} from './store'

describe('artifact store', () => {
	const testProjectId = 'test-project-123'
	const testArtifact: Artifact = {
		id: 'test-artifact-1',
		projectId: testProjectId,
		key: 'test-requirements',
		label: 'Test Requirements',
		format: 'yaml',
		content: 'test: content',
		status: 'ready',
		generatedAt: new Date().toISOString(),
	}

	beforeEach(() => {
		// Clear the store by upserting and then removing test data
		// (since store is module-level, we can't fully reset between tests)
	})

	it('listArtifacts returns empty array for new project', () => {
		const uniqueProjectId = `project-${Date.now()}-${Math.random()}`
		const artifacts = listArtifacts(uniqueProjectId)
		expect(artifacts).toEqual([])
	})

	it('upsertArtifact creates then retrieves correctly', () => {
		const uniqueProjectId = `project-${Date.now()}-${Math.random()}`
		const artifact: Artifact = {
			...testArtifact,
			projectId: uniqueProjectId,
		}

		upsertArtifact(artifact)

		const retrieved = getArtifact(uniqueProjectId, artifact.key)
		expect(retrieved).toEqual(artifact)

		const list = listArtifacts(uniqueProjectId)
		expect(list).toHaveLength(1)
		expect(list[0]).toEqual(artifact)
	})

	it('upsertArtifact updates existing artifact', () => {
		const uniqueProjectId = `project-${Date.now()}-${Math.random()}`
		const artifact: Artifact = {
			...testArtifact,
			projectId: uniqueProjectId,
			content: 'original content',
		}

		upsertArtifact(artifact)

		const updated: Artifact = {
			...artifact,
			content: 'updated content',
		}
		upsertArtifact(updated)

		const retrieved = getArtifact(uniqueProjectId, artifact.key)
		expect(retrieved?.content).toBe('updated content')

		const list = listArtifacts(uniqueProjectId)
		expect(list).toHaveLength(1)
	})

	it('seedArtifacts creates expected artifact keys', () => {
		const uniqueProjectId = `project-${Date.now()}-${Math.random()}`

		seedArtifacts(uniqueProjectId)

		const artifacts = listArtifacts(uniqueProjectId)
		expect(artifacts.length).toBeGreaterThan(0)

		const keys = artifacts.map((a) => a.key)
		expect(keys).toContain('business-requirements')
		expect(keys).toContain('technical-requirements')
		expect(keys).toContain('milestones')
	})

	it('seedArtifacts does not duplicate on repeated calls', () => {
		const uniqueProjectId = `project-${Date.now()}-${Math.random()}`

		seedArtifacts(uniqueProjectId)
		const firstCount = listArtifacts(uniqueProjectId).length

		seedArtifacts(uniqueProjectId)
		const secondCount = listArtifacts(uniqueProjectId).length

		expect(secondCount).toBe(firstCount)
	})

	it('getArtifact returns undefined for unknown key', () => {
		const uniqueProjectId = `project-${Date.now()}-${Math.random()}`
		const retrieved = getArtifact(uniqueProjectId, 'unknown-key')
		expect(retrieved).toBeUndefined()
	})
})
