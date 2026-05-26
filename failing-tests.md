# Test Failures Checklist
## Instructions for AI
**Work through these tests ONE AT A TIME.** After fixing each test:
1. Update the checkbox from `- [ ]` to `- [x]`
2. Move to the next test
3. Do not skip ahead or work on multiple tests simultaneously
### How to Run Tests
To run a specific test file:
```bash
cd <package-root-directory>
npx vitest path/to/file
```
Example:
```bash
npx vitest src/handlers/example.test.ts
```
### Be Systematic About Debugging
**First:** State the current problem -- whether it's an error or otherwise.
**Then:**
1. Isolate a failing test with `.only`
2. Add comprehensive diagnostic console logging to the entire call stack
3. Run the test
4. Trace the diagnostic logging
5. Determine the root cause
6. Present the root cause to the user along with a proposed solution. If there are several options, present the options for solving.
---
## src/features/planning/components/FormStep.bug007.test.tsx
- [x] **src/features/planning/components/FormStep.bug007.test.tsx**
  - **Test:** BUG-007: Gap Analysis Submit No API Call > should trigger artifact generation API call when submit is clicked
  - **Error:**
    - Unable to find an element with the text: /submitting/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.
    - <body>
    -   <div>
    -     <div
    -       class="form-step"
    -     >
    -       <h2>
    -         Gap Analysis
    -       </h2>
    -       <form>
    -         <div
    -           class="form-field"
    -         >
    -           <label
    -             for="existingRequirements"
    -           >
    -             Do you have existing requirements?
    -           </label>
    -           <input
    -             id="existingRequirements"
    -             type="text"
    -             value="No, starting from scratch"
    -           />
    -         </div>
    -         <div
    -           class="form-field"
    -         >
    -           <label
    -             for="projectDescription"
    -           >
    -             What are you building?
    -           </label>
    -           <textarea
    -             id="projectDescription"
    -             rows="5"
    -           >
    -             Healthcare Portal - Patient management system
    -           </textarea>
    -         </div>
    -         <button
    -           type="submit"
    -         >
    -           Submit
    -         </button>
    -       </form>
    -     </div>
    -   </div>
    - </body>
## src/features/planning/components/FormStep.bug010-fix.test.tsx
- [x] **src/features/planning/components/FormStep.bug010-fix.test.tsx**
  - **Test:** BUG-010 Fix: DOM value recovery on submit > should recover form data from DOM when React state is empty (BUG-010 scenario)
  - **Error:**
    - expect(element).not.toBeDisabled()
    - Received element is disabled:
    -   <button
    -   disabled=""
    -   type="submit"
    - />
- [x] **src/features/planning/components/FormStep.bug010-fix.test.tsx**
  - **Test:** BUG-010 Fix: DOM value recovery on submit > should handle partial React state (some fields empty, some filled)
  - **Error:**
    - expected undefined to be 'Yes, from React' // Object.is equality
**Total failures: 3**
