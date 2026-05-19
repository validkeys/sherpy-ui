# Test Runs Directory

Each test run gets its own numbered directory: `001/`, `002/`, etc.

## Structure

```
runs/
├── 001/
│   └── tracking.yaml    # Copied from tracking-template.yaml, updated during test
├── 002/
│   └── tracking.yaml
└── README.md
```

## Naming Convention

- **Directory:** Zero-padded 3-digit number (001, 002, 003...)
- **File:** Always `tracking.yaml`

## Workflow

1. AI reads `ai-browser-test.yaml` (entrypoint)
2. AI creates next run directory: `00{n}/`
3. AI copies `tracking-template.yaml` → `00{n}/tracking.yaml`
4. AI updates tracking.yaml as test progresses
5. On completion, tracking.yaml contains full test results

## Archive Policy

Do not delete old runs. They provide historical data for:
- Bug trend analysis
- Performance regression tracking
- Success rate over time
- Learning pattern evolution
