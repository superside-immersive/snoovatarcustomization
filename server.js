const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '2mb' }));

// Serve static files (index.html)
app.use(express.static(__dirname));

// GET /api/tree - Load saved tree data
app.get('/api/tree', (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json(null); // No saved data, frontend will use default
    }
  } catch (err) {
    console.error('Error reading data:', err);
    res.json(null);
  }
});

// POST /api/tree - Save tree data
app.post('/api/tree', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
