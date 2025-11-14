import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { PLACE_BASE_LATITUDE, PLACE_BASE_LONGITUDE, PLACE_COORDINATE_SCALE } from "./constants";

type BetterSqliteInstance = ReturnType<typeof Database>;

type IndoorNavGlobal = typeof globalThis & {
  __indoorNavDb?: BetterSqliteInstance;
};

const globalForDb = globalThis as IndoorNavGlobal;

type PlaceSeed = {
  id: number;
  slug: string;
  floor: string;
  zone: string;
  x: number;
  y: number;
  type: string;
  imageUrl: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ConnectionSeed = {
  from: number;
  to: number;
  distance: number;
  orientation: "north" | "south" | "east" | "west" | "up" | "down";
  landmark?: string;
};

type TranslationSeed = Record<
  string,
  Record<
    string,
    {
      name: string;
      description: string;
    }
  >
>;

type DashboardSeed = {
  slug: string;
  name: string;
  description: string;
  placeIds: number[];
};

const placeSeed: PlaceSeed[] = [
  {
    id: 1,
    slug: "barzilai-main-lobby",
    floor: "Ground",
    zone: "Main Pavilion",
    x: 0,
    y: 0,
    type: "entry",
    imageUrl:
      "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 2,
    slug: "emergency-department",
    floor: "Ground",
    zone: "Emergency Wing",
    x: -30,
    y: 0,
    type: "critical-care",
    imageUrl:
      "https://images.unsplash.com/photo-1580281657521-54fd42ab7bef?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 3,
    slug: "trauma-unit",
    floor: "Ground",
    zone: "Emergency Wing",
    x: -45,
    y: 0,
    type: "critical-care",
    imageUrl:
      "https://images.unsplash.com/photo-1580281657521-028b5b1e0dab?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 4,
    slug: "diagnostic-imaging",
    floor: "Ground",
    zone: "Clinical Services",
    x: 0,
    y: -20,
    type: "diagnostic",
    imageUrl:
      "https://images.unsplash.com/photo-1580281658629-50c0d13b7ac8?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 5,
    slug: "cardiology-institute",
    floor: "Ground",
    zone: "Clinical Tower",
    x: 20,
    y: 0,
    type: "clinic",
    imageUrl:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 6,
    slug: "surgery-tower",
    floor: "First",
    zone: "Clinical Tower",
    x: 35,
    y: 0,
    type: "surgery",
    imageUrl:
      "https://images.unsplash.com/photo-1580281555110-868c1d113e09?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 7,
    slug: "intensive-care",
    floor: "Second",
    zone: "Critical Care",
    x: 35,
    y: 20,
    type: "critical-care",
    imageUrl:
      "https://images.unsplash.com/photo-1582719478250-39f26015ec20?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 8,
    slug: "maternity-pavilion",
    floor: "Second",
    zone: "Family Care",
    x: 20,
    y: 20,
    type: "maternity",
    imageUrl:
      "https://images.unsplash.com/photo-1519494080410-f9aa76cb4283?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 9,
    slug: "pediatric-center",
    floor: "Second",
    zone: "Family Care",
    x: 0,
    y: 20,
    type: "clinic",
    imageUrl:
      "https://images.unsplash.com/photo-1582719478250-e50d00c5c6d1?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 10,
    slug: "outpatient-clinics",
    floor: "Ground",
    zone: "Ambulatory Services",
    x: -30,
    y: 20,
    type: "clinic",
    imageUrl:
      "https://images.unsplash.com/photo-1582719478181-2cf4eaf458cc?auto=format&fit=crop&w=600&q=80",
  },
];

for (const place of placeSeed) {
  if (place.latitude == null) {
    place.latitude = PLACE_BASE_LATITUDE + place.y * PLACE_COORDINATE_SCALE;
  }
  if (place.longitude == null) {
    place.longitude = PLACE_BASE_LONGITUDE + place.x * PLACE_COORDINATE_SCALE;
  }
}

const connectionSeed: ConnectionSeed[] = [
  { from: 1, to: 2, distance: 30, orientation: "west", landmark: "Emergency drop-off canopy" },
  { from: 2, to: 1, distance: 30, orientation: "east", landmark: "Lobby entry promenade" },
  { from: 2, to: 3, distance: 15, orientation: "west", landmark: "Trauma access corridor" },
  { from: 3, to: 2, distance: 15, orientation: "east", landmark: "Resuscitation alcove" },
  { from: 1, to: 4, distance: 20, orientation: "south", landmark: "Imaging reception" },
  { from: 4, to: 1, distance: 20, orientation: "north", landmark: "Main lobby" },
  { from: 1, to: 5, distance: 20, orientation: "east", landmark: "Clinical tower concourse" },
  { from: 5, to: 1, distance: 20, orientation: "west", landmark: "Main lobby link" },
  { from: 5, to: 6, distance: 15, orientation: "east", landmark: "Surgical preparation bridge" },
  { from: 6, to: 5, distance: 15, orientation: "west", landmark: "Cardiology foyer" },
  { from: 6, to: 7, distance: 20, orientation: "north", landmark: "Sky garden corridor" },
  { from: 7, to: 6, distance: 20, orientation: "south", landmark: "Surgery recovery" },
  { from: 5, to: 8, distance: 20, orientation: "north", landmark: "Family care elevators" },
  { from: 8, to: 5, distance: 20, orientation: "south", landmark: "Cardiology institute" },
  { from: 1, to: 9, distance: 20, orientation: "north", landmark: "Healing courtyard" },
  { from: 9, to: 1, distance: 20, orientation: "south", landmark: "Lobby garden" },
  { from: 2, to: 10, distance: 20, orientation: "north", landmark: "Ambulatory walkway" },
  { from: 10, to: 2, distance: 20, orientation: "south", landmark: "Emergency entrance" },
  { from: 10, to: 9, distance: 30, orientation: "east", landmark: "Clinic promenade" },
  { from: 9, to: 10, distance: 30, orientation: "west", landmark: "Outpatient plaza" },
  { from: 9, to: 8, distance: 20, orientation: "east", landmark: "Family lounge corridor" },
  { from: 8, to: 9, distance: 20, orientation: "west", landmark: "Pediatric nurses station" },
];

const translationSeed: TranslationSeed = {
  he: {
    "barzilai-main-lobby": {
      name: "לובי מרכז ברזילי",
      description: "כניסה ראשית עם עמדת קבלה, מוקד מידע ומעבר מהיר לכל אגפי המרכז הרפואי.",
    },
    "emergency-department": {
      name: "חדר מיון",
      description: "מוקד טיפול דחוף עם צוות רב-מקצועי עבור מקרים דחופים ונפגעים.",
    },
    "trauma-unit": {
      name: "יחידת טראומה",
      description: "יחידה מתקדמת לטיפול בפצועים מורכבים עם חדרי ניתוח וציוד הצלה ייעודי.",
    },
    "diagnostic-imaging": {
      name: "מרכז הדמיה",
      description: "MRI, CT, אולטרסאונד וצילום רנטגן עם צוות מומחים לקריאה מיידית.",
    },
    "cardiology-institute": {
      name: "מכון הקרדיולוגיה",
      description: "בדיקות לב מתקדמות, צנתורים ומרפאות מעקב לחולי לב.",
    },
    "surgery-tower": {
      name: "מגדל הניתוחים",
      description: "קומפלקס חדרי ניתוח היברידיים, התאוששות ותמיכה לאחר ניתוח.",
    },
    "intensive-care": {
      name: "יחידת טיפול נמרץ",
      description: "טיפול רציף במטופלים במצב קריטי עם ניטור מתקדם סביב השעון.",
    },
    "maternity-pavilion": {
      name: "אגף נשים ויולדות",
      description: "חדרי לידה, אשפוז יולדות וקליניקות לבריאות האישה.",
    },
    "pediatric-center": {
      name: "מרכז הילדים",
      description: "מרפאות ילדים, מחלקת אשפוז וחדרי משחק מותאמים למשפחות.",
    },
    "outpatient-clinics": {
      name: "מרפאות החוץ",
      description: "מרכז מרפאות רב-תחומי לתורים מתואמים ומעקב בקהילה.",
    },
  },
  en: {
    "barzilai-main-lobby": {
      name: "Barzilai Main Lobby",
      description: "Primary entrance with reception, information desk, and access to all hospital wings.",
    },
    "emergency-department": {
      name: "Emergency Department",
      description: "Acute care hub staffed 24/7 for urgent and life-threatening cases.",
    },
    "trauma-unit": {
      name: "Trauma Unit",
      description: "Advanced trauma suites with dedicated surgical support for critical injuries.",
    },
    "diagnostic-imaging": {
      name: "Diagnostic Imaging Center",
      description: "MRI, CT, ultrasound, and radiography with rapid reporting for clinicians.",
    },
    "cardiology-institute": {
      name: "Cardiology Institute",
      description: "Cath labs, echo suites, and cardiology clinics for comprehensive heart care.",
    },
    "surgery-tower": {
      name: "Surgery Tower",
      description: "Hybrid operating rooms, pre-op preparation, and post-anesthesia recovery.",
    },
    "intensive-care": {
      name: "Intensive Care Unit",
      description: "Continuous critical care with advanced monitoring and multidisciplinary teams.",
    },
    "maternity-pavilion": {
      name: "Maternity Pavilion",
      description: "Labor and delivery suites, mother-baby rooms, and women’s health services.",
    },
    "pediatric-center": {
      name: "Pediatric Center",
      description: "Children’s clinics, inpatient ward, and family-friendly play spaces.",
    },
    "outpatient-clinics": {
      name: "Outpatient Clinics",
      description: "Coordinated specialty clinics for pre-scheduled visits and follow-up care.",
    },
  },
  es: {
    "barzilai-main-lobby": {
      name: "Vestíbulo Principal Barzilai",
      description: "Entrada principal con recepción, información y acceso a todas las alas del hospital.",
    },
    "emergency-department": {
      name: "Servicio de Urgencias",
      description: "Centro de atención aguda disponible 24/7 para casos urgentes y críticos.",
    },
    "trauma-unit": {
      name: "Unidad de Trauma",
      description: "Salas avanzadas para trauma con apoyo quirúrgico dedicado para lesiones graves.",
    },
    "diagnostic-imaging": {
      name: "Centro de Imagenología",
      description: "MRI, TAC, ecografía y radiología con informes rápidos para el personal médico.",
    },
    "cardiology-institute": {
      name: "Instituto de Cardiología",
      description: "Laboratorios de cateterismo, ecocardiogramas y clínicas especializadas del corazón.",
    },
    "surgery-tower": {
      name: "Torre de Cirugía",
      description: "Quirófanos híbridos con áreas de preparación y recuperación postoperatoria.",
    },
    "intensive-care": {
      name: "UCI",
      description: "Cuidados intensivos continuos con monitoreo avanzado y equipos multidisciplinarios.",
    },
    "maternity-pavilion": {
      name: "Pabellón de Maternidad",
      description: "Salas de parto, hospitalización materna y servicios de salud de la mujer.",
    },
    "pediatric-center": {
      name: "Centro Pediátrico",
      description: "Clínicas infantiles, hospitalización y espacios lúdicos adaptados a las familias.",
    },
    "outpatient-clinics": {
      name: "Clínicas Ambulatorias",
      description: "Clínicas especializadas coordinadas para consultas programadas y seguimiento.",
    },
  },
  fr: {
    "barzilai-main-lobby": {
      name: "Hall Principal Barzilaï",
      description: "Entrée principale avec accueil, information et accès à toutes les ailes de l’hôpital.",
    },
    "emergency-department": {
      name: "Service des Urgences",
      description: "Centre de soins intensifs disponible 24/7 pour les cas urgents et vitaux.",
    },
    "trauma-unit": {
      name: "Unité de Traumatologie",
      description: "Salles de trauma avancées avec support chirurgical dédié pour blessures graves.",
    },
    "diagnostic-imaging": {
      name: "Centre d’Imagerie",
      description: "IRM, scanner, échographie et radiologie avec comptes rendus rapides.",
    },
    "cardiology-institute": {
      name: "Institut de Cardiologie",
      description: "Laboratoires de cathétérisme, échocardiographie et cliniques spécialisées du cœur.",
    },
    "surgery-tower": {
      name: "Tour de Chirurgie",
      description: "Blocs opératoires hybrides avec préparation préopératoire et salle de réveil.",
    },
    "intensive-care": {
      name: "Unité de Soins Intensifs",
      description: "Prise en charge continue avec surveillance avancée et équipes multidisciplinaires.",
    },
    "maternity-pavilion": {
      name: "Pavillon de Maternité",
      description: "Salles d’accouchement, chambres mère-bébé et services de santé féminine.",
    },
    "pediatric-center": {
      name: "Centre Pédiatrique",
      description: "Cliniques pour enfants, service d’hospitalisation et espaces ludiques familiaux.",
    },
    "outpatient-clinics": {
      name: "Cliniques Externes",
      description: "Cliniques spécialisées coordonnées pour consultations programmées et suivi.",
    },
  },
};

const dashboardSeed: DashboardSeed[] = [
  {
    slug: "barzilai-campus",
    name: "קמפוס ברזילי",
    description: "כלל מוקדי בית החולים ברזילי בתצוגה אחת.",
    placeIds: placeSeed.map((place) => place.id),
  },
  {
    slug: "critical-care-path",
    name: "מסלול טיפול נמרץ",
    description: "מסלול מהכניסה הראשית אל אגפי המיון והטיפול הקריטי.",
    placeIds: [1, 2, 3, 4, 6, 7],
  },
  {
    slug: "family-care-tour",
    name: "מסלול משפחות",
    description: "מחלקות נשים, יולדות וילדים במסלול נוח למשפחות.",
    placeIds: [1, 5, 8, 9, 10],
  },
];

function createDatabaseInstance(): BetterSqliteInstance {
  const dataDirectory = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  const databasePath = path.join(dataDirectory, "indoor-navigation.sqlite");

  const instantiate = () => {
    const instance = new Database(databasePath);
    instance.pragma("journal_mode = WAL");
    return instance;
  };

  const ensureHealthyInstance = (): BetterSqliteInstance => {
    const instance = instantiate();
    try {
      instance.prepare("PRAGMA user_version").get();
      return instance;
    } catch (error) {
      instance.close();
      throw error;
    }
  };

  try {
    return ensureHealthyInstance();
  } catch (error) {
    console.error("[sqlite] failed to open database, attempting to recreate.", error);
    try {
      if (fs.existsSync(databasePath)) {
        fs.rmSync(databasePath);
      }
    } catch (cleanupError) {
      console.error("[sqlite] failed to remove corrupted database file.", cleanupError);
    }
    return ensureHealthyInstance();
  }
}

const db = globalForDb.__indoorNavDb ?? createDatabaseInstance();

if (!globalForDb.__indoorNavDb) {
  initializeDatabase(db);
  globalForDb.__indoorNavDb = db;
}

export default db;

function initializeDatabase(database: BetterSqliteInstance) {
  const existingDashboardColumns = (() => {
    try {
      return database.prepare("PRAGMA table_info(dashboards)").all() as Array<{ name: string }>;
    } catch {
      return [];
    }
  })();

  const requiresDashboardMigration =
    existingDashboardColumns.length > 0 && !existingDashboardColumns.some((column) => column.name === "slug");

  if (requiresDashboardMigration) {
    database.exec(`
      DROP TABLE IF EXISTS dashboard_places;
      DROP TABLE IF EXISTS dashboards;
    `);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS languages (
      code TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      floor TEXT NOT NULL,
      zone TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      image_url TEXT,
      latitude REAL,
      longitude REAL
    );
    CREATE TABLE IF NOT EXISTS place_translations (
      place_id INTEGER NOT NULL,
      language_code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      PRIMARY KEY (place_id, language_code),
      FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
      FOREIGN KEY (language_code) REFERENCES languages (code) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_place_id INTEGER NOT NULL,
      to_place_id INTEGER NOT NULL,
      distance REAL NOT NULL,
      orientation TEXT NOT NULL,
      landmark TEXT,
      FOREIGN KEY (from_place_id) REFERENCES places (id) ON DELETE CASCADE,
      FOREIGN KEY (to_place_id) REFERENCES places (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS dashboards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS dashboard_places (
      dashboard_id INTEGER NOT NULL,
      place_id INTEGER NOT NULL,
      PRIMARY KEY (dashboard_id, place_id),
      FOREIGN KEY (dashboard_id) REFERENCES dashboards (id) ON DELETE CASCADE,
      FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_places_slug ON places (slug);
    CREATE INDEX IF NOT EXISTS idx_connections_from ON connections (from_place_id);
    CREATE INDEX IF NOT EXISTS idx_place_translations_lang ON place_translations (language_code);
    CREATE INDEX IF NOT EXISTS idx_dashboard_slug ON dashboards (slug);
    CREATE INDEX IF NOT EXISTS idx_dashboard_places_dashboard ON dashboard_places (dashboard_id);
    CREATE INDEX IF NOT EXISTS idx_dashboard_places_place ON dashboard_places (place_id);
  `);

  const placeColumns = database.prepare("PRAGMA table_info(places)").all() as Array<{ name: string }>;
  if (!placeColumns.some((column) => column.name === "image_url")) {
    database.exec("ALTER TABLE places ADD COLUMN image_url TEXT");
  }
  if (!placeColumns.some((column) => column.name === "latitude")) {
    database.exec("ALTER TABLE places ADD COLUMN latitude REAL");
  }
  if (!placeColumns.some((column) => column.name === "longitude")) {
    database.exec("ALTER TABLE places ADD COLUMN longitude REAL");
  }

  seedDatabase(database);

  const ensureImages = database.prepare(
    "UPDATE places SET image_url = @imageUrl WHERE slug = @slug AND (image_url IS NULL OR image_url = '')"
  );
  const ensureCoordinates = database.prepare(
    "UPDATE places SET latitude = @latitude, longitude = @longitude WHERE slug = @slug AND (latitude IS NULL OR longitude IS NULL)"
  );
  for (const place of placeSeed) {
    ensureImages.run({ slug: place.slug, imageUrl: place.imageUrl });
    ensureCoordinates.run({
      slug: place.slug,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
    });
  }

  ensureDefaultDashboards(database);
}

function seedDatabase(database: BetterSqliteInstance) {
  const placeCount = database.prepare("SELECT COUNT(*) as total FROM places").get() as { total: number };

  if (placeCount.total > 0) {
    return;
  }

  const insertLanguage = database.prepare(
    "INSERT OR IGNORE INTO languages (code, label, is_default) VALUES (@code, @label, @is_default)"
  );
  const insertPlace = database.prepare(
    "INSERT INTO places (id, slug, floor, zone, x, y, type, image_url, latitude, longitude) VALUES (@id, @slug, @floor, @zone, @x, @y, @type, @imageUrl, @latitude, @longitude)"
  );
  const insertTranslation = database.prepare(
    "INSERT INTO place_translations (place_id, language_code, name, description) VALUES (@place_id, @language_code, @name, @description)"
  );
  const insertConnection = database.prepare(
    "INSERT INTO connections (from_place_id, to_place_id, distance, orientation, landmark) VALUES (@from_place_id, @to_place_id, @distance, @orientation, @landmark)"
  );

  const seedTransaction = database.transaction(() => {
    insertLanguage.run({ code: "he", label: "עברית", is_default: 1 });
    insertLanguage.run({ code: "en", label: "English", is_default: 0 });
    insertLanguage.run({ code: "es", label: "Español", is_default: 0 });
    insertLanguage.run({ code: "fr", label: "Français", is_default: 0 });

    for (const place of placeSeed) {
      insertPlace.run(place);
    }

    for (const [languageCode, translations] of Object.entries(translationSeed)) {
      for (const place of placeSeed) {
        const translation = translations[place.slug];
        if (!translation) {
          continue;
        }
        insertTranslation.run({
          place_id: place.id,
          language_code: languageCode,
          name: translation.name,
          description: translation.description,
        });
      }
    }

    for (const connection of connectionSeed) {
      insertConnection.run({
        from_place_id: connection.from,
        to_place_id: connection.to,
        distance: connection.distance,
        orientation: connection.orientation,
        landmark: connection.landmark ?? null,
      });
    }
  });

  seedTransaction();
}

function ensureDefaultDashboards(database: BetterSqliteInstance) {
  const insertDashboard = database.prepare(
    "INSERT OR IGNORE INTO dashboards (slug, name, description) VALUES (?, ?, ?)"
  );
  const selectDashboardId = database.prepare("SELECT id FROM dashboards WHERE slug = ?");
  const insertDashboardPlace = database.prepare(
    "INSERT OR IGNORE INTO dashboard_places (dashboard_id, place_id) VALUES (?, ?)"
  );
  const placeExists = database.prepare("SELECT id FROM places WHERE id = ?");

  for (const dashboard of dashboardSeed) {
    insertDashboard.run(dashboard.slug, dashboard.name, dashboard.description);
    const record = selectDashboardId.get(dashboard.slug) as { id: number } | undefined;
    if (!record) {
      continue;
    }
    for (const placeId of dashboard.placeIds) {
      const exists = placeExists.get(placeId) as { id: number } | undefined;
      if (!exists) {
        continue;
      }
      insertDashboardPlace.run(record.id, placeId);
    }
  }
}

