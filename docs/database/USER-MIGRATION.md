# User Migration Guide: localStorage → SQLite

**Audience:** End users upgrading to the SQLite-backed version of Sherpy  
**Migration Type:** Automatic, zero-downtime  
**Date:** 2026-05-20

---

## Summary

**Good news:** No manual migration required! Your existing project data will continue to work seamlessly.

### What Happens When You Upgrade

1. **First Launch:** App creates database at `~/.local/share/sherpy/sherpy.db`
2. **Existing Data:** All localStorage data remains accessible
3. **Gradual Sync:** As you interact with projects, data is automatically written to SQLite
4. **Zero Downtime:** No interruption to your workflow

---

## How It Works: Hybrid Persistence

The upgrade uses a **hybrid persistence strategy**:

```
┌──────────────────┐
│   localStorage   │  ← Fast cache (your existing data stays here)
└────────┬─────────┘
         │ read
         ↓
┌──────────────────┐
│   Your Browser   │  ← Works exactly as before
└────────┬─────────┘
         │ write
         ↓
┌──────────────────┐
│  SQLite Database │  ← New backup layer (gradually populated)
└──────────────────┘
```

**Benefits:**
- ✅ Instant app startup (no loading spinner)
- ✅ Existing projects work immediately
- ✅ No data loss risk
- ✅ Backward compatible

---

## FAQ

### Do I need to do anything?

**No.** The migration is fully automatic. Just use the app normally.

### What happens to my existing projects?

They remain in localStorage and continue working exactly as before. As you edit them, they're automatically saved to SQLite in the background.

### How long does migration take?

There's no migration process. Data is written to SQLite as you use the app (fire-and-forget writes that don't slow anything down).

### What if I create a new project before the old ones are migrated?

That's fine! New projects are saved to both localStorage and SQLite immediately. Old projects are saved to SQLite when you next interact with them.

### Can I roll back if something goes wrong?

Yes, easily:

```bash
# Option 1: Delete the database (localStorage still works)
rm ~/.local/share/sherpy/sherpy.db

# Option 2: Use in-memory mode (disable persistence)
export SHERPY_DB_PATH=:memory:
npm run dev
```

### Where is the database stored?

Default location: `~/.local/share/sherpy/sherpy.db`

**Platform-specific paths:**
- **Linux:** `~/.local/share/sherpy/sherpy.db`
- **macOS:** `~/.local/share/sherpy/sherpy.db`
- **Windows:** `%USERPROFILE%\.local\share\sherpy\sherpy.db`

### Can I change the database location?

Yes, set the `SHERPY_DB_PATH` environment variable:

```bash
# Custom location
export SHERPY_DB_PATH=/path/to/my/sherpy.db

# In-memory only (no persistence)
export SHERPY_DB_PATH=:memory:
```

### What happens if localStorage is full?

SQLite becomes the primary storage. The app loads data from SQLite on startup and writes updates to both locations (as long as localStorage has space).

### Can I delete localStorage after migrating?

Not recommended. localStorage serves as a fast cache for instant app startup. If you delete it, the app will be slightly slower on first load (needs to read from SQLite).

### How do I verify my data migrated?

Check the database:

```bash
# View database location
ls -lh ~/.local/share/sherpy/sherpy.db

# Open database shell
sqlite3 ~/.local/share/sherpy/sherpy.db

# List all projects
SELECT code, name, status, current_step FROM projects;

# Exit shell
.quit
```

### What if the database file is corrupted?

The app gracefully falls back to localStorage:

1. App detects corrupted database
2. Creates fresh `sherpy.db`
3. Continues loading from localStorage
4. Writes updates to new database

You don't lose any data.

---

## Troubleshooting

### Database directory not created

**Symptom:** No `~/.local/share/sherpy/` directory  
**Solution:** App creates it automatically. If it doesn't, check permissions:

```bash
# Manually create directory
mkdir -p ~/.local/share/sherpy

# Check permissions
ls -ld ~/.local/share/sherpy
```

### Database locked error

**Symptom:** Console shows "database is locked"  
**Cause:** Multiple app instances running  
**Solution:** Close extra browser tabs/windows

### Disk full error

**Symptom:** Database writes fail, console shows "disk full"  
**Solution:** Free up disk space or use in-memory mode:

```bash
export SHERPY_DB_PATH=:memory:
npm run dev
```

---

## Advanced: Manual Migration (Optional)

If you want to proactively migrate all localStorage data to SQLite:

### Step 1: Identify localStorage Keys

Open browser DevTools → Application → Local Storage:

```
Keys:
- planning-machine-state
- sherpy-projects
- step1-form-data
- step2-interview-answers
- ...
```

### Step 2: Export localStorage Data

```javascript
// In browser console
const data = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.startsWith('sherpy-') || key.startsWith('planning-')) {
    data[key] = localStorage.getItem(key);
  }
}
console.log(JSON.stringify(data, null, 2));
```

### Step 3: Trigger Writes

Open each project in the app. This triggers automatic write to SQLite.

### Step 4: Verify

```bash
sqlite3 ~/.local/share/sherpy/sherpy.db "SELECT COUNT(*) FROM projects;"
```

---

## Rollback Procedure

If you need to revert to pre-SQLite version:

### Option 1: Keep localStorage, Remove SQLite

```bash
# Delete database file
rm ~/.local/share/sherpy/sherpy.db

# localStorage data remains intact
# App continues working normally
```

### Option 2: Export Data First

```bash
# Backup database
cp ~/.local/share/sherpy/sherpy.db ~/sherpy-backup.db

# Export to JSON (optional)
sqlite3 ~/.local/share/sherpy/sherpy.db <<EOF
.mode json
.output ~/sherpy-projects.json
SELECT * FROM projects;
.output ~/sherpy-artifacts.json
SELECT * FROM artifacts;
.quit
EOF
```

### Option 3: Downgrade App Version

```bash
# Checkout previous version
git checkout <previous-commit>

# Install dependencies
npm install

# Run app (will use localStorage only)
npm run dev
```

---

## Support

**Issues?** Report at: https://github.com/validkeys/sherpy-ui/issues

**Questions?** Check:
- [Database Schema Docs](./schema.md)
- [Developer Migration Guide](./migration-guide.md)
- [Database README](./README.md)

---

**Last Updated:** 2026-05-20  
**Status:** ✅ Production Ready
