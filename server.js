const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PRESETS_FILE = path.join(__dirname, 'presets.json');

app.use(express.json({ limit: '4mb' }));
app.use(express.static(__dirname));

// --- Preset file helpers ---
const readPresetsFile = () => {
  try {
    if (fs.existsSync(PRESETS_FILE)) {
      return JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    }
  } catch (e) {}
  // Auto-migrate from legacy data.json
  if (fs.existsSync(DATA_FILE)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const id = `preset_${Date.now()}`;
      const store = {
        activeId: id,
        presets: {
          [id]: { name: 'Default', treeData: legacy.treeData || legacy, settings: legacy.settings || {}, updatedAt: new Date().toISOString() }
        }
      };
      fs.writeFileSync(PRESETS_FILE, JSON.stringify(store, null, 2));
      return store;
    } catch (e) {}
  }
  return { activeId: null, presets: {} };
};

const writePresetsFile = (data) => {
  fs.writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2));
};

// GET /api/presets — list all (metadata only, no full treeData)
app.get('/api/presets', (req, res) => {
  try {
    const data = readPresetsFile();
    const list = Object.entries(data.presets).map(([id, p]) => ({
      id, name: p.name, updatedAt: p.updatedAt
    }));
    res.json({ activeId: data.activeId, list });
  } catch (err) {
    res.json({ activeId: null, list: [] });
  }
});

// GET /api/presets/:id — full preset data
app.get('/api/presets/:id', (req, res) => {
  try {
    const data = readPresetsFile();
    const preset = data.presets[req.params.id];
    if (!preset) return res.status(404).json({ error: 'Not found' });
    res.json(preset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load' });
  }
});

// POST /api/presets — create new preset
app.post('/api/presets', (req, res) => {
  try {
    const data = readPresetsFile();
    const id = `preset_${Date.now()}`;
    data.presets[id] = {
      name: req.body.name || 'Untitled',
      treeData: req.body.treeData || null,
      settings: req.body.settings || {},
      updatedAt: new Date().toISOString()
    };
    data.activeId = id;
    writePresetsFile(data);
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT /api/presets/:id — save / rename preset
app.put('/api/presets/:id', (req, res) => {
  try {
    const data = readPresetsFile();
    if (!data.presets[req.params.id]) return res.status(404).json({ error: 'Not found' });
    const existing = data.presets[req.params.id];
    data.presets[req.params.id] = {
      name:     req.body.name     !== undefined ? req.body.name     : existing.name,
      treeData: req.body.treeData !== undefined ? req.body.treeData : existing.treeData,
      settings: req.body.settings !== undefined ? req.body.settings : existing.settings,
      updatedAt: new Date().toISOString()
    };
    writePresetsFile(data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/presets/:id
app.delete('/api/presets/:id', (req, res) => {
  try {
    const data = readPresetsFile();
    if (!data.presets[req.params.id]) return res.status(404).json({ error: 'Not found' });
    delete data.presets[req.params.id];
    if (data.activeId === req.params.id) {
      data.activeId = Object.keys(data.presets)[0] || null;
    }
    writePresetsFile(data);
    res.json({ ok: true, newActiveId: data.activeId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// PATCH /api/presets/active — set active preset id
app.patch('/api/presets/active', (req, res) => {
  try {
    const data = readPresetsFile();
    data.activeId = req.body.id;
    writePresetsFile(data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set active' });
  }
});

// Legacy /api/tree kept for GitHub Pages localStorage fallback path
app.get('/api/tree', (req, res) => {
  try {
    const data = readPresetsFile();
    if (data.activeId && data.presets[data.activeId]) {
      const p = data.presets[data.activeId];
      return res.json({ treeData: p.treeData, settings: p.settings });
    }
    if (fs.existsSync(DATA_FILE)) return res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    res.json(null);
  } catch (err) { res.json(null); }
});

app.post('/api/tree', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
