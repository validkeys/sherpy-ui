// Script to answer all Step 2 Business Requirements questions
// Run this in browser console after each question appears

const answers = [
  "We're building a B2B SaaS billing platform that handles recurring subscriptions, usage-based billing, invoicing, and payment processing with integrations to Stripe and QuickBooks.",
  "B2B SaaS companies with 10-1000 employees that need automated recurring billing, usage-based pricing models, and financial integrations.",
  "Automated subscription management, usage-based billing calculation, invoice generation, payment processing via Stripe, QuickBooks sync, customer portal, and dunning management.",
  "Reduce manual billing errors by 95%, automate invoice generation to save 20 hours/week, achieve 99.9% uptime, process payments within 2 seconds, and support 10,000+ active subscriptions.",
  "Must integrate with Stripe for payments, QuickBooks for accounting, support PCI-DSS Level 1 compliance, GDPR for EU customers, and handle multi-currency transactions.",
  "SaaS billing admin dashboard (React), customer self-service portal (React), REST API for integrations, background job processing (Node.js), and webhook handlers.",
  "PostgreSQL for transactional data, Redis for caching and job queues, S3 for invoice storage, and Stripe as payment processor.",
  "MVP launch in 3 months with core subscription billing, full platform in 6 months with usage-based billing and advanced features.",
  "Phase 1: Subscription management, Phase 2: Invoicing and payments, Phase 3: Usage-based billing, Phase 4: Advanced reporting and analytics.",
  "Monthly recurring revenue (MRR) tracking, failed payment rates, invoice generation time, API response times, and customer portal adoption rate."
];

let currentIndex = 0;

function sendAnswer(text) {
  const textarea = document.querySelector('textarea[placeholder="Type your message..."]');
  if (textarea) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    const sendButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Send'));
    if (sendButton && !sendButton.disabled) {
      setTimeout(() => sendButton.click(), 100);
      return true;
    }
  }
  return false;
}

// Auto-answer with delay
function autoAnswer() {
  if (currentIndex < answers.length) {
    const sent = sendAnswer(answers[currentIndex]);
    if (sent) {
      console.log(`✅ Sent answer ${currentIndex + 1}/10`);
      currentIndex++;
      // Wait for next question
      setTimeout(autoAnswer, 3000);
    } else {
      console.log('⏳ Waiting for send button...');
      setTimeout(autoAnswer, 500);
    }
  } else {
    console.log('✅ All 10 answers sent!');
  }
}

// Start auto-answering
autoAnswer();
