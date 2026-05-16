const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

function loadPresentableNameMaps() {
  const mappingPath = path.resolve(process.cwd(), 'presentable_names.txt');
  const rawToDisplay = new Map();
  const displayToRaw = new Map();

  try {
    const lines = fs.readFileSync(mappingPath, 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.includes(':')) {
        return;
      }

      const [rawPart, displayPart] = trimmedLine.split(':');
      const raw = String(rawPart || '').trim();
      const display = String(displayPart || '').trim();
      if (!raw || !display) {
        return;
      }

      rawToDisplay.set(raw, display);
      displayToRaw.set(display, raw);
    });
  } catch (error) {
    console.warn(`Could not load presentable names from ${mappingPath}:`, error.message);
  }

  return { rawToDisplay, displayToRaw };
}

const { rawToDisplay: RAW_TO_DISPLAY, displayToRaw: DISPLAY_TO_RAW } = loadPresentableNameMaps();

function toDisplayName(name) {
  const normalized = String(name || '').trim();
  return RAW_TO_DISPLAY.get(normalized) || normalized;
}

function toRawName(name) {
  const normalized = String(name || '').trim();
  if (RAW_TO_DISPLAY.has(normalized)) {
    return normalized;
  }

  return DISPLAY_TO_RAW.get(normalized) || normalized;
}

const BIOME_CONFIG = {
  'temperate-forest': {
    dbPath: process.env.DGIS_DB_PATH || path.resolve(process.cwd(), 'DGIS.db'),
    mapProjection: {
      mode: 'fixed',
      minX: 0,
      maxX: 1000,
      minZ: 0,
      maxZ: 1000,
      invertY: true,
    },
    labels: {
      flora: {
        trees: ['Hickory', 'Maple'],
        plants: [],
      },
      fauna: ['Wood Frog', 'White-tailed Deer', 'Red Fox', 'Raccoon', 'American Black Bear'],
    },
  },
  'boreal-forest': {
    dbPath: path.resolve(process.cwd(), 'DGIS_Boreal.db'),
    mapProjection: {
      mode: 'fixed',
      minX: 0,
      maxX: 1000,
      minZ: 0,
      maxZ: 1000,
      invertY: true,
    },
    labels: {
      flora: {
        trees: ['Birch Tree', 'Conifer'],
        plants: [],
      },
      fauna: ['Beaver', 'Lynx', 'Marten', 'Squirrel', 'Warbler', 'Woodpecker'],
    },
  },
  mountain: {
    dbPath: path.resolve(process.cwd(), 'DGIS_Mountain.db'),
    mapProjection: {
      mode: 'fixed',
      minX: 0,
      maxX: 1153,
      minZ: 0,
      maxZ: 1153,
      invertY: true,
    },
    labels: {
      flora: {
        trees: ['Conifer'],
        plants: ['Edelweiss', 'Heather', 'Rhododendron'],
      },
      fauna: ['Alpine Marmot', 'Elk', 'Golden Eagle', 'Grizzly Bear', 'Mountain Lion'],
    },
  },
  plains: {
    dbPath: path.resolve(process.cwd(), 'DGIS_Plains.db'),
    mapProjection: {
      mode: 'fixed',
      minX: 0,
      maxX: 1000,
      minZ: 0,
      maxZ: 1000,
      invertY: true,
    },
    labels: {
      flora: {
        trees: [],
        plants: [],
      },
      fauna: ['Bison', 'Black-footed Ferret', 'Hyena', 'Lion', 'Ornate Box Turtle', 'Pipit', 'Elephant', 'Quail', 'Zebra'],
    },
  },
  'subtropical-desert': {
    dbPath: path.resolve(process.cwd(), 'DGIS_Subtropical.db'),
    mapProjection: {
      mode: 'fixed',
      minX: 0,
      maxX: 1000,
      minZ: 0,
      maxZ: 1000,
      invertY: true,
    },
    labels: {
      flora: {
        trees: ['Date Palm'],
        plants: ['Aloe Vera Plant', 'Salvia Plant'],
      },
      fauna: ['Jerboa', 'Desert Scorpion', 'Fennec Fox', 'Dromedary Camel', 'Gecko', 'Horned Lizard'],
    },
  },
};

const DEFAULT_BIOME = 'temperate-forest';
const dbCache = new Map();

