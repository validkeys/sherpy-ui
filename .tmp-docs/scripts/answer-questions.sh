#!/bin/bash

# Answers for Business Requirements questions 2-10
answers=(
  "Healthcare providers and patients needing secure, HIPAA-compliant communication"
  "Reduce administrative burden, improve patient engagement, ensure HIPAA compliance"
  "HIPAA compliance, data security, system availability 99.9%, response time under 2 seconds"
  "Integration with existing EHR systems, calendar systems, payment processors"
  "Patients, healthcare providers, administrative staff"
  "Web application accessible via browser, responsive mobile design"
  "6-12 months for MVP"
  "HIPAA compliance, secure authentication, encrypted data storage and transmission"
  "Within 6 months, phased rollout starting with pilot group"
)

for i in $(seq 0 8); do
  echo "Question $((i+2))/10"
  sleep 3
done
