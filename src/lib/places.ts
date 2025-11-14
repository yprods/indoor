import db from "./db";
import { PLACE_BASE_LATITUDE, PLACE_BASE_LONGITUDE, PLACE_COORDINATE_SCALE } from "./constants";
import { getOppositeOrientation, ORIENTATIONS, type Orientation } from "./orientation";
import { formatDirectionStep, getOrientationLabel, getUiStrings } from "./translations";

export { ORIENTATIONS } from "./orientation";
export type { Orientation } from "./orientation";

export type PlaceSummary = {
  id: number;
  slug: string;
  name: string;
  description: string;
  floor: string;
  zone: string;
  type: string;
  imageUrl: string | null;
  coordinates: { x: number; y: number };
  latitude: number | null;
  longitude: number | null;
};

export type NearbyPlace = {
  id: number;
  name: string;
  distance: number;
  orientation: Orientation;
  orientationLabel: string;
  landmark?: string | null;
  description: string;
  imageUrl: string | null;
};

export type DirectionStep = {
  fromId: number;
  toId: number;
  toName: string;
  distance: number;
  orientation: Orientation;
  landmark?: string | null;
  instruction: string;
};

export type DirectionsResult = {
  language: string;
  from: PlaceSummary;
  to: PlaceSummary;
  steps: DirectionStep[];
  totalDistance: number;
};

export type DashboardSummary = {
  id: number;
  slug: string;
  name: string;
  description: string;
  placeIds: number[];
};

type GraphEdge = {
  toId: number;
  distance: number;
  orientation: Orientation;
  landmark?: string | null;
};

export function getLanguages() {
  const statement = db.prepare("SELECT code, label, is_default as isDefault FROM languages ORDER BY is_default DESC, label ASC");
  return statement.all() as { code: string; label: string; isDefault: number }[];
}

export function addLanguage(code: string, label: string) {
  const normalizedCode = code.trim().toLowerCase();
  const normalizedLabel = label.trim();
  if (!normalizedCode || !normalizedLabel) {
    throw new Error("Language code and label are required.");
  }

  const transaction = db.transaction(() => {
    db.prepare("INSERT INTO languages (code, label, is_default) VALUES (?, ?, 0)").run(normalizedCode, normalizedLabel);

    db.prepare(
      `
        INSERT INTO place_translations (place_id, language_code, name, description)
        SELECT
          p.id,
          ? as language_code,
          COALESCE(en.name, p.slug) as name,
          COALESCE(en.description, '') as description
        FROM places p
        LEFT JOIN place_translations en
          ON en.place_id = p.id
         AND en.language_code = 'en'
        WHERE NOT EXISTS (
          SELECT 1 FROM place_translations existing
           WHERE existing.place_id = p.id
             AND existing.language_code = ?
        )
      `
    ).run(normalizedCode, normalizedCode);
  });

  transaction();
}

type CreatePlaceInput = {
  slug: string;
  floor: string;
  zone: string;
  type?: string;
  x: number;
  y: number;
  imageUrl?: string | null;
  name?: string;
  description?: string;
  language?: string;
  latitude?: number;
  longitude?: number;
};

export function createPlace(input: CreatePlaceInput): PlaceSummary {
  const slug = input.slug.trim();
  const floor = input.floor.trim();
  const zone = input.zone.trim();
  const type = (input.type ?? "general").trim() || "general";
  const language = (input.language ?? "he").trim().toLowerCase();

  if (!slug || !floor || !zone) {
    throw new Error("Slug, floor, and zone are required to create a place.");
  }

  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
    throw new Error("Coordinates must be valid numbers.");
  }

  let placeId = 0;

  const createTransaction = db.transaction(() => {
    const insertResult = db
      .prepare(
        "INSERT INTO places (slug, floor, zone, x, y, type, image_url, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        slug,
        floor,
        zone,
        input.x,
        input.y,
        type,
        input.imageUrl ?? null,
        typeof input.latitude === "number"
          ? input.latitude
          : PLACE_BASE_LATITUDE + input.y * PLACE_COORDINATE_SCALE,
        typeof input.longitude === "number"
          ? input.longitude
          : PLACE_BASE_LONGITUDE + input.x * PLACE_COORDINATE_SCALE
      );

    placeId = Number(insertResult.lastInsertRowid ?? 0);
    if (!placeId) {
      throw new Error("Failed to persist the new place.");
    }

    const name = input.name?.trim() || slug;
    const description = input.description?.trim() ?? "";

    updatePlaceTranslation(language, placeId, name, description);
    if (language !== "en") {
      updatePlaceTranslation("en", placeId, slug, description);
    }
  });

  try {
    createTransaction();
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed: places\.slug/i.test(error.message)) {
      throw new Error("A place with this slug already exists.");
    }
    throw error;
  }

  const summary = getPlaceSummary(placeId, language);
  if (!summary) {
    throw new Error("Unable to load the newly created place.");
  }

  return summary;
}

