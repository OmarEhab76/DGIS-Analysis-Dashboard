const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

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
        plants: ['Buffalograss'],
      },
      fauna: ['Bison', 'Black-footed Ferret', 'Burrowing Owl', 'Hyena', 'Lion', 'Ornate Box Turtle', 'Pipit', 'Plains Elephant', 'Quail', 'Zebra'],
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
  const floraGroups = category === 'flora' ? getFloraLabelGroups(biome) : null;

  const placeholders = labels.map(() => '?').join(',');
  const counts = db
    .prepare(
      `SELECT Name as name, COUNT(*) as count
       FROM Observations
       WHERE Name IN (${placeholders})
       GROUP BY Name`
    )
    .all(...labels);

  const countMap = Object.fromEntries(counts.map((row) => [row.name, row.count]));

  return res.json({
    labels: labels.map((name) => ({
      name,
      group:
        category === 'fauna'
          ? 'fauna'
          : floraGroups?.trees.includes(name)
            ? 'trees'
            : 'plants',
      count: countMap[name] || 0,
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
        name: row.name,
        timestamp: row.timestamp,
        x: Number(row.x),
        y: Number(row.y),
        z: Number(row.z ?? 0),
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

  const floraLabels = getCategoryLabels(biome, 'flora');
  const floraGroups = getFloraLabelGroups(biome);

  const totals = db
    .prepare('SELECT COUNT(*) AS totalDetections FROM Observations')
    .get();

  const treeCount = floraGroups.trees.length > 0
    ? db
        .prepare(`SELECT COUNT(*) AS totalTrees FROM Observations WHERE Name IN (${floraGroups.trees.map(() => '?').join(',')})`)
        .get(...floraGroups.trees)
    : { totalTrees: 0 };

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
  Object.entries(BIOME_CONFIG).forEach(([biome, config]) => {
    console.log(`Configured ${biome} database at ${config.dbPath}`);
  });
});
