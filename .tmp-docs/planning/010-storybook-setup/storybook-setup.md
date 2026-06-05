# Implementation Plan: Storybook Setup for sherpy-ui

## Context

**Project:** sherpy-ui  
**Stack:** React 19 + Vite 8 + TanStack Start + Tailwind CSS v4 + shadcn/ui (base-nova) + TypeScript 6  
**Package Manager:** pnpm  
**Existing Storybook deps:** Storybook 10.3.6 packages already in `devDependencies` (but no `.storybook/` config exists)  
**Existing story:** 1 story file exists (`src/components/workflow-chat/WorkflowChat.stories.tsx`)  
**Components to cover:** ~30 components across `src/components/ui/`, `src/components/thread/`, `src/components/doc-browser/`, etc.

### Why Storybook?

- Isolated component development and visual regression testing
- Living documentation for the design system (shadcn/ui base-nova)
- Accessibility auditing via `@storybook/addon-a11y` (already installed)
- Interaction testing via `@storybook/addon-vitest` (already installed)
- Chromatic visual testing via `@chromatic-com/storybook` (already installed)

---

## Prerequisites (Already Met)

- [x] Node 20+ (required by Storybook 10)
- [x] Vite 8+ (required by `@storybook/react-vite`)
- [x] React 19 (compatible with Storybook 10)
- [x] TypeScript 6 (compatible)
- [x] pnpm (auto-detected by Storybook CLI)
- [x] Storybook 10.3.6 packages in `devDependencies`

---

## Milestone 1: Initialize Storybook Configuration

**Estimated time:** 30 min  
**Goal:** Storybook dev server runs and renders the existing WorkflowChat story.

### Tasks

#### 1.1 Create `.storybook/main.ts`

Configure the React + Vite framework with existing addons.

```typescript
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)", "../src/**/*.mdx"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  staticDirs: ["../public"],
};

export default config;
```

**Verify:** Config file exists, TypeScript compiles.

#### 1.2 Create `.storybook/preview.ts`

Import global CSS and configure Tailwind v4 support with dark mode.

```typescript
import type { Preview } from "@storybook/react-vite";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
```

**Verify:** Preview file exists, imports resolve.

#### 1.3 Isolate Storybook from the app Vite config

The project's `vite.config.ts` includes TanStack Start plugin and custom server middleware that will conflict with Storybook's Vite dev server. Rather than fighting with `viteFinal` to strip plugins after auto-merge, use the `viteConfigPath` option to point Storybook at a dedicated config file that only includes what Storybook needs.

**Create `.storybook/vite.config.ts`:**

```typescript
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ["better-sqlite3"],
  },
  plugins: [
    tailwindcss(),
  ],
});
```

**In `.storybook/main.ts`, point to it:**

```typescript
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        viteConfigPath: "./vite.config.ts",
      },
    },
  },
  // ... rest of config
};
```

What this gives us:
- **Clean separation** - App's `vite.config.ts` is untouched, Storybook has its own
- **No TanStack Start plugin** - Storybook doesn't need routing or SSR
- **No server middleware** - The seed/streaming endpoints aren't needed for stories
- **Tailwind v4 plugin** - Required for `@import "tailwindcss"` in `index.css`
- **`@` alias** - Components import from `@/lib/utils`, `@/components/*`, etc.
- **`better-sqlite3` excluded** - Same as main config, prevents native module bundling issues

**Verify:** `pnpm storybook` starts without errors.

#### 1.4 Add npm scripts

Add to `package.json` scripts:

```json
{
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

**Verify:** `pnpm storybook` starts and renders the existing WorkflowChat story at `http://localhost:6006`.

---

## Milestone 2: Verify Tailwind CSS v4 + Dark Mode

**Estimated time:** 30 min  
**Goal:** All design tokens and dark mode work correctly in Storybook.

### Tasks

#### 2.1 Verify design tokens load