type CreateConnectionInput = {
  fromId: number;
  toId: number;
  orientation: Orientation;
  distance: number;
  landmark?: string;
  bidirectional?: boolean;
};

export function createConnection(input: CreateConnectionInput) {
  const { fromId, toId, orientation, distance, bidirectional = true } = input;

  if (!Number.isInteger(fromId) || !Number.isInteger(toId)) {
    throw new Error("fromId and toId must be valid numeric identifiers.");
  }

  if (fromId === toId) {
    throw new Error("Connections must link two different places.");
  }

  if (!ORIENTATIONS.includes(orientation)) {
    throw new Error("Orientation supplied is invalid.");
  }

  if (!Number.isFinite(distance) || distance <= 0) {
    throw new Error("Distance must be a positive number.");
  }

  const trimmedLandmark = input.landmark?.trim() ?? null;

  const transaction = db.transaction(() => {
    const placeExists = db.prepare("SELECT id FROM places WHERE id = ?");
    if (!placeExists.get(fromId)) {
      throw new Error("Origin place could not be found.");
    }
    if (!placeExists.get(toId)) {
      throw new Error("Destination place could not be found.");
    }

    const connectionExists = db.prepare(
      "SELECT id FROM connections WHERE from_place_id = ? AND to_place_id = ?"
    );

    if (connectionExists.get(fromId, toId)) {
      throw new Error("A connection between these places already exists.");
    }

    db.prepare(
      "INSERT INTO connections (from_place_id, to_place_id, distance, orientation, landmark) VALUES (?, ?, ?, ?, ?)"
    ).run(fromId, toId, distance, orientation, trimmedLandmark);

    if (bidirectional) {
      const reverseOrientation = getOppositeOrientation(orientation);
      if (!connectionExists.get(toId, fromId)) {
        db.prepare(
          "INSERT INTO connections (from_place_id, to_place_id, distance, orientation, landmark) VALUES (?, ?, ?, ?, ?)"
        ).run(toId, fromId, distance, reverseOrientation, trimmedLandmark);
      }
    }
  });

  transaction();
}

type CreateDashboardInput = {
  name: string;
  description?: string;
  placeIds: number[];
};

export function getDashboards(): DashboardSummary[] {
  const statement = db.prepare(
    `
      SELECT
        d.id,
        d.slug,
        d.name,
        d.description,
        GROUP_CONCAT(dp.place_id) as placeIds
      FROM dashboards d
      LEFT JOIN dashboard_places dp
        ON dp.dashboard_id = d.id
      GROUP BY d.id
      ORDER BY d.name COLLATE NOCASE ASC
    `
  );

  const rows = statement.all() as Array<{
    id: number;
    slug: string;
    name: string;
    description: string;
    placeIds: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    placeIds: row.placeIds
      ? row.placeIds
          .split(",")
          .map((value) => Number.parseInt(value, 10))
          .filter((value) => Number.isInteger(value))
      : [],
  }));
}

