import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const HISTORY_DIR = path.join(process.cwd(), 'history');

// Ensure history directory exists
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

// GET /api/history - List past simulation runs
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(file => {
        const stats = fs.statSync(path.join(HISTORY_DIR, file));
        return {
          filename: file,
          createdAt: stats.birthtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    res.json({ status: 'success', history: files });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/history/:filename - Get specific run details
router.get('/:filename', (req, res) => {
  try {
    const filePath = path.join(HISTORY_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'error', message: 'History file not found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ status: 'success', yaml: content });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/history - Save a new simulation run
router.post('/', (req, res) => {
  try {
    const { yaml, name } = req.body;
    if (!yaml) {
      return res.status(400).json({ status: 'error', message: 'No YAML content provided' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = (name || 'simulation').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${timestamp}_${safeName}.yaml`;
    const filePath = path.join(HISTORY_DIR, filename);

    fs.writeFileSync(filePath, yaml, 'utf-8');
    res.json({ status: 'success', filename });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/history/:filename - Remove a simulation run
router.delete('/:filename', (req, res) => {
  try {
    const filePath = path.join(HISTORY_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'error', message: 'History file not found' });
    }
    fs.unlinkSync(filePath);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