Confirm that CSS custom properties from `src/styles/tokens.css` are available in stories. The existing `src/index.css` imports:
- `tailwindcss`
- `tw-animate-css`
- `@fontsource-variable/geist`
- `@fontsource-variable/bodoni-moda`
- `./styles/tokens.css`

All of these must resolve through the `@` alias and Tailwind plugin.

**Verify:** Inspect a story in browser - custom properties like `--bg-page`, `--fg-1`, etc. should have values.

#### 2.2 Add dark mode toolbar support

Add `storybook-dark-mode` or use the backgrounds addon with CSS class toggling. Since the project uses `[data-theme="dark"]`, configure toolbar globals:

```typescript
// In .storybook/preview.ts, add:
export const globalTypes = {
  theme: {
    name: "Theme",
    description: "Global theme for components",
    defaultValue: "light",
    toolbar: {
      title: "Theme",
      icon: "circlehollow",
      items: ["light", "dark"],
      showName: true,
    },
  },
};

// Add decorator to apply data-theme attribute
export const decorators = [
  (Story, context) => {
    const theme = context.globals.theme;
    return (
      <div data-theme={theme}>
        <Story />
      </div>
    );
  },
];
```

**Verify:** Toggle between light/dark in Storybook toolbar - styles switch correctly.

#### 2.3 Verify fonts load

Confirm Geist, Geist Mono, and Bodoni Moda fonts render in stories. The `@fontsource-variable/*` imports should work since those packages are in `dependencies`.

**Verify:** Check rendered text in stories matches the app's typography.

---

## Milestone 3: Write Stories for Design System Components (shadcn/ui)

**Estimated time:** 2-3 hours  
**Goal:** All `src/components/ui/` components have stories with variant controls.

### Priority Components

#### 3.1 Button stories (`src/components/ui/button.tsx`)

