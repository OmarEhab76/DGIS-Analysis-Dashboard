const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const FLORA_LABELS = ['Hickory', 'Maple'];
const FAUNA_LABELS = ['Wood Frog', 'White-tailed Deer', 'Red Fox', 'Raccoon', 'American Black Bear'];

function getCategoryLabels(category) {
  return category === 'fauna' ? FAUNA_LABELS : FLORA_LABELS;
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function normalize(value, min, max) {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

const dbPath = process.env.DGIS_DB_PATH || path.resolve(process.cwd(), '..', 'DGIS.db');
let db;

try {
  db = new Database(dbPath, { readonly: true, fileMustExist: true });
} catch (error) {
  console.error('Failed to open database:', error);
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: Boolean(db),
    databasePath: dbPath,
  });
});

app.get('/api/labels', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database is not available' });
  }

  const category = req.query.category === 'fauna' ? 'fauna' : 'flora';
  const labels = getCategoryLabels(category);

  const placeholders = labels.map(() => '?').join(',');
  const counts = db
    .prepare(
      `SELECT Name as name, COUNT(*) as count
       FROM Observations_new
       WHERE Name IN (${placeholders})
       GROUP BY Name`
    )
    .all(...labels);

  const countMap = Object.fromEntries(counts.map((row) => [row.name, row.count]));

  return res.json({
    labels: labels.map((name) => ({
      name,
      group: category === 'flora' ? 'trees' : 'fauna',
      count: countMap[name] || 0,
    })),
  });
});

app.get('/api/detections', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database is not available' });
  }

  const category = req.query.category === 'fauna' ? 'fauna' : 'flora';
  const allowedLabels = getCategoryLabels(category);
  const labelsParamProvided = req.query.labels !== undefined;
  const requestedLabels = String(req.query.labels || '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
    .filter((label) => allowedLabels.includes(label));

  const activeLabels = labelsParamProvided ? requestedLabels : allowedLabels;
  const confidenceMin = Number(req.query.confidenceMin || 0);

  if (activeLabels.length === 0) {
    return res.json({ detections: [] });
  }

  const where = [];
  const params = [];

  where.push(`Name IN (${activeLabels.map(() => '?').join(',')})`);
  params.push(...activeLabels);

  where.push('Confidence_Level >= ?');
  params.push(Number.isNaN(confidenceMin) ? 0 : confidenceMin);

  const dateFrom = String(req.query.dateFrom || '').trim();
  if (isValidDate(dateFrom)) {
    where.push('date(Timestamp) >= date(?)');
    params.push(dateFrom);
  }

  const dateTo = String(req.query.dateTo || '').trim();
  if (isValidDate(dateTo)) {
    where.push('date(Timestamp) <= date(?)');
    params.push(dateTo);
  }

  const bounds = db
    .prepare(
      `SELECT MIN(X) AS minX, MAX(X) AS maxX, MIN(Y) AS minY, MAX(Y) AS maxY
       FROM Observations_new
       WHERE Name IN (${activeLabels.map(() => '?').join(',')})`
    )
    .get(...activeLabels);

  const rows = db
    .prepare(
      `SELECT
         ID AS id,
         Name AS name,
         Timestamp AS timestamp,
         X AS x,
         Y AS y,
         Z AS z,
         Confidence_Level AS confidence,
         Drone_ID AS droneId
       FROM Observations_new
       WHERE ${where.join(' AND ')}
       ORDER BY Timestamp DESC, ID DESC`
    )
    .all(...params);

  const minX = Number(bounds?.minX ?? 0);
  const maxX = Number(bounds?.maxX ?? 0);
  const minY = Number(bounds?.minY ?? 0);
  const maxY = Number(bounds?.maxY ?? 0);

  return res.json({
    detections: rows.map((row) => {
      const px = normalize(Number(row.x), minX, maxX);
      const py = normalize(Number(row.y), minY, maxY);
      return {
        id: row.id,
        name: row.name,
        timestamp: row.timestamp,
        x: Number(row.x),
        y: Number(row.y),
        z: Number(row.z ?? 0),
        confidence: Number(row.confidence),
        droneId: Number(row.droneId),
        percentX: Math.max(0, Math.min(100, px)),
        percentY: Math.max(0, Math.min(100, 100 - py)),
      };
    }),
  });
});

app.get('/api/stats', (_req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database is not available' });
  }

  const totals = db
    .prepare('SELECT COUNT(*) AS totalDetections FROM Observations_new')
    .get();

  const treeCount = db
    .prepare(`SELECT COUNT(*) AS totalTrees FROM Observations_new WHERE Name IN (${FLORA_LABELS.map(() => '?').join(',')})`)
    .get(...FLORA_LABELS);

  return res.json({
    stats: {
      totalDetections: Number(totals?.totalDetections ?? 0),
      totalTrees: Number(treeCount?.totalTrees ?? 0),
      totalPlants: '-',
      areaScanned: 2.4,
    },
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`DGIS API listening on http://localhost:${PORT}`);
  console.log(`Using database at ${dbPath}`);
});