export function createDashboard(input: CreateDashboardInput): DashboardSummary {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Dashboard name is required.");
  }

  const uniquePlaceIds = Array.from(
    new Set(
      (input.placeIds ?? []).filter((value) => Number.isInteger(value) && value > 0).map((value) => Number(value))
    )
  );

  if (uniquePlaceIds.length === 0) {
    throw new Error("Select at least one place for the dashboard.");
  }

  const description = input.description?.trim() ?? "";

  const result = db.transaction(() => {
    const baseSlug = slugify(name);
    let slugCandidate = baseSlug || `dashboard-${Date.now()}`;
    let suffix = 1;
    let insertResult: { lastInsertRowid: number | bigint } | undefined;

    while (true) {
      try {
        insertResult = db
          .prepare("INSERT INTO dashboards (slug, name, description) VALUES (?, ?, ?)")
          .run(slugCandidate, name, description);
        break;
      } catch (error) {
        if (error instanceof Error && /UNIQUE constraint failed: dashboards\.slug/i.test(error.message)) {
          slugCandidate = `${baseSlug}-${suffix++}`;
          continue;
        }
        throw error;
      }
    }

    if (!insertResult) {
      throw new Error("Failed to create dashboard.");
    }

    const dashboardId = Number(insertResult.lastInsertRowid ?? 0);
    if (!dashboardId) {
      throw new Error("Failed to persist dashboard.");
    }

    const selectPlace = db.prepare("SELECT id FROM places WHERE id = ?");
    const insertAssociation = db.prepare(
      "INSERT OR IGNORE INTO dashboard_places (dashboard_id, place_id) VALUES (?, ?)"
    );

    for (const placeId of uniquePlaceIds) {
      const exists = selectPlace.get(placeId) as { id: number } | undefined;
      if (!exists) {
        throw new Error(`Place ${placeId} could not be found.`);
      }
      insertAssociation.run(dashboardId, placeId);
    }

    return { dashboardId, slug: slugCandidate };
  })();

  return {
    id: result.dashboardId,
    slug: result.slug,
    name,
    description,
    placeIds: uniquePlaceIds,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function updatePlaceTranslation(language: string, placeId: number, name: string, description: string) {
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

  if (!trimmedName) {
    throw new Error("Name cannot be empty.");
  }

  db.prepare(
    `
      INSERT INTO place_translations (place_id, language_code, name, description)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(place_id, language_code) DO UPDATE SET
        name = excluded.name,
        description = excluded.description
    `
  ).run(placeId, language.trim().toLowerCase(), trimmedName, trimmedDescription);
}

export function getPlaces(language: string, search?: string, dashboardId?: number): PlaceSummary[] {
  const params = {
    language,
    search: search ? `%${search.toLowerCase()}%` : null,
    dashboardId: typeof dashboardId === "number" && !Number.isNaN(dashboardId) ? dashboardId : null,
  };

  const statement = db.prepare(
    `
      SELECT
        p.id,
        p.slug,
        p.floor,
        p.zone,
        p.type,
        p.x,
        p.y,
        p.latitude,
        p.longitude,
        p.image_url as imageUrl,
        COALESCE(lang.name, en.name, p.slug) as name,
        COALESCE(lang.description, en.description, '') as description
      FROM places p
      LEFT JOIN place_translations lang
        ON lang.place_id = p.id
       AND lang.language_code = @language
      LEFT JOIN place_translations en
        ON en.place_id = p.id
       AND en.language_code = 'en'
      WHERE
        (@search IS NULL OR LOWER(COALESCE(lang.name, en.name, p.slug)) LIKE @search)
        AND (
          @dashboardId IS NULL
          OR EXISTS (
            SELECT 1
            FROM dashboard_places dp
            WHERE dp.place_id = p.id
              AND dp.dashboard_id = @dashboardId
          )
        )
      ORDER BY name COLLATE NOCASE ASC
    `
  );

  const rows = statement.all(params) as Array<{
    id: number;
    slug: string;
    floor: string;
    zone: string;
    type: string;
    x: number;
    y: number;
    latitude: number | null;
    longitude: number | null;
    imageUrl: string | null;
    name: string;
    description: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    floor: row.floor,
    zone: row.zone,
    type: row.type,
    imageUrl: row.imageUrl ?? null,
    coordinates: {
      x: row.x,
      y: row.y,
    },
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
  }));
}

export function getPlaceSummary(placeId: number, language: string): PlaceSummary | null {
  const statement = db.prepare(
    `
      SELECT
        p.id,
        p.slug,
        p.floor,
        p.zone,
        p.type,
        p.x,
        p.y,
        p.latitude,
        p.longitude,
        p.image_url as imageUrl,
        COALESCE(lang.name, en.name, p.slug) as name,
        COALESCE(lang.description, en.description, '') as description
      FROM places p
      LEFT JOIN place_translations lang
        ON lang.place_id = p.id
       AND lang.language_code = @language
      LEFT JOIN place_translations en
        ON en.place_id = p.id
       AND en.language_code = 'en'
     WHERE p.id = @placeId
    `
  );

  const row = statement.get({ placeId, language }) as
    | {
        id: number;
        slug: string;
        floor: string;
        zone: string;
        type: string;
        x: number;
        y: number;
        latitude: number | null;
        longitude: number | null;
        imageUrl: string | null;
        name: string;
        description: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    floor: row.floor,
    zone: row.zone,
    type: row.type,
    imageUrl: row.imageUrl ?? null,
    coordinates: { x: row.x, y: row.y },
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
  };
}