The Button uses `class-variance-authority` for variants via `button-variants`. Story should expose variant and size controls.

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};
```

**Verify:** Button renders with all variants, sizes are switchable via controls panel.

#### 3.2 Card stories (`src/components/ui/card.tsx`)
#### 3.3 Badge stories (`src/components/ui/badge.tsx`)

**Verify:** Each UI component has a story file, renders correctly, and exposes variant controls.

---

## Milestone 4: Write Stories for Feature Components

**Estimated time:** 2-3 hours  
**Goal:** Key feature components have stories with mock data.

### Priority Components

#### 4.1 Thread components (`src/components/thread/`)

These are the chat UI components. They need mock data (similar to the existing WorkflowChat story pattern):

| Component | File | Mock Data Needed |
|-----------|------|-----------------|
| ThreadView | `ThreadView.tsx` | Messages array |
| QuestionCard | `QuestionCard.tsx` | Question + options |
| OptionCard | `OptionCard.tsx` | Option with selection state |
| OptionStack | `OptionStack.tsx` | Multiple options |
| Composer | `Composer.tsx` | None (input field) |
| ArtifactCard | `ArtifactCard.tsx` | Artifact name + content |
| ThreadDivider | `ThreadDivider.tsx` | Stage info |
| AskbackAside | `AskbackAside.tsx` | Aside content |
| RecommendedBadge | `RecommendedBadge.tsx` | None |

#### 4.2 Doc browser components (`src/components/doc-browser/`)

| Component | File | Mock Data Needed |
|-----------|------|-----------------|
| DocBrowser | `DocBrowser.tsx` | Document list |
| DocList | `DocList.tsx` | Document items |
| DocItem | `DocItem.tsx` | Single document |
| CodePreview | `CodePreview.tsx` | YAML content |
| yaml-highlight | `yaml-highlight.tsx` | YAML string |

#### 4.3 Layout components (`src/components/`)

| Component | File | Mock Data Needed |
|-----------|------|-----------------|
| SpectrumStepper | `spectrum-stepper/SpectrumStepper.tsx` | Steps with completion state |
| LeftRail | `left-rail/LeftRail.tsx` | Navigation items |
| Header | `header/Header.tsx` | Project name |
| ThemeToggle | `theme-provider/ThemeToggle.tsx` | None |
| ModeToggle | `mode-toggle/ModeToggle.tsx` | None |

**Verify:** Each component has a story file that renders without errors.

---

## Milestone 5: Configure Testing Integration

**Estimated time:** 30 min  
**Goal:** Storybook stories work with Vitest for interaction testing.

### Tasks

#### 5.1 Configure `@storybook/addon-vitest`

The addon is already installed. Configure it to work with the existing `vitest.config.ts`. Add to `.storybook/main.ts`:

```typescript
addons: [
  "@storybook/addon-docs",
  "@storybook/addon-a11y",
  {
    name: "@storybook/addon-vitest",
    options: {
      testRunner: {
        configPath: "../vitest.config.ts",
      },
    },
  },
],
```

#### 5.2 Verify interaction tests work

Write a simple play function test for a Button story:

```typescript
export const ClickTest: Story = {
  args: {
    children: "Click me",
    onClick: fn(),
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
```

**Verify:** `pnpm test` runs Storybook interaction tests alongside existing vitest tests.

---

## Milestone 6: CI Integration & Chromatic

**Estimated time:** 30 min  
**Goal:** Storybook builds in CI and publishes to Chromatic for visual regression.

### Tasks

#### 6.1 Add build-storybook to CI

Ensure `pnpm build-storybook` succeeds without errors. The output goes to `storybook-static/`.

#### 6.2 Configure Chromatic

`@chromatic-com/storybook` is already installed. Add script:

```json
{
  "chromatic": "npx chromatic --project-token=<project-token>"
}
```

**Verify:** `pnpm build-storybook` completes. Chromatic can be configured later with a project token.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Tailwind v4 `@import "tailwindcss"` may not work in Storybook's Vite build | High | Dedicated `.storybook/vite.config.ts` includes `@tailwindcss/vite` plugin directly |
| TanStack Start plugin conflicts with Storybook's Vite | High | Bypassed entirely via `viteConfigPath` pointing to Storybook-specific config |
| `@` path alias not resolving | Medium | Set explicitly in `.storybook/vite.config.ts` |
| `better-sqlite3` native module in optimizeDeps | Low | Excluded in `.storybook/vite.config.ts` same as main config |
| CSS custom properties from `tokens.css` not loading | Medium | Verify import chain: `index.css` -> `tokens.css` resolves correctly |
| Font loading from `@fontsource-variable/*` | Low | Packages are in `dependencies`, should resolve naturally |

---

## File Structure After Completion

```
.storybook/
  main.ts              # Framework, addons, viteConfigPath
  preview.ts           # Global CSS import, decorators, globals
  vite.config.ts       # Storybook-specific Vite config (Tailwind + alias only)
src/
  components/
    ui/
      button.stories.tsx
      card.stories.tsx
      badge.stories.tsx
    thread/
      QuestionCard.stories.tsx
      OptionCard.stories.tsx
      ArtifactCard.stories.tsx
      Composer.stories.tsx
      ...
    doc-browser/
      DocBrowser.stories.tsx
      ...
    workflow-chat/
      WorkflowChat.stories.tsx  # (already exists)
    ...
```

---

## Execution Order

1. **Milestone 1** (Initialize) - Must be first, everything depends on it
2. **Milestone 2** (Tailwind/Dark Mode) - Must be second, stories need correct styling
3. **Milestone 3** (UI Components) - After styling works, start with simplest components
4. **Milestone 4** (Feature Components) - After UI components, build up to complex ones
5. **Milestone 5** (Testing) - After stories exist, configure test integration
6. **Milestone 6** (CI/Chromatic) - Last, after everything works locally

**Total estimated time:** 6-8 hours
