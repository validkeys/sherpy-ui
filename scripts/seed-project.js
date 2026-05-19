#!/usr/bin/env node
/**
 * Seed Project CLI
 *
 * Creates test projects at specified workflow steps via the seeding API.
 *
 * Usage:
 *   node scripts/seed-project.js 5
 *   node scripts/seed-project.js 3 my-custom-project
 */

const baseUrl = process.env.SEED_API_URL || "http://localhost:5180";

async function seedProject() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Error: Step number required");
    console.log("");
    console.log("Usage:");
    console.log("  node scripts/seed-project.js <step> [projectName]");
    console.log("");
    console.log("Examples:");
    console.log("  node scripts/seed-project.js 5");
    console.log("  node scripts/seed-project.js 3 my-test-project");
    console.log("");
    console.log("Available steps: 1-10");
    process.exit(1);
  }

  const step = parseInt(args[0], 10);
  const projectName = args[1];

  if (Number.isNaN(step) || step < 1 || step > 10) {
    console.error(
      `❌ Error: Invalid step number "${args[0]}". Must be between 1 and 10.`,
    );
    process.exit(1);
  }

  try {
    console.log(`🌱 Seeding project at step ${step}...`);
    if (projectName) {
      console.log(`   Project name: ${projectName}`);
    }
    console.log("");

    const response = await fetch(`${baseUrl}/api/dev/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, projectName }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`❌ API Error (${response.status}):`, error.error || error);
      console.log("");
      if (error.error?.includes("ALLOW_TEST_DATA")) {
        console.log("💡 Tip: Add ALLOW_TEST_DATA=true to your .env.local file");
      }
      process.exit(1);
    }

    const data = await response.json();

    console.log("✅ Project created successfully!");
    console.log("");
    console.log(`   Project ID: ${data.projectId}`);
    console.log(`   Step:       ${data.step}`);
    console.log(`   URL:        ${data.url}`);
    console.log("");
    console.log("📋 To use in browser, run this in the console:");
    console.log("");
    console.log(
      `   localStorage.setItem('${data.storageKey}', '${JSON.stringify(data.snapshot).replace(/'/g, "\\'")}');`,
    );
    console.log(`   window.location.href = '${data.url}';`);
    console.log("");
    console.log(`🔗 Or open: ${baseUrl}${data.url}`);
    console.log(
      "   (then manually run the localStorage.setItem command above)",
    );
    console.log("");
  } catch (error) {
    console.error("❌ Request failed:", error.message);
    console.log("");
    console.log("💡 Make sure the dev server is running:");
    console.log("   npm run dev");
    console.log("");
    process.exit(1);
  }
}

seedProject();
