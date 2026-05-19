// Script to answer 10 interview questions by clicking first option
async function answerAllQuestions() {
  const results = [];

  for (let i = 1; i <= 10; i++) {
    console.log(`\n=== Answering question ${i} of 10 ===`);

    // Wait for question to load
    await new Promise(r => setTimeout(r, 2000));

    // Find first option button (look for buttons that aren't Submit/Back/Next/Navigation)
    const allButtons = Array.from(document.querySelectorAll('button'));
    const optionButtons = allButtons.filter(btn => {
      const text = btn.textContent.trim();
      return text &&
        !text.includes('Submit') &&
        !text.includes('Back') &&
        !text.includes('Next') &&
        !text.includes('Stage') &&
        !text.includes('Build') &&
        !text.includes('Review') &&
        !text.includes('project') &&
        !btn.disabled;
    });

    if (optionButtons.length === 0) {
      console.error('No option buttons found');
      break;
    }

    console.log(`Found ${optionButtons.length} option buttons`);
    console.log(`Clicking: ${optionButtons[0].textContent}`);
    optionButtons[0].click();

    await new Promise(r => setTimeout(r, 1000));

    // Find and click Submit Answer button
    const submitBtn = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent.includes('Submit Answer'));

    if (!submitBtn) {
      console.error('Submit Answer button not found');
      break;
    }

    if (submitBtn.disabled) {
      console.error('Submit Answer button is disabled');
      break;
    }

    console.log('Clicking Submit Answer');
    submitBtn.click();

    results.push({
      question: i,
      option: optionButtons[0].textContent.trim()
    });

    // Wait for next question or transition
    await new Promise(r => setTimeout(r, 5000));

    // Check if still on Business Requirements
    const heading = document.querySelector('h2')?.textContent;
    console.log(`Current heading: ${heading}`);

    if (heading !== 'Business Requirements') {
      console.log(`SUCCESS: Transitioned to "${heading}" after ${i} questions`);
      return { completed: i, transitioned: true, heading, results };
    }
  }

  return { completed: 10, transitioned: false, results };
}

// Run it
answerAllQuestions().then(result => {
  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(result, null, 2));
  window.__testResults = result;
});