export function getNearbyPlaces(placeId: number, language: string): NearbyPlace[] {
  const statement = db.prepare(
    `
      SELECT
        c.to_place_id as id,
        c.distance,
        c.orientation,
        c.landmark,
        COALESCE(lang.name, en.name, target.slug) as name,
        COALESCE(lang.description, en.description, '') as description,
        target.image_url as imageUrl
      FROM connections c
      INNER JOIN places target
        ON target.id = c.to_place_id
      LEFT JOIN place_translations lang
        ON lang.place_id = c.to_place_id
       AND lang.language_code = @language
      LEFT JOIN place_translations en
        ON en.place_id = c.to_place_id
       AND en.language_code = 'en'
      WHERE c.from_place_id = @placeId
      ORDER BY c.distance ASC
    `
  );

  const orientationStrings = getUiStrings(language).orientationLabels;

  const rows = statement.all({ placeId, language }) as Array<{
    id: number;
    distance: number;
    orientation: Orientation;
    landmark?: string | null;
    name: string;
    description: string;
    imageUrl: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    distance: row.distance,
    orientation: row.orientation,
    orientationLabel: orientationStrings[row.orientation] ?? getOrientationLabel("en", row.orientation),
    landmark: row.landmark,
    description: row.description,
    imageUrl: row.imageUrl ?? null,
  }));
}

export function getDirections(fromId: number, toId: number, language: string): DirectionsResult {
  const fromPlace = getPlaceSummary(fromId, language);
  const toPlace = getPlaceSummary(toId, language);

  if (!fromPlace || !toPlace) {
    throw new Error("Unable to resolve the requested places.");
  }

  if (fromId === toId) {
    return {
      language,
      from: fromPlace,
      to: toPlace,
      steps: [],
      totalDistance: 0,
    };
  }

  const graph = buildGraph();
  const queue: number[] = [fromId];
  const visited = new Set<number>([fromId]);
  const previous = new Map<number, { from: number; edge: GraphEdge }>();

  while (queue.length) {
    const current = queue.shift()!;
    if (current === toId) {
      break;
    }

    const neighbors = graph.get(current) ?? [];
    for (const edge of neighbors) {
      if (visited.has(edge.toId)) {
        continue;
      }
      visited.add(edge.toId);
      previous.set(edge.toId, { from: current, edge });
      queue.push(edge.toId);
    }
  }

  if (!previous.has(toId)) {
    throw new Error("Route unavailable between the selected locations.");
  }

  const edges: GraphEdge[] = [];
  let cursor = toId;
  while (cursor !== fromId) {
    const info = previous.get(cursor);
    if (!info) {
      break;
    }
    edges.unshift(info.edge);
    cursor = info.from;
  }

  const steps: DirectionStep[] = edges.map((edge) => {
    const target = getPlaceSummary(edge.toId, language);
    if (!target) {
      throw new Error("Failed to resolve a step in the route.");
    }
    return {
      fromId,
      toId: edge.toId,
      toName: target.name,
      distance: edge.distance,
      orientation: edge.orientation,
      landmark: edge.landmark ?? null,
      instruction: formatDirectionStep(language, {
        destination: target.name,
        distance: edge.distance,
        orientation: edge.orientation,
        landmark: edge.landmark ?? undefined,
      }),
    };
  });

  const totalDistance = steps.reduce((acc, step) => acc + step.distance, 0);

  return {
    language,
    from: fromPlace,
    to: toPlace,
    steps,
    totalDistance,
  };
}

function buildGraph() {
  const statement = db.prepare(
    `
      SELECT
        from_place_id as fromId,
        to_place_id as toId,
        distance,
        orientation,
        landmark
      FROM connections
    `
  );

  const rows = statement.all() as Array<{
    fromId: number;
    toId: number;
    distance: number;
    orientation: Orientation;
    landmark?: string | null;
  }>;

  const graph = new Map<number, GraphEdge[]>();
  for (const row of rows) {
    const edges = graph.get(row.fromId) ?? [];
    edges.push({
      toId: row.toId,
      distance: row.distance,
      orientation: row.orientation,
      landmark: row.landmark,
    });
    graph.set(row.fromId, edges);
  }

  return graph;
}

