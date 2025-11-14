"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ORIENTATIONS } from "@/lib/orientation";

type LanguageOption = {
  code: string;
  label: string;
  isDefault?: number;
};

type AdminPlace = {
  id: number;
  slug: string;
  name: string;
  floor: string;
  zone: string;
  type: string;
  imageUrl: string | null;
  coordinates: { x: number; y: number };
};

type AdminDashboard = {
  id: number;
  slug: string;
  name: string;
  description: string;
  placeIds: number[];
};

type StatusBanner = {
  type: "success" | "error";
  message: string;
} | null;

const emptyPlaceForm = {
  slug: "",
  name: "",
  description: "",
  floor: "",
  zone: "",
  type: "",
  x: "",
  y: "",
};

const emptyConnectionForm = {
  fromId: "",
  toId: "",
  distance: "",
  orientation: ORIENTATIONS[0],
  landmark: "",
  bidirectional: true,
};

const emptyDashboardForm = {
  name: "",
  description: "",
  placeIds: [] as number[],
};

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error ?? "Request failed");
  }
  return response.json();
};

export default function AdminPage() {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [language, setLanguage] = useState("he");
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [placeForm, setPlaceForm] = useState({ ...emptyPlaceForm });
  const [connectionForm, setConnectionForm] = useState({ ...emptyConnectionForm });
  const [dashboardForm, setDashboardForm] = useState({ ...emptyDashboardForm });
  const [status, setStatus] = useState<StatusBanner>(null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [loadingConnection, setLoadingConnection] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [dashboards, setDashboards] = useState<AdminDashboard[]>([]);
  const [creatingDashboard, setCreatingDashboard] = useState(false);
  const mapBuilderRef = useRef<SVGSVGElement | null>(null);
  const [placeTableQuery, setPlaceTableQuery] = useState("");

  const builderBounds = useMemo(() => {
    if (!places.length) {
      return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    }
    const xs = places.map((place) => place.coordinates.x);
    const ys = places.map((place) => place.coordinates.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const paddingX = Math.max(20, (maxX - minX) * 0.05 || 20);
    const paddingY = Math.max(20, (maxY - minY) * 0.05 || 20);
    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
    };
  }, [places]);

  const projectToCanvas = (coords: { x: number; y: number }) => {
    if (!builderBounds) {
      return null;
    }
    const rangeX = Math.max(builderBounds.maxX - builderBounds.minX, 1);
    const rangeY = Math.max(builderBounds.maxY - builderBounds.minY, 1);
    const x = ((coords.x - builderBounds.minX) / rangeX) * 1000;
    const y = (1 - (coords.y - builderBounds.minY) / rangeY) * 600;
    return { x, y };
  };

  const builderPoints = useMemo(() => {
    if (!builderBounds) {
      return [];
    }
    return places
      .map((place) => {
        const projected = projectToCanvas(place.coordinates);
        if (!projected) {
          return null;
        }
        return {
          id: place.id,
          label: place.name || place.slug,
          x: projected.x,
          y: projected.y,
        };
      })
      .filter((value): value is { id: number; label: string; x: number; y: number } => Boolean(value));
  }, [builderBounds, places]);

  const pendingPoint = useMemo(() => {
    if (!builderBounds) {
      return null;
    }
    const parsedX = Number.parseFloat(placeForm.x);
    const parsedY = Number.parseFloat(placeForm.y);
    if (Number.isNaN(parsedX) || Number.isNaN(parsedY)) {
      return null;
    }
    return projectToCanvas({ x: parsedX, y: parsedY });
  }, [builderBounds, placeForm.x, placeForm.y]);

  const filteredPlaces = useMemo(() => {
    const query = placeTableQuery.trim().toLowerCase();
    if (!query) {
      return places;
    }
    return places.filter((place) => {
      const tokens = [
        place.name,
        place.slug,
        place.floor,
        place.zone,
        place.type,
        String(place.id),
        `${place.coordinates.x}`,
        `${place.coordinates.y}`,
      ];
      return tokens.some((token) => token.toLowerCase().includes(query));
    });
  }, [placeTableQuery, places]);

  const handleMapBuilderClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!mapBuilderRef.current || !builderBounds) {
        return;
      }
      const rect = mapBuilderRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      const ratioX = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      const ratioY = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
      const rangeX = Math.max(builderBounds.maxX - builderBounds.minX, 1);
      const rangeY = Math.max(builderBounds.maxY - builderBounds.minY, 1);
      const nextX = builderBounds.minX + ratioX * rangeX;
      const nextY = builderBounds.minY + (1 - ratioY) * rangeY;
      setPlaceForm((prev) => ({
        ...prev,
        x: nextX.toFixed(1),
        y: nextY.toFixed(1),
      }));
    },
    [builderBounds, setPlaceForm]
  );

  const attemptAuthorize = useCallback(
    async (candidate: string, options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      const pinValue = candidate.trim();
      if (!pinValue) {
        if (!silent) {
          setAuthError("יש להזין קוד PIN.");
        }
        setAuthorized(false);
        setActivePin(null);
        return false;
      }

      if (!silent) {
        setAuthLoading(true);
        setAuthError(null);
      }

      try {
        await fetchJson("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pinValue }),
        });
        setAuthorized(true);
        setActivePin(pinValue);
        setPinInput("");
        if (typeof window !== "undefined") {
          window.localStorage.setItem("indoor-nav-admin-pin", pinValue);
        }
        if (!silent) {
          setStatus(null);
        }
        return true;
      } catch (error) {
        if (!silent) {
          const message =
            error instanceof Error
              ? error.message.includes("Invalid PIN")
                ? "קוד ה-PIN שגוי."
                : error.message
              : "האימות נכשל. נסו שוב.";
          setAuthError(message);
        }
        setAuthorized(false);
        setActivePin(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("indoor-nav-admin-pin");
        }
        return false;
      } finally {
        if (!silent) {
          setAuthLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedPin = window.localStorage.getItem("indoor-nav-admin-pin");
    if (storedPin) {
      attemptAuthorize(storedPin, { silent: true });
    }
  }, [attemptAuthorize]);

  useEffect(() => {
    fetchJson<{ languages: LanguageOption[] }>("/api/languages")
      .then((payload) => {
        setLanguages(payload.languages ?? []);
        if (payload.languages?.length) {
          const defaultLang =
            payload.languages.find((lang) => lang.isDefault) ?? payload.languages[0];
          setLanguage((current) => {
            const exists = payload.languages.some((lang) => lang.code === current);
            return exists ? current : defaultLang.code;
          });
        }
      })
      .catch(() => {
        setLanguages([{ code: "he", label: "עברית" }]);
      });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
  }, [language]);

  const loadPlaces = useCallback(async () => {
    try {
      const payload = await fetchJson<{ places: AdminPlace[] }>(
        `/api/places?language=${language}`
      );
      setPlaces(payload.places ?? []);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "לא ניתן לטעון את רשימת המיקומים.",
      });
    }
  }, [language]);

  const loadDashboards = useCallback(async () => {
    try {
      const payload = await fetchJson<{ dashboards: AdminDashboard[] }>(
        "/api/dashboards"
      );
      setDashboards(payload.dashboards ?? []);
    } catch (error) {
      setDashboards([]);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "לא ניתן לטעון את הדאשבורדים.",
      });
    }
  }, []);

  useEffect(() => {
    if (!authorized) {
      setPlaces([]);
      setDashboards([]);
      return;
    }
    loadPlaces();
    loadDashboards();
  }, [authorized, language, loadPlaces, loadDashboards]);

  const handlePlaceInput =
    (field: keyof typeof emptyPlaceForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setPlaceForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleConnectionInput =
    (field: keyof typeof emptyConnectionForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (field === "bidirectional") {
        setConnectionForm((prev) => ({
          ...prev,
          bidirectional: (event.target as HTMLInputElement).checked,
        }));
        return;
      }

      setConnectionForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleDashboardInput =
    (field: keyof typeof emptyDashboardForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setDashboardForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleToggleDashboardPlace = (placeId: number) => {
    setDashboardForm((prev) => {
      const exists = prev.placeIds.includes(placeId);
      return {
        ...prev,
        placeIds: exists ? prev.placeIds.filter((id) => id !== placeId) : [...prev.placeIds, placeId],
      };
    });
  };

  const handleAuthorizeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await attemptAuthorize(pinInput);
  };

  const handleSignOut = () => {
    setAuthorized(false);
    setActivePin(null);
    setPinInput("");
    setPlaces([]);
    setDashboards([]);
    setDashboardForm({ ...emptyDashboardForm });
    setStatus(null);
    setAuthError(null);
    setLoadingPlace(false);
    setLoadingConnection(false);
    setCreatingDashboard(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("indoor-nav-admin-pin");
    }
  };

  const handleCreatePlace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authorized || !activePin) {
      setStatus({
        type: "error",
        message: "נדרש לאמת קוד PIN לפני יצירת נקודות חדשות.",
      });
      return;
    }
    setLoadingPlace(true);
    setStatus(null);
    try {
      const payload = await fetchJson<{ places: AdminPlace[]; place: AdminPlace }>(
        "/api/admin/places",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-pin": activePin,
          },
          body: JSON.stringify({
            ...placeForm,
            x: Number.parseFloat(placeForm.x),
            y: Number.parseFloat(placeForm.y),
            language,
          }),
        }
      );
      setPlaces(payload.places ?? []);
      setPlaceForm({ ...emptyPlaceForm });
      setStatus({
        type: "success",
        message: "המיקום החדש נשמר בהצלחה.",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Unauthorized") || error.message.includes("PIN"))
      ) {
        setAuthorized(false);
        setActivePin(null);
        setAuthError("קוד ה-PIN אינו תקף. הזינו אותו מחדש.");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("indoor-nav-admin-pin");
        }
      }
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "שמירת המיקום החדש נכשלה.",
      });
    } finally {
      setLoadingPlace(false);
    }
  };

  const handleCreateConnection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authorized || !activePin) {
      setStatus({
        type: "error",
        message: "נדרש לאמת קוד PIN לפני יצירת חיבורים.",
      });
      return;
    }
    setLoadingConnection(true);
    setStatus(null);
    try {
      await fetchJson("/api/admin/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": activePin,
        },
        body: JSON.stringify({
          ...connectionForm,
          fromId: Number.parseInt(connectionForm.fromId, 10),
          toId: Number.parseInt(connectionForm.toId, 10),
          distance: Number.parseFloat(connectionForm.distance),
          bidirectional: connectionForm.bidirectional,
          language,
        }),
      });
      await loadPlaces();
      setConnectionForm({ ...emptyConnectionForm });
      setStatus({
        type: "success",
        message: "החיבור נוסף בהצלחה למפה.",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Unauthorized") || error.message.includes("PIN"))
      ) {
        setAuthorized(false);
        setActivePin(null);
        setAuthError("קוד ה-PIN אינו תקף. הזינו אותו מחדש.");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("indoor-nav-admin-pin");
        }
      }
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "לא ניתן ליצור את החיבור.",
      });
    } finally {
      setLoadingConnection(false);
    }
  };

  const handleCreateDashboard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authorized || !activePin) {
      setStatus({
        type: "error",
        message: "נדרש לאמת קוד PIN לפני יצירת דשבורדים.",
      });
      return;
    }
    if (!dashboardForm.name.trim()) {
      setStatus({
        type: "error",
        message: "יש לספק שם לדשבורד.",
      });
      return;
    }
    if (dashboardForm.placeIds.length === 0) {
      setStatus({
        type: "error",
        message: "בחרו לפחות נקודת עניין אחת.",
      });
      return;
    }
    setCreatingDashboard(true);
    setStatus(null);

    try {
      await fetchJson("/api/admin/dashboards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": activePin,
        },
        body: JSON.stringify({
          name: dashboardForm.name,
          description: dashboardForm.description,
          placeIds: dashboardForm.placeIds,
        }),
      });
      setDashboardForm({ ...emptyDashboardForm });
      await loadDashboards();
      setStatus({
        type: "success",
        message: "הדשבורד נוצר בהצלחה.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "יצירת הדשבורד נכשלה.",
      });
    } finally {
      setCreatingDashboard(false);
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12 sm:px-6">
          <section className="space-y-6 rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">כניסה לממשק הניהול</h1>
              <p className="text-sm text-slate-300">
                הזינו את קוד ה-PIN שהוגדר בסביבת ההפעלה (`ADMIN_PIN`) כדי לנהל את המפה הפנימית.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleAuthorizeSubmit}>
              <label className="block text-sm font-medium text-slate-200">
                קוד PIN
                <input
                  value={pinInput}
                  onChange={(event) => setPinInput(event.target.value)}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                  placeholder="••••"
                  required
                />
              </label>
              {authError && (
                <p className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {authError}
                </p>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authLoading ? "מאמת…" : "כניסה"}
              </button>
            </form>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>לשינוי הקוד: הגדרת משתנה ADMIN_PIN</span>
              <Link
                href="/"
                className="rounded-full border border-slate-500/60 px-3 py-1 font-semibold text-slate-200 transition hover:border-slate-300 hover:text-white"
              >
                חזרה למפה
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-6 rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl shadow-slate-900/40 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                ממשק ניהול – ניווט פנימי
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
                צרו נקודות חדשות במפה, הגדירו חיבורים בין מוקדים ושמרו על מבנה
                מעודכן ומונגש למשתמשים.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/"
                className="rounded-full border border-sky-400/60 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              >
                חזרה למפת הניווט
              </Link>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
              >
                {languages.map((option) => (
                  <option key={option.code} value={option.code} className="text-slate-900">
                    {option.label} ({option.code})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-rose-400/60 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              >
                התנתקות
              </button>
            </div>
          </div>
          {status && (
            <p
              className={`rounded-xl border px-3 py-2 text-xs ${
                status.type === "success"
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-400/40 bg-rose-500/10 text-rose-100"
              }`}
            >
              {status.message}
            </p>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">הוספת נקודת עניין</h2>
              <span className="text-xs text-slate-300">
                המפה תתעדכן אוטומטית לאחר השמירה
              </span>
            </div>
            <form className="grid gap-3" onSubmit={handleCreatePlace}>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  מזהה ייחודי (slug)
                  <input
                    value={placeForm.slug}
                    onChange={handlePlaceInput("slug")}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  שם מוצג
                  <input
                    value={placeForm.name}
                    onChange={handlePlaceInput("name")}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  />
                </label>
              </div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                תיאור קצר
                <textarea
                  value={placeForm.description}
                  onChange={handlePlaceInput("description")}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  קומה
                  <input
                    value={placeForm.floor}
                    onChange={handlePlaceInput("floor")}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  אזור
                  <input
                    value={placeForm.zone}
                    onChange={handlePlaceInput("zone")}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  סוג
                  <input
                    value={placeForm.type}
                    onChange={handlePlaceInput("type")}
                    placeholder="general / amenity / service"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  קואורדינטת X
                  <input
                    value={placeForm.x}
                    onChange={handlePlaceInput("x")}
                    type="number"
                    step="0.1"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  קואורדינטת Y
                  <input
                    value={placeForm.y}
                    onChange={handlePlaceInput("y")}
                    type="number"
                    step="0.1"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={loadingPlace}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPlace ? "שומר..." : "שמירת נקודה"}
              </button>
            </form>
          </section>

          <section className="space-y-4 rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">סרטוט המפה</h2>
              <span className="text-xs text-slate-300">לחצו על המפה כדי למקם נקודה חדשה</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <svg
                ref={mapBuilderRef}
                viewBox="0 0 1000 600"
                className="h-72 w-full max-w-full cursor-crosshair"
                onClick={handleMapBuilderClick}
              >
                <defs>
                  <linearGradient id="builder-bg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(30, 64, 175, 0.35)" />
                    <stop offset="100%" stopColor="rgba(12, 74, 110, 0.6)" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="1000" height="600" fill="url(#builder-bg)" />
                {Array.from({ length: 11 }).map((_, index) => (
                  <line
                    // eslint-disable-next-line react/no-array-index-key
                    key={`grid-v-${index}`}
                    x1={index * 100}
                    y1={0}
                    x2={index * 100}
                    y2={600}
                    stroke="rgba(226,232,240,0.15)"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: 7 }).map((_, index) => (
                  <line
                    // eslint-disable-next-line react/no-array-index-key
                    key={`grid-h-${index}`}
                    x1={0}
                    y1={index * 100}
                    x2={1000}
                    y2={index * 100}
                    stroke="rgba(226,232,240,0.12)"
                    strokeWidth={1}
                  />
                ))}
                {builderPoints.map((point) => (
                  <g key={point.id} transform={`translate(${point.x} ${point.y})`}>
                    <circle r={6} fill="#38bdf8" stroke="rgba(226,232,240,0.6)" strokeWidth={1.5} />
                    <text
                      x={0}
                      y={-12}
                      textAnchor="middle"
                      fontSize="16"
                      fill="#f8fafc"
                      style={{ pointerEvents: "none" }}
                    >
                      {point.label}
                    </text>
                  </g>
                ))}
                {pendingPoint && (
                  <g transform={`translate(${pendingPoint.x} ${pendingPoint.y})`}>
                    <circle r={9} fill="#f97316" opacity={0.85} />
                    <circle
                      r={18}
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      opacity={0.7}
                    />
                  </g>
                )}
              </svg>
            </div>
            <p className="text-xs text-slate-300">
              {placeForm.x && placeForm.y
                ? `קואורדינטות נבחרות: X=${Number.parseFloat(placeForm.x).toFixed(1)} · Y=${Number.parseFloat(
                    placeForm.y
                  ).toFixed(1)}`
                : "בחרו נקודה על גבי המפה כדי להעתיק קואורדינטות לטופס."}
            </p>
          </section>

          <section className="space-y-4 rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">חיבור בין נקודות</h2>
              <span className="text-xs text-slate-300">
                יוצרים מעברים דו כיווניים בלחיצה אחת
              </span>
            </div>
            <form className="grid gap-3" onSubmit={handleCreateConnection}>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  נקודת מוצא
                  <select
                    value={connectionForm.fromId}
                    onChange={handleConnectionInput("fromId")}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                    required
                  >
                    <option value="" disabled>
                      בחרו נקודה
                    </option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name} · {place.floor}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  נקודת יעד
                  <select
                    value={connectionForm.toId}
                    onChange={handleConnectionInput("toId")}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                    required
                  >
                    <option value="" disabled>
                      בחרו יעד
                    </option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name} · {place.floor}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  מרחק (מ')
                  <input
                    value={connectionForm.distance}
                    onChange={handleConnectionInput("distance")}
                    type="number"
                    min="0"
                    step="0.1"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                    required
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  כיוון
                  <select
                    value={connectionForm.orientation}
                    onChange={handleConnectionInput("orientation")}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                    required
                  >
                    {ORIENTATIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-end gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  <input
                    type="checkbox"
                    checked={connectionForm.bidirectional}
                    onChange={handleConnectionInput("bidirectional")}
                    className="h-4 w-4 rounded border-white/40 bg-black/30 text-sky-500 focus:ring-emerald-500/40"
                  />
                  דו-כיווני
                </label>
              </div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                סימון בולט (אופציונלי)
                <input
                  value={connectionForm.landmark}
                  onChange={handleConnectionInput("landmark")}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                  placeholder="לדוגמה: גרם מדרגות, קיר אומנות"
                />
              </label>
              <button
                type="submit"
                disabled={loadingConnection}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingConnection ? "יוצר חיבור..." : "שמירת חיבור"}
              </button>
            </form>
          </section>
        </div>

        <section className="space-y-4 rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/40 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">דשבורדים לניהול מפות</h2>
              <p className="mt-1 text-sm text-slate-300">
                הגדירו תצוגות מותאמות אישית עם אוסף נקודות לכל צורך – צוותים קליניים, משפחות, מבקרים ועוד.
              </p>
            </div>
            <div className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs text-slate-300">
              נבחרו {dashboardForm.placeIds.length} נקודות
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleCreateDashboard}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                שם הדשבורד
                <input
                  value={dashboardForm.name}
                  onChange={handleDashboardInput("name")}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  required
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                תיאור (לא חובה)
                <input
                  value={dashboardForm.description}
                  onChange={handleDashboardInput("description")}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="לדוגמה: מסלול מהיר למחלקות קרדיאק"
                />
              </label>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                בחירת נקודות
              </span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {places.map((place) => (
                  <label
                    key={place.id}
                    className={`flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 transition hover:border-sky-400/60 hover:bg-sky-500/10 ${
                      dashboardForm.placeIds.includes(place.id) ? "border-sky-400 bg-sky-500/20" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={dashboardForm.placeIds.includes(place.id)}
                      onChange={() => handleToggleDashboardPlace(place.id)}
                      className="h-4 w-4 rounded border border-white/30 bg-black/30 text-sky-500 focus:ring-sky-500/40"
                    />
                    <div>
                      <p className="font-semibold">{place.name}</p>
                      <p className="text-xs text-slate-300">
                        {place.floor} · {place.zone}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingDashboard || dashboardForm.placeIds.length === 0}
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingDashboard ? "שומר..." : "שמירת דשבורד"}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {dashboards.length === 0 ? (
              <p className="text-sm text-slate-300">אין עדיין דשבורדים. התחילו ביצירת הראשון!</p>
            ) : (
              <ul className="space-y-3">
                {dashboards.map((dashboard) => (
                  <li
                    key={dashboard.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{dashboard.name}</h3>
                        <p className="mt-1 text-xs text-slate-300">
                          {dashboard.description || "ללא תיאור"}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">
                        {dashboard.placeIds.length} נקודות
                      </span>
                    </div>
                    <p className="mt-2 text-[0.7rem] text-slate-400">מזהה: {dashboard.slug}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/40 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-white">נקודות קיימות במבנה</h2>
            <p className="text-xs text-slate-300">
              מציגים {filteredPlaces.length} נקודות מתוך {places.length}. לחצו על מזהה כדי להעתיק.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex w-full items-center gap-3 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs text-slate-200 sm:max-w-md">
              <span className="font-semibold tracking-wide">חיפוש</span>
              <input
                value={placeTableQuery}
                onChange={(event) => setPlaceTableQuery(event.target.value)}
                placeholder="שם, מזהה, קומה, אזור..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              {placeTableQuery && (
                <button
                  type="button"
                  onClick={() => setPlaceTableQuery("")}
                  className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-300 transition hover:text-white"
                >
                  נקה
                </button>
              )}
            </label>
            {filteredPlaces.length > 100 && (
              <span className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400">
                הטבלה מחולקת לכל 100 רשומות
              </span>
            )}
          </div>
          <div className="mt-4 max-h-[70vh] overflow-x-auto overflow-y-auto rounded-2xl border border-white/10 bg-black/30">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-right">מזהה</th>
                  <th className="px-4 py-3 text-right">שם</th>
                  <th className="px-4 py-3 text-right">קומה</th>
                  <th className="px-4 py-3 text-right">אזור</th>
                  <th className="px-4 py-3 text-right">סוג</th>
                  <th className="px-4 py-3 text-right">קואורדינטות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredPlaces.length > 0 ? (
                  filteredPlaces.map((place, index) => (
                    <Fragment key={`${place.id}-${index}`}>
                      {filteredPlaces.length > 100 && index > 0 && index % 100 === 0 && (
                        <tr key={`split-${index}`} className="bg-white/5">
                          <td colSpan={6} className="px-4 py-2 text-center text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">
                            — {index} רשומות הוצגו — המשך —
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(String(place.id))}
                            className="rounded-full border border-white/20 px-3 py-1 text-xs transition hover:border-emerald-400 hover:text-emerald-200"
                          >
                            #{place.id}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{place.name}</span>
                            <span className="text-xs text-slate-400">{place.slug}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{place.floor}</td>
                        <td className="px-4 py-3">{place.zone}</td>
                        <td className="px-4 py-3">{place.type}</td>
                        <td className="px-4 py-3 text-xs">
                          X: {place.coordinates.x}, Y: {place.coordinates.y}
                        </td>
                      </tr>
                    </Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm text-slate-300"
                      colSpan={6}
                    >
                      {placeTableQuery
                        ? "לא נמצאו נקודות התואמות לחיפוש."
                        : "עדיין לא הוגדרו נקודות במפה בשפה זו."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