function resolveBiome(rawBiome) {
  const biome = String(rawBiome || '').trim();
  if (!biome) {
    return DEFAULT_BIOME;
  }

  return BIOME_CONFIG[biome] ? biome : null;
}

function getCategoryLabels(biome, category) {
  const config = BIOME_CONFIG[biome] || BIOME_CONFIG[DEFAULT_BIOME];
  if (category === 'fauna') {
    return config.labels.fauna;
  }

  const floraGroups = config.labels.flora;
  if (Array.isArray(floraGroups)) {
    return floraGroups;
  }

  return [...floraGroups.trees, ...floraGroups.plants];
}

function getFloraLabelGroups(biome) {
  const config = BIOME_CONFIG[biome] || BIOME_CONFIG[DEFAULT_BIOME];
  const floraGroups = config.labels.flora;

  if (Array.isArray(floraGroups)) {
    return {
      trees: floraGroups,
      plants: [],
    };
  }

  return {
    trees: floraGroups.trees,
    plants: floraGroups.plants,
  };
}

function getDbForBiome(biome) {
  const config = BIOME_CONFIG[biome];
  if (!config) {
    return { db: null, error: new Error(`Unsupported biome: ${biome}`), dbPath: '' };
  }

  if (dbCache.has(biome)) {
    return { db: dbCache.get(biome), error: null, dbPath: config.dbPath };
  }

  try {
    const db = new Database(config.dbPath, { readonly: true, fileMustExist: true });
    dbCache.set(biome, db);
    return { db, error: null, dbPath: config.dbPath };
  } catch (error) {
    return { db: null, error, dbPath: config.dbPath };
  }
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

function detectImageMime(imageBuffer) {
  if (!imageBuffer || imageBuffer.length < 4) {
    return 'application/octet-stream';
  }

  // JPEG
  if (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG
  if (
    imageBuffer.length >= 8 &&
    imageBuffer[0] === 0x89 &&
    imageBuffer[1] === 0x50 &&
    imageBuffer[2] === 0x4e &&
    imageBuffer[3] === 0x47 &&
    imageBuffer[4] === 0x0d &&
    imageBuffer[5] === 0x0a &&
    imageBuffer[6] === 0x1a &&
    imageBuffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // GIF
  if (
    imageBuffer.length >= 6 &&
    imageBuffer[0] === 0x47 &&
    imageBuffer[1] === 0x49 &&
    imageBuffer[2] === 0x46 &&
    imageBuffer[3] === 0x38
  ) {
    return 'image/gif';
  }

  // WEBP (RIFF....WEBP)
  if (
    imageBuffer.length >= 12 &&
    imageBuffer[0] === 0x52 &&
    imageBuffer[1] === 0x49 &&
    imageBuffer[2] === 0x46 &&
    imageBuffer[3] === 0x46 &&
    imageBuffer[8] === 0x57 &&
    imageBuffer[9] === 0x45 &&
    imageBuffer[10] === 0x42 &&
    imageBuffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return 'application/octet-stream';
}

app.get('/api/health', (_req, res) => {
  const databaseStatus = Object.keys(BIOME_CONFIG).map((biome) => {
    const { db, error, dbPath } = getDbForBiome(biome);
    return {
      biome,
      ok: Boolean(db),
      databasePath: dbPath,
      error: error ? String(error.message || error) : null,
    };
  });

  res.json({
    ok: databaseStatus.every((item) => item.ok),
    databases: databaseStatus,
  });
});

app.get('/api/labels', (req, res) => {
  const biome = resolveBiome(req.query.biome);
  if (!biome) {
    return res.status(400).json({ error: `Unsupported biome: ${String(req.query.biome || '')}` });
  }

  const { db, error, dbPath } = getDbForBiome(biome);
  if (!db) {
    return res.status(500).json({ error: `Database is not available for ${biome}: ${dbPath}`, details: String(error?.message || error || '') });
  }

  const category = req.query.category === 'fauna' ? 'fauna' : 'flora';
  const labels = getCategoryLabels(biome, category);
  const labelsRaw = labels.map((name) => toRawName(name));
  const floraGroups = category === 'flora' ? getFloraLabelGroups(biome) : null;

  let countMap = {};
  if (labelsRaw.length > 0) {
    const placeholders = labelsRaw.map(() => '?').join(',');
    const counts = db
      .prepare(
        `SELECT Name as name, COUNT(*) as count
         FROM Observations
         WHERE Name IN (${placeholders})
         GROUP BY Name`
      )
      .all(...labelsRaw);

    countMap = Object.fromEntries(counts.map((row) => [row.name, row.count]));
  }


  return res.json({
    labels: labels.map((name) => ({
      name: toDisplayName(name),
      group:
        category === 'fauna'
          ? 'fauna'
          : floraGroups?.trees.includes(name)
            ? 'trees'
            : 'plants',
      count: countMap[toRawName(name)] || 0,
    })),
  });
});

app.get('/api/detections', (req, res) => {
  const biome = resolveBiome(req.query.biome);
  if (!biome) {
    return res.status(400).json({ error: `Unsupported biome: ${String(req.query.biome || '')}` });
  }

  const { db, error, dbPath } = getDbForBiome(biome);
  if (!db) {
    return res.status(500).json({ error: `Database is not available for ${biome}: ${dbPath}`, details: String(error?.message || error || '') });
  }

  const category = req.query.category === 'fauna' ? 'fauna' : 'flora';
  const allowedLabels = getCategoryLabels(biome, category);
  const allowedRawLabels = allowedLabels.map((name) => toRawName(name));
  const labelsParamProvided = req.query.labels !== undefined;
  const requestedLabels = String(req.query.labels || '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => toRawName(label))
    .filter((label) => allowedRawLabels.includes(label));

  const activeLabels = labelsParamProvided ? requestedLabels : allowedRawLabels;
  const confidenceMin = Number(req.query.confidenceMin || 0);

  if (activeLabels.length === 0) {
    return res.json({ detections: [] });
  }

  const mapProjection = BIOME_CONFIG[biome].mapProjection;

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

  const bounds = mapProjection?.mode === 'fixed'
    ? mapProjection
    : db
        .prepare(
          `SELECT MIN(X) AS minX, MAX(X) AS maxX, MIN(Z) AS minZ, MAX(Z) AS maxZ
           FROM Observations
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
         Type AS type,
         Confidence_Level AS confidence,
         Drone_ID AS droneId
       FROM Observations
       WHERE ${where.join(' AND ')}
       ORDER BY Timestamp DESC, ID DESC`
    )
    .all(...params);

  const minX = Number(bounds?.minX ?? 0);
  const maxX = Number(bounds?.maxX ?? 0);
  const minZ = Number(bounds?.minZ ?? 0);
  const maxZ = Number(bounds?.maxZ ?? 0);
  const invertY = bounds?.invertY ?? true;

  return res.json({
    detections: rows.map((row) => {
      const px = normalize(Number(row.x), minX, maxX);
      const py = normalize(Number(row.z ?? 0), minZ, maxZ);
      const percentY = invertY ? 100 - py : py;
      return {
        id: row.id,
        name: toDisplayName(row.name),
        timestamp: row.timestamp,
        x: Number(row.x),
        y: Number(row.y),
        z: Number(row.z ?? 0),
        type: row.type || null,
        confidence: Number(row.confidence),
        droneId: Number(row.droneId),
        percentX: Math.max(0, Math.min(100, px)),
        percentY: Math.max(0, Math.min(100, percentY)),
      };
    }),
  });
});

app.get('/api/stats', (req, res) => {
  const biome = resolveBiome(req.query.biome);
  if (!biome) {
    return res.status(400).json({ error: `Unsupported biome: ${String(req.query.biome || '')}` });
  }

  const { db, error, dbPath } = getDbForBiome(biome);
  if (!db) {
    return res.status(500).json({ error: `Database is not available for ${biome}: ${dbPath}`, details: String(error?.message || error || '') });
  }

  const floraGroups = getFloraLabelGroups(biome);
  const treeRawLabels = floraGroups.trees.map((name) => toRawName(name));
  const plantRawLabels = floraGroups.plants.map((name) => toRawName(name));

  const totals = db
    .prepare('SELECT COUNT(*) AS totalDetections FROM Observations')
    .get();

  const treeCount = treeRawLabels.length > 0
    ? db
        .prepare(`SELECT COUNT(*) AS totalTrees FROM Observations WHERE Name IN (${treeRawLabels.map(() => '?').join(',')})`)
        .get(...treeRawLabels)
    : { totalTrees: 0 };

  const plantCount = plantRawLabels.length > 0
    ? db
        .prepare(`SELECT COUNT(*) AS totalPlants FROM Observations WHERE Name IN (${plantRawLabels.map(() => '?').join(',')})`)
        .get(...plantRawLabels)
    : { totalPlants: 0 };

  return res.json({
    stats: {
      totalDetections: Number(totals?.totalDetections ?? 0),
      totalTrees: Number(treeCount?.totalTrees ?? 0),
      totalPlants: Number(plantCount?.totalPlants ?? 0),
      areaScanned: 2.4,
    },
  });
});

app.get('/api/observations/:id/image', (req, res) => {
  const biome = resolveBiome(req.query.biome);
  if (!biome) {
    return res.status(400).json({ error: `Unsupported biome: ${String(req.query.biome || '')}` });
  }

  const { db } = getDbForBiome(biome);
  if (!db) {
    return res.status(500).json({ error: `Database is not available for ${biome}` });
  }

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid observation ID' });
  }

  try {
    const row = db
      .prepare(
        `SELECT Image
         FROM Observation_Images
         WHERE Observation_ID = ? AND Image IS NOT NULL
         ORDER BY ID ASC
         LIMIT 1`
      )
      .get(id);

    if (!row || !row.Image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.set('Content-Type', detectImageMime(row.Image));
    res.send(row.Image);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch image', details: error.message });
  }
});

app.get('/api/observations/:id/images', (req, res) => {
  const biome = resolveBiome(req.query.biome);
  if (!biome) {
    return res.status(400).json({ error: `Unsupported biome: ${String(req.query.biome || '')}` });
  }

  const { db } = getDbForBiome(biome);
  if (!db) {
    return res.status(500).json({ error: `Database is not available for ${biome}` });
  }

  const observationId = Number(req.params.id);
  if (Number.isNaN(observationId)) {
    return res.status(400).json({ error: 'Invalid observation ID' });
  }

  try {
    const rows = db
      .prepare(
        `SELECT ID AS id
         FROM Observation_Images
         WHERE Observation_ID = ? AND Image IS NOT NULL
         ORDER BY ID ASC`
      )
      .all(observationId);

    const biomeQuery = encodeURIComponent(biome);
    return res.json({
      images: rows.map((row) => ({
        id: Number(row.id),
        url: `/api/observations/${observationId}/images/${Number(row.id)}?biome=${biomeQuery}`,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch observation images', details: error.message });
  }
});

app.get('/api/observations/:id/images/:imageId', (req, res) => {
  const biome = resolveBiome(req.query.biome);
  if (!biome) {
    return res.status(400).json({ error: `Unsupported biome: ${String(req.query.biome || '')}` });
  }

  const { db } = getDbForBiome(biome);
  if (!db) {
    return res.status(500).json({ error: `Database is not available for ${biome}` });
  }

  const observationId = Number(req.params.id);
  const imageId = Number(req.params.imageId);
  if (Number.isNaN(observationId) || Number.isNaN(imageId)) {
    return res.status(400).json({ error: 'Invalid observation or image ID' });
  }

  try {
    const row = db
      .prepare(
        `SELECT Image
         FROM Observation_Images
         WHERE Observation_ID = ? AND ID = ?`
      )
      .get(observationId, imageId);

    if (!row || !row.Image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.set('Content-Type', detectImageMime(row.Image));
    return res.send(row.Image);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch image', details: error.message });
  }
});

app.get('/api/drones/status', (req, res) => {
  const biome = resolveBiome(req.query.biome);
  if (!biome) {
    return res.status(400).json({ error: `Unsupported biome: ${String(req.query.biome || '')}` });
  }

  const { db } = getDbForBiome(biome);
  if (!db) {
    return res.status(500).json({ error: `Database not available for ${biome}` });
  }

  try {
    const rows = db.prepare(`
      SELECT
        ID as id,
        Drone_ID as droneId,
        X as x,
        Y as y,
        Z as z,
        Speed as speed,
        Timestamp as timestamp
      FROM Drone_Status
      GROUP BY Drone_ID
      HAVING Timestamp = MAX(Timestamp)
      ORDER BY Drone_ID
    `).all();
    
    return res.json({ statuses: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Could not fetch drone status', details: err.message });
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`DGIS API listening on http://localhost:${PORT}`);
  Object.entries(BIOME_CONFIG).forEach(([biome, config]) => {
    console.log(`Configured ${biome} database at ${config.dbPath}`);
  });
});
