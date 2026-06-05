# BUG-020: Test Plan

## Manual Test (Playwright MCP)

### Test Steps

1. **Navigate to project build page**
   ```
   http://localhost:5180/project/wes_blhT/build
   ```

2. **Complete Step 1 (if not already done)**
   - Skip if already at Step 2

3. **Answer Step 2 Questions**
   - Answer all 10 business requirements questions
   - Monitor console for persistence logs
   - Watch for "Generating Business Requirements artifact" message

4. **Verify Artifact Generation**
   - Should see loading state: "Generating Business Requirements artifact from 10 answers..."
   - Should transition to Step 3 after generation completes
   - Check console logs for `[generateArtifact]` messages

5. **Navigate to Review Page**
   ```
   http://localhost:5180/project/wes_blhT/review
   ```

6. **Verify Artifact Content**
   - Select "business-requirements" artifact
   - Verify content is NOT empty
   - Verify content contains information from interview answers
   - Should see YAML structure with business requirements

### Expected Results

✅ Artifact content contains interview data  
✅ YAML structure is complete  
✅ All 10 Q&A pairs reflected in artifact  
✅ No empty fields in YAML  

### Before Fix (Expected Failures)

❌ Artifact exists but content is minimal/generic  
❌ No interview-specific data in artifact  
❌ YAML fields contain placeholder values  

### After Fix (Expected Passes)

✅ Artifact contains rich, interview-specific content  
✅ YAML fields populated with actual project details  
✅ Business requirements reflect user's answers  

## Automated Test (Future)

```typescript
describe('BUG-020: Business Requirements Artifact Generation', () => {
  it('should generate artifact with interview answers', async () => {
    // Setup: Start project, complete Step 1
    const projectId = 'test-project';
    
    // Act: Complete Step 2 interview with 10 answers
    const mockAnswers = [
      { question: 'Q1', value: 'Answer 1' },
      { question: 'Q2', value: 'Answer 2' },
      // ... 8 more
    ];
    
    // Simulate submitting all answers
    for (const answer of mockAnswers) {
      await machine.send({
        type: 'SUBMIT_ANSWER',
        stepNumber: 2,
        question: answer.question,
        answer: answer.value,
      });
    }
    
    // Assert: Artifact should contain interview data
    const artifact = await getArtifact(projectId, 'business-requirements');
    expect(artifact.content).toContain('Answer 1');
    expect(artifact.content).toContain('Answer 2');
    expect(artifact.content.length).toBeGreaterThan(100);
  });
});
```

## Verification Checklist

- [ ] Step 2 artifact contains interview answers
- [ ] Step 3 still works (verify not broken by fix)
- [ ] Console logs show successful artifact generation
- [ ] Database contains artifact record
- [ ] Artifact downloadable from review page
- [ ] No TypeScript errors
- [ ] No runtime errors in console
