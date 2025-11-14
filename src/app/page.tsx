/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getUiStrings } from "@/lib/translations";
import MapCanvas from "@/components/MapCanvas";

type LanguageOption = {
  code: string;
  label: string;
  isDefault: number;
};

type PlaceSummary = {
  id: number;
  slug: string;
  name: string;
  description: string;
  floor: string;
  zone: string;
  type: string;
  imageUrl: string | null;
  coordinates: { x: number; y: number };
  latitude?: number | null;
  longitude?: number | null;
};

type NearbyPlace = {
  id: number;
  name: string;
  distance: number;
  orientation: string;
  orientationLabel: string;
  landmark?: string | null;
  description: string;
  imageUrl: string | null;
};

type DashboardSummary = {
  id: number;
  slug: string;
  name: string;
  description: string;
  placeIds: number[];
};

type DirectionStep = {
  fromId: number;
  toId: number;
  toName: string;
  distance: number;
  orientation: string;
  landmark?: string | null;
  instruction: string;
};

type DirectionsResult = {
  language: string;
  from: PlaceSummary;
  to: PlaceSummary;
  steps: DirectionStep[];
  totalDistance: number;
};

type Theme = "dark" | "light";

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error ?? "Request failed");
  }
  return res.json();
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusKm = 6371;
  return earthRadiusKm * c;
}

export default function Home() {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [language, setLanguage] = useState("he");
  const [theme, setTheme] = useState<Theme>("dark");
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImages, setShowImages] = useState(false);
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [showRoute, setShowRoute] = useState(true);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [isReadingDirections, setIsReadingDirections] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [initialWizardOpen, setInitialWizardOpen] = useState(true);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [wizardStartId, setWizardStartId] = useState<number | null>(null);
  const [wizardDestinationId, setWizardDestinationId] = useState<number | null>(null);
  const [wizardSearch, setWizardSearch] = useState("");
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "pending" | "success" | "error" | "unsupported">("idle");
  const [recommendedStartId, setRecommendedStartId] = useState<number | null>(null);
  const previousDirectionsRef = useRef<DirectionsResult | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasAttemptedGeolocationRef = useRef(false);
  const quickMenuRef = useRef<HTMLDivElement | null>(null);
  const accessibilityMenuRef = useRef<HTMLDivElement | null>(null);
  const previousLanguageRef = useRef(language);
  const autoPlayTimerRef = useRef<number | null>(null);
  const ROUTE_STEP_INITIAL_DELAY_MS = 900;
  const ROUTE_STEP_INTERVAL_MS = 2600;
  const [currentPlaceId, setCurrentPlaceId] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [neighbors, setNeighbors] = useState<NearbyPlace[]>([]);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [languageFormOpen, setLanguageFormOpen] = useState(false);
  const [languageCode, setLanguageCode] = useState("");
  const [languageLabel, setLanguageLabel] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [accessibilityPanelOpen, setAccessibilityPanelOpen] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [routePlayerVisible, setRoutePlayerVisible] = useState(true);
  const [routeProgress, setRouteProgress] = useState(0);
  const [autoPlayDirections, setAutoPlayDirections] = useState(false);
  const [stepAnimationKey, setStepAnimationKey] = useState(0);
  const isRtlLanguage = language === "he";
  const documentDir = isRtlLanguage ? "rtl" : "ltr";

  const strings = useMemo(() => getUiStrings(language), [language]);
  const isLightTheme = theme === "light";

  const findNearestPlace = useCallback(
    (latitude: number, longitude: number): PlaceSummary | null => {
      let closest: { place: PlaceSummary; distance: number } | null = null;
      for (const place of places) {
        const placeLat = typeof place.latitude === "number" ? place.latitude : null;
        const placeLng = typeof place.longitude === "number" ? place.longitude : null;
        if (placeLat === null || placeLng === null) {
          continue;
        }
        const distance = haversineDistance(latitude, longitude, placeLat, placeLng);
        if (!closest || distance < closest.distance) {
          closest = { place, distance };
        }
      }

      if (!closest) {
        return null;
      }

      return closest.distance <= 0.25 ? closest.place : null;
    },
    [places]
  );

  useEffect(() => {
    fetchJson<{ languages: LanguageOption[] }>("/api/languages")
      .then((payload) => {
        setLanguages(payload.languages ?? []);
        if (payload.languages?.length) {
          const defaultLanguage =
            payload.languages.find((lang) => lang.isDefault) ?? payload.languages[0];
          setLanguage((current) => {
            const exists = payload.languages.some((lang) => lang.code === current);
            return exists ? current : defaultLanguage.code;
          });
        }
      })
      .catch(() => {
        setLanguages([{ code: "he", label: "עברית", isDefault: 1 }]);
      });
  }, []);

  useEffect(() => {
    fetchJson<{ dashboards: DashboardSummary[] }>("/api/dashboards")
      .then((payload) => {
        setDashboards(payload.dashboards ?? []);
      })
      .catch(() => {
        setDashboards([]);
      });
  }, []);

  useEffect(() => {
    if (!initialWizardOpen || hasAttemptedGeolocationRef.current || !places.length) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      setWizardError((prev) => prev ?? strings.wizardGpsUnsupported);
      hasAttemptedGeolocationRef.current = true;
      return;
    }

    hasAttemptedGeolocationRef.current = true;
    setGeoStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDetectedCoords({ lat: latitude, lng: longitude });
        setGeoStatus("success");
        const nearest = findNearestPlace(latitude, longitude);
        if (nearest) {
          setRecommendedStartId(nearest.id);
          setWizardStartId((prev) => prev ?? nearest.id);
          setWizardError(null);
        }
      },
      () => {
        setGeoStatus("error");
        setWizardError((prev) => prev ?? strings.wizardGpsDenied);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [findNearestPlace, initialWizardOpen, places, strings]);

  useEffect(() => {
    if (!initialWizardOpen) {
      return;
    }
    if (geoStatus === "error") {
      setWizardError(strings.wizardGpsDenied);
    } else if (geoStatus === "unsupported") {
      setWizardError(strings.wizardGpsUnsupported);
    }
  }, [geoStatus, initialWizardOpen, strings]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrUrl(window.location.href);
    }
  }, [language, selectedDashboardId]);

useEffect(() => {
  setStepAnimationKey((key) => key + 1);
}, [routeProgress]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("indoor-nav-accessibility");
    if (stored === "enabled") {
      setAccessibilityMode(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("indoor-nav-accessibility", accessibilityMode ? "enabled" : "disabled");
  }, [accessibilityMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!("speechSynthesis" in window)) {
      setTtsAvailable(false);
      return () => undefined;
    }

    const synthesis = window.speechSynthesis;

    const updateAvailability = () => {
      const voices = synthesis.getVoices();
      if (voices.length > 0) {
        setTtsAvailable(true);
        return;
      }
      setTtsAvailable(false);
    };

    updateAvailability();
    synthesis.addEventListener("voiceschanged", updateAvailability);

    return () => {
      synthesis.removeEventListener("voiceschanged", updateAvailability);
      synthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (initialWizardOpen) {
      setWizardSearch("");
    }
  }, [initialWizardOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (quickMenuOpen && quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
        setQuickMenuOpen(false);
      }
      if (
        accessibilityPanelOpen &&
        accessibilityMenuRef.current &&
        !accessibilityMenuRef.current.contains(event.target as Node)
      ) {
        setAccessibilityPanelOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setQuickMenuOpen(false);
        setAccessibilityPanelOpen(false);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [accessibilityPanelOpen, quickMenuOpen]);

  useEffect(() => {
    setWizardSearch("");
    setWizardError(null);
  }, [wizardStep, language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedTheme = window.localStorage.getItem("indoor-nav-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.theme = theme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("indoor-nav-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams({ language });
    if (selectedDashboardId !== null) {
      params.set("dashboardId", String(selectedDashboardId));
    }

    fetchJson<{ places: PlaceSummary[] }>(`/api/places?${params.toString()}`)
      .then((payload) => {
        const nextPlaces = payload.places ?? [];
        setPlaces(nextPlaces);

        if (nextPlaces.length === 0) {
          setCurrentPlaceId(null);
          setSelectedPlaceId(null);
          return;
        }

        setCurrentPlaceId((prev) => {
          if (prev && nextPlaces.some((place) => place.id === prev)) {
            return prev;
          }
          return nextPlaces[0]?.id ?? null;
        });

        setSelectedPlaceId((prev) => {
          if (prev && nextPlaces.some((place) => place.id === prev)) {
            return prev;
          }
          return null;
        });
      })
      .catch(() => {
        setPlaces([]);
        setCurrentPlaceId(null);
        setSelectedPlaceId(null);
      });
  }, [language, selectedDashboardId]);

  useEffect(() => {
    if (!currentPlaceId) {
      setNeighbors([]);
      return;
    }
    fetchJson<{ neighbors: NearbyPlace[] }>(
      `/api/places/${currentPlaceId}/neighbors?language=${language}`
    )
      .then((payload) => {
        setNeighbors(payload.neighbors ?? []);
      })
      .catch(() => {
        setNeighbors([]);
      });
  }, [currentPlaceId, language]);

  useEffect(() => {
    if (!currentPlaceId || !selectedPlaceId || currentPlaceId === selectedPlaceId) {
      setDirections(null);
      return;
    }

    setLoadingDirections(true);
    fetchJson<DirectionsResult>(
      `/api/directions?from=${currentPlaceId}&to=${selectedPlaceId}&language=${language}`
    )
      .then((payload) => {
        setDirections(payload);
      })
      .catch(() => {
        setDirections(null);
      })
      .finally(() => setLoadingDirections(false));
  }, [currentPlaceId, selectedPlaceId, language]);

useEffect(() => {
  if (!directions || directions.steps.length === 0) {
    setRouteProgress(0);
    setAutoPlayDirections(false);
    setRoutePlayerVisible(false);
    return;
  }
  setRouteProgress(0);
  setRoutePlayerVisible(true);
  setAutoPlayDirections(true);
}, [directions]);

useEffect(() => {
  if (!directions) {
    return;
  }
  const maxSegments = directions.steps.length;
  if (routeProgress > maxSegments) {
    setRouteProgress(maxSegments);
  }
}, [directions, routeProgress]);

useEffect(() => {
  if (autoPlayTimerRef.current) {
    window.clearTimeout(autoPlayTimerRef.current);
    autoPlayTimerRef.current = null;
  }
  if (!autoPlayDirections || !directions || directions.steps.length === 0) {
    return;
  }
  const delay = routeProgress <= 0 ? ROUTE_STEP_INITIAL_DELAY_MS : ROUTE_STEP_INTERVAL_MS;
  autoPlayTimerRef.current = window.setTimeout(() => {
    setRouteProgress((prev) => {
      if (!directions || directions.steps.length === 0) {
        setAutoPlayDirections(false);
        return 0;
      }
      const maxSegments = directions.steps.length;
      if (prev >= maxSegments) {
        setAutoPlayDirections(false);
        return maxSegments;
      }
      return prev + 1;
    });
  }, delay);
  return () => {
    if (autoPlayTimerRef.current) {
      window.clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  };
}, [autoPlayDirections, directions, routeProgress]);

  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        window.clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showRoute) {
      setAutoPlayDirections(false);
    setRoutePlayerVisible(false);
    }
  }, [showRoute]);


  const filteredPlaces = useMemo(() => {
    if (!searchTerm.trim()) {
      return places;
    }
    const term = searchTerm.trim().toLowerCase();
    return places.filter((place) => {
      const haystack = [
        place.name,
        place.description,
        place.zone,
        place.floor,
        place.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [places, searchTerm]);

  const searchResults = useMemo(() => filteredPlaces.slice(0, 12), [filteredPlaces]);

  const wizardFilteredPlaces = useMemo(() => {
    if (!places.length) {
      return [] as PlaceSummary[];
    }
    const term = wizardSearch.trim().toLowerCase();
    if (!term) {
      return places;
    }
    return places.filter((place) => {
      const haystack = [
        place.name,
        place.zone,
        place.floor,
        place.slug,
        place.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [places, wizardSearch]);

  const currentPlace = useMemo(
    () => places.find((place) => place.id === currentPlaceId) ?? null,
    [places, currentPlaceId]
  );

  const selectedPlace = useMemo(
    () => (selectedPlaceId ? places.find((place) => place.id === selectedPlaceId) ?? null : null),
    [places, selectedPlaceId]
  );

  const pathSegments = useMemo(() => {
    if (!showRoute || !directions || directions.steps.length === 0) {
      return [] as Array<{ from: PlaceSummary; to: PlaceSummary }>;
    }
    const placeMap = new Map<number, PlaceSummary>();
    for (const place of places) {
      placeMap.set(place.id, place);
    }
    placeMap.set(directions.from.id, directions.from);
    placeMap.set(directions.to.id, directions.to);

    const segments: Array<{ from: PlaceSummary; to: PlaceSummary }> = [];
    let currentId = directions.from.id;
    for (const step of directions.steps) {
      const fromPlace = placeMap.get(currentId);
      const toPlace = placeMap.get(step.toId);
      if (!fromPlace || !toPlace) {
        currentId = step.toId;
        continue;
      }
      segments.push({ from: fromPlace, to: toPlace });
      currentId = step.toId;
    }
    return segments;
  }, [directions, places, showRoute]);

  const togglePanel = () => {
    setPanelOpen((state) => {
      const next = !state;
      if (!next) {
        setQrOpen(false);
      }
      return next;
    });
  };

  const toggleSearchPanel = () => {
    setSearchPanelOpen((state) => !state);
  };

  const toggleQr = () => {
    setQrOpen((state) => {
      const next = !state;
      if (next && !panelOpen) {
        setPanelOpen(true);
      }
      if (next && typeof window !== "undefined") {
        setQrUrl(window.location.href);
      }
      return next;
    });
  };

  const ensureSearchVisibility = useCallback(() => {
    setPanelOpen((state) => (state ? state : true));
    setSearchPanelOpen(true);
  }, []);

  const handleQuickSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      if (value.trim().length > 0) {
        ensureSearchVisibility();
      }
    },
    [ensureSearchVisibility]
  );

  const handleQuickSearchFocus = useCallback(() => {
    ensureSearchVisibility();
  }, [ensureSearchVisibility]);

  const handleStepPrev = useCallback(() => {
    setAutoPlayDirections(false);
    setRouteProgress((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleStepNext = useCallback(() => {
    setAutoPlayDirections(false);
    setRouteProgress((prev) => {
      if (!directions || directions.steps.length === 0) {
        return prev;
      }
      return Math.min(prev + 1, directions.steps.length);
    });
  }, [directions]);

  const toggleAutoPlayDirections = useCallback(() => {
    if (!directions || directions.steps.length === 0) {
      setAutoPlayDirections(false);
      return;
    }
    setRouteProgress((prev) => {
      if (!autoPlayDirections && prev >= directions.steps.length) {
        return 0;
      }
      return prev;
    });
    setAutoPlayDirections((state) => !state);
  }, [autoPlayDirections, directions]);

  const handleCloseRoutePlayer = useCallback(() => {
    setRoutePlayerVisible(false);
    setAutoPlayDirections(false);
  }, []);

  const handleOpenRoutePlayer = useCallback(() => {
    if (!directions || directions.steps.length === 0) {
      return;
    }
    setRoutePlayerVisible(true);
  }, [directions]);

  const handleStopReading = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    activeUtteranceRef.current = null;
    setIsReadingDirections(false);
  }, []);

  const handleReadDirections = useCallback(() => {
    if (
      !directions ||
      !ttsAvailable ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    if (isReadingDirections) {
      handleStopReading();
    }
    const segments = directions.steps.map(
      (step, index) => `${index + 1}. ${step.instruction}`
    );
    if (segments.length === 0) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(segments.join(". "));
    const desiredLang = language === "he" ? "he-IL" : language;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((voice) => voice.lang.toLowerCase().startsWith(desiredLang.toLowerCase())) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith(desiredLang.slice(0, 2).toLowerCase()));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.lang = desiredLang;
    utterance.onend = () => {
      activeUtteranceRef.current = null;
      setIsReadingDirections(false);
    };
    utterance.onerror = () => {
      activeUtteranceRef.current = null;
      setIsReadingDirections(false);
    };
    activeUtteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsReadingDirections(true);
  }, [directions, handleStopReading, isReadingDirections, language, ttsAvailable]);

  useEffect(() => {
    if (directions && previousDirectionsRef.current !== directions) {
      setShowRoute(true);
      if (isReadingDirections) {
        handleStopReading();
      }
    }
    previousDirectionsRef.current = directions ?? null;
  }, [directions, handleStopReading, isReadingDirections]);

  useEffect(() => {
    if (!isReadingDirections) {
      previousLanguageRef.current = language;
      return;
    }
    if (previousLanguageRef.current !== language) {
      handleStopReading();
    }
    previousLanguageRef.current = language;
  }, [language, handleStopReading, isReadingDirections]);

  const closeWizard = useCallback(() => {
    setInitialWizardOpen(false);
    setWizardStep(1);
    setWizardSearch("");
    setWizardError(null);
    setWizardDestinationId(null);
  }, []);

  const startNavigationFromWizard = useCallback(
    (allowWithoutDestination = false) => {
      if (!wizardStartId) {
        setWizardError(strings.wizardStartValidation);
        return;
      }
      if (
        !allowWithoutDestination &&
        (!wizardDestinationId || wizardDestinationId === wizardStartId)
      ) {
        setWizardError(strings.wizardDestinationValidation);
        return;
      }

      setCurrentPlaceId(wizardStartId);
      if (wizardDestinationId && wizardDestinationId !== wizardStartId) {
        setSelectedPlaceId(wizardDestinationId);
      } else {
        setSelectedPlaceId(null);
      }
      setShowRoute(true);
      closeWizard();
    },
    [
      closeWizard,
      setCurrentPlaceId,
      setSelectedPlaceId,
      setShowRoute,
      wizardDestinationId,
      wizardStartId,
      strings.wizardDestinationValidation,
      strings.wizardStartValidation,
    ]
  );

  const handleSelectCurrent = (placeId: number) => {
    setCurrentPlaceId(placeId);
    if (placeId === selectedPlaceId) {
      setSelectedPlaceId(null);
    }
  };

  const handleAddLanguage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!languageCode.trim() || !languageLabel.trim()) {
      setStatusMessage("Please provide both a language code and label.");
      return;
    }

    try {
      const payload = await fetchJson<{ languages: LanguageOption[] }>("/api/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: languageCode.trim(), label: languageLabel.trim() }),
      });
      setLanguages(payload.languages ?? []);
      setLanguageCode("");
      setLanguageLabel("");
      setLanguageFormOpen(false);
      setStatusMessage(strings.addLanguageSuccess);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to add language.");
    }
  };

  const backgroundClass = isLightTheme
    ? "bg-[#f6f7fb] text-slate-900"
    : "bg-[#05050b] text-slate-100";
  const overlayGradient = isLightTheme
    ? "from-white/0 via-white/60 to-white/80"
    : "from-[#05050b]/0 via-[#05050b]/60 to-[#05050b]/85";
  const panelBaseClass = isLightTheme
    ? "relative rounded-[32px] border border-[#dbe3f1] bg-white/92 text-slate-900 shadow-[0_40px_100px_-55px_rgba(15,23,42,0.45)] backdrop-blur-2xl ring-1 ring-[#ffffff]/60"
    : "relative rounded-[32px] border border-[#1a2437] bg-[#0d1626]/80 text-slate-100 shadow-[0_50px_120px_-65px_rgba(14,165,233,0.5)] backdrop-blur-2xl ring-1 ring-[#0ea5e9]/10";
  const dropdownCardClass = isLightTheme
    ? "overflow-hidden rounded-[26px] border border-[#d7deed] bg-white/96 text-slate-900 shadow-[0_26px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
    : "overflow-hidden rounded-[26px] border border-[#1a2640] bg-[#101b30]/94 text-slate-100 shadow-[0_30px_80px_-45px_rgba(6,182,212,0.45)] backdrop-blur-2xl";
  const mutedSurfaceClass = isLightTheme
    ? "rounded-[24px] border border-[#d5deef] bg-white/78 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)]"
    : "rounded-[24px] border border-[#1d2635] bg-[#0f1725]/65 shadow-[0_24px_55px_-32px_rgba(59,130,246,0.45)]";
  const badgeCurrentClass = isLightTheme
    ? "border-transparent bg-gradient-to-br from-[#ecfdf5] to-[#ccfbf1] text-[#047857]"
    : "border-transparent bg-gradient-to-br from-[#064e3b] to-[#0f766e] text-[#bbf7d0]";
  const badgeSelectedClass = isLightTheme
    ? "border-transparent bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] text-[#1d4ed8]"
    : "border-transparent bg-gradient-to-br from-[#1e3a8a] to-[#0369a1] text-[#bfdbfe]";
  const badgeNearbyClass = isLightTheme
    ? "border-transparent bg-gradient-to-br from-[#fef3c7] to-[#fde68a] text-[#92400e]"
    : "border-transparent bg-gradient-to-br from-[#854d0e] to-[#92400e] text-[#fef3c7]";
  const subtleTextClass = isLightTheme ? "text-[#4b5563]" : "text-[#94a3b8]";
  const mutedTextClass = isLightTheme ? "text-[#6b7280]" : "text-[#64748b]";
  const sectionHeadingClass = isLightTheme ? "text-[#0f172a]" : "text-white";
  const legendLabelClass = isLightTheme ? "text-[#0f172a]" : "text-[#e2e8f0]";
  const themeToggleClass = isLightTheme
    ? "rounded-full border border-transparent bg-gradient-to-r from-[#bfdbfe] via-white to-[#c4b5fd] px-4 py-2 text-sm font-semibold text-[#1f2937] shadow-[0_10px_25px_-15px_rgba(59,130,246,0.65)] transition hover:shadow-[0_14px_30px_-18px_rgba(99,102,241,0.55)]"
    : "rounded-full border border-transparent bg-gradient-to-r from-[#1e293b] via-[#0f172a] to-[#1e293b] px-4 py-2 text-sm font-semibold text-[#bfdbfe] shadow-[0_10px_25px_-15px_rgba(14,165,233,0.55)] transition hover:shadow-[0_14px_30px_-18px_rgba(56,189,248,0.5)]";
  const legendDotClasses = {
    current: isLightTheme ? "border-emerald-500 bg-emerald-300" : "border-emerald-300 bg-emerald-500",
    selected: isLightTheme ? "border-sky-500 bg-sky-200" : "border-sky-300 bg-sky-500",
    nearby: isLightTheme ? "border-amber-500 bg-amber-200" : "border-amber-300 bg-amber-500/70",
  };
  const panelShellClass = isLightTheme
    ? "border-slate-200/70 bg-white/85 text-slate-900"
    : "border-white/15 bg-black/70 text-slate-100";
  const panelSurfaceClass = isLightTheme
    ? "border-slate-200/60 bg-white/70"
    : "border-white/10 bg-white/5";
  const panelMutedTextClass = isLightTheme ? "text-slate-600" : "text-slate-300";
  const placeCardActiveClass = isLightTheme
    ? "border-sky-500 bg-sky-100 text-slate-900"
    : "border-sky-400 bg-sky-500/20 text-white";
  const placeCardInactiveClass = isLightTheme
    ? "border-slate-200/70 bg-white/70 text-slate-800 hover:border-sky-400/60 hover:bg-sky-100/60"
    : "border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/60 hover:bg-sky-500/10";
  const actionChipClass = isLightTheme
    ? "border-slate-300/70 text-slate-700 hover:border-sky-400 hover:text-sky-600"
    : "border-white/30 text-slate-200 hover:border-sky-400 hover:text-white";
  const controlButtonClass = isLightTheme
    ? "rounded-full border border-slate-300/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-sky-400 hover:text-sky-600"
    : "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-400 hover:text-white";
  const topPrimaryButtonClass = isLightTheme
    ? "relative overflow-hidden rounded-full border border-transparent bg-gradient-to-r from-[#4338ca] via-[#2563eb] to-[#0ea5e9] px-6 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white shadow-[0_20px_40px_-18px_rgba(59,130,246,0.65)] transition hover:shadow-[0_24px_48px_-22px_rgba(59,130,246,0.7)] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50"
    : "relative overflow-hidden rounded-full border border-transparent bg-gradient-to-r from-[#22d3ee] via-[#3b82f6] to-[#6366f1] px-6 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white shadow-[0_22px_48px_-22px_rgba(56,189,248,0.65)] transition hover:shadow-[0_26px_55px_-24px_rgba(56,189,248,0.7)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/60";
  const topSecondaryButtonClass = isLightTheme
    ? "rounded-full border border-transparent bg-white/85 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2937] shadow-[0_14px_32px_-24px_rgba(15,23,42,0.3)] transition hover:bg-white hover:shadow-[0_18px_36px_-26px_rgba(15,23,42,0.35)] focus:outline-none focus:ring-2 focus:ring-[#94a3b8]/40"
    : "rounded-full border border-transparent bg-[#101a2b]/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#cbd5f5] shadow-[0_14px_32px_-24px_rgba(6,182,212,0.35)] transition hover:bg-[#111f36]/85 hover:shadow-[0_18px_36px_-26px_rgba(6,182,212,0.4)] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50";
  const quickMenuItemClass = isLightTheme
    ? "flex w-full items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-600"
    : "flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-400 hover:text-white";
  const quickMenuSimpleButtonClass = isLightTheme
    ? "w-full rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-600"
    : "w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-left text-sm font-medium text-slate-100 transition hover:border-sky-400 hover:text-white";
  const quickMenuSelectClass = isLightTheme
    ? "w-full rounded-2xl border border-slate-300/70 bg-white/90 px-3 py-2 text-sm font-medium text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
    : "w-full rounded-2xl border border-white/15 bg-black/50 px-3 py-2 text-sm font-medium text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50";
  const topBarContentClass = isRtlLanguage
    ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-row-reverse"
    : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";
  const topBarInfoAlignClass = isRtlLanguage ? "text-right" : "text-left";
  const topBarControlGroupClass = isRtlLanguage
    ? "flex flex-wrap items-center justify-start gap-2 sm:flex-row-reverse sm:justify-end"
    : "flex flex-wrap items-center justify-end gap-2";
  const quickMenuDropdownPositionClass = isRtlLanguage ? "left-0 origin-top-left" : "right-0 origin-top-right";
  const layoutGridClass = panelOpen
    ? "grid flex-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(310px,380px)_minmax(0,1fr)] xl:gap-10"
    : "grid flex-1 gap-6 sm:gap-8 lg:grid-cols-1";
  const legendCardClass = isLightTheme
    ? "border-slate-300/70 bg-white/80 text-slate-700"
    : "border-white/15 bg-black/70 text-slate-200";
  const panelPaddingClass = "p-4 sm:p-5 lg:p-6";
  const shareUrl = qrUrl;
  const qrImageUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(shareUrl)}`
    : null;
  const accessibilityTypographyClass = accessibilityMode ? "text-[1.05rem] sm:text-base md:text-lg leading-relaxed" : "";
  const wizardHeadingClass = isRtlLanguage ? "text-center sm:text-right" : "text-center sm:text-left";
  const wizardOptionLayoutClass = isRtlLanguage
    ? "flex flex-col gap-3 rounded-3xl border px-5 py-4 text-right transition sm:flex-row-reverse sm:items-center sm:justify-between"
    : "flex flex-col gap-3 rounded-3xl border px-5 py-4 text-left transition sm:flex-row sm:items-center sm:justify-between";
  const wizardFooterRowClass = isRtlLanguage
    ? "mt-8 flex flex-wrap items-center justify-between gap-4 sm:flex-row-reverse"
    : "mt-8 flex flex-wrap items-center justify-between gap-4";
  const wizardActionRowClass = isRtlLanguage
    ? "flex flex-wrap items-center gap-3 sm:flex-row-reverse"
    : "flex flex-wrap items-center gap-3";
  const hasExpandedContent =
    panelOpen || searchPanelOpen || qrOpen || languageFormOpen || Boolean(statusMessage);
  const totalDirectionSteps = directions?.steps.length ?? 0;
  const orientationLabelMap = strings.orientationLabels as Record<string, string>;
  const clampedRouteProgress = Math.max(0, Math.min(routeProgress, totalDirectionSteps));
  const currentStepIndex =
    totalDirectionSteps > 0 ? Math.min(Math.floor(clampedRouteProgress), totalDirectionSteps - 1) : 0;
  const currentDirectionStep =
    directions && totalDirectionSteps > 0 ? directions.steps[currentStepIndex] : null;
  const currentStepOrientationLabel =
    currentDirectionStep?.orientation
      ? orientationLabelMap[currentDirectionStep.orientation] ?? currentDirectionStep.orientation
      : null;
  const highlightPlaceId = currentDirectionStep ? currentDirectionStep.toId : selectedPlaceId ?? null;
  const destinationPlaceId = directions?.to?.id ?? selectedPlaceId ?? null;
  const activePlaceId = currentDirectionStep?.toId ?? selectedPlaceId ?? null;
  const activeSegmentProgress = Math.min(clampedRouteProgress, pathSegments.length);
  const displayedStepNumber =
    totalDirectionSteps > 0 ? Math.min(currentStepIndex + 1, totalDirectionSteps) : 0;
  const routeProgressRatio =
    totalDirectionSteps > 0 ? Math.min(clampedRouteProgress, totalDirectionSteps) / totalDirectionSteps : 0;
  const stepperPositionClass = isRtlLanguage ? "sm:right-6 right-4" : "sm:right-6 right-4";
  const stepperContainerClass = isRtlLanguage ? "sm:items-end text-right" : "sm:items-start text-left";
  const routeStepButtonClass = isLightTheme
    ? "rounded-full border border-slate-300/70 bg-white/85 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-sky-400 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
    : "rounded-full border border-white/15 bg-black/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50";

  return (
    <div className={`relative min-h-screen ${backgroundClass} ${accessibilityTypographyClass}`} dir={documentDir}>
      <div className="absolute inset-0">
        <PlaceMap
          places={places}
          currentPlaceId={currentPlaceId}
          highlightedPlaceId={highlightPlaceId}
          navigatorPlaceId={currentPlaceId}
          destinationPlaceId={destinationPlaceId}
          activePlaceId={activePlaceId}
          neighbors={neighbors}
          pathSegments={pathSegments}
          routeProgressRatio={routeProgressRatio}
          showRoute={showRoute}
          labels={{
            current: strings.legendCurrent,
            selected: strings.legendSelected,
            nearby: strings.legendNearby,
            noMap: strings.noMapData,
          }}
          className={`h-full w-full rounded-none border-0 opacity-90 shadow-none ${
            isLightTheme
              ? "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-50"
              : "bg-gradient-to-br from-slate-900 via-slate-950 to-black/80"
          }`}
          theme={theme}
          showLegend={false}
        />
      </div>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${overlayGradient}`} />
      <div className="pointer-events-none fixed inset-x-0 top-4 z-30 flex justify-center px-4 sm:px-6">
        <div
          className={`${panelBaseClass} pointer-events-auto flex w-full max-w-[min(1100px,100%)] flex-col gap-4 px-5 py-4 shadow-xl sm:px-6`}
        >
          <div className={topBarContentClass}>
            <div className={`flex flex-col gap-1 ${topBarInfoAlignClass}`}>
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-sky-300 sm:text-xs">
                {strings.mapViewHeading}
              </span>
              <h1 className="text-xl font-semibold sm:text-2xl">{strings.appTitle}</h1>
              <p className={`text-xs sm:text-sm ${subtleTextClass}`}>{strings.subtitle}</p>
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center sm:gap-4">
              <div className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 shadow-sm backdrop-blur">
                <input
                  value={searchTerm}
                  onChange={(event) => handleQuickSearchChange(event.target.value)}
                  onFocus={handleQuickSearchFocus}
                  placeholder={strings.searchPlaceholder}
                  aria-label={strings.searchPlaceholder}
                  className={`w-full bg-transparent text-sm outline-none sm:text-base ${
                    isLightTheme ? "text-slate-800 placeholder:text-slate-500" : "text-white placeholder:text-slate-300"
                  }`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className={`text-[0.7rem] font-semibold uppercase tracking-wide transition ${
                      isLightTheme ? "text-slate-500 hover:text-sky-600" : "text-slate-200 hover:text-white"
                    }`}
                  >
                    {strings.clearSearch}
                  </button>
                )}
              </div>
              <div className={topBarControlGroupClass}>
                <button
                  type="button"
                  onClick={isReadingDirections ? handleStopReading : handleReadDirections}
                  className={`${topPrimaryButtonClass} ${
                    !ttsAvailable || !directions || directions.steps.length === 0 ? "cursor-not-allowed opacity-60" : ""
                  }`}
                  disabled={!ttsAvailable || !directions || directions.steps.length === 0}
                >
                  {ttsAvailable ? (isReadingDirections ? strings.stopReadingLabel : strings.readDirectionsLabel) : strings.ttsUnavailableLabel}
                </button>
                <div ref={quickMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setQuickMenuOpen((state) => !state)}
                    className={topSecondaryButtonClass}
                    aria-label={quickMenuOpen ? strings.quickActionsCloseLabel : strings.quickActionsOpenLabel}
                  >
                    <span className="text-lg leading-none">⋮</span>
                  </button>
                  {quickMenuOpen && (
                    <div className={`${dropdownCardClass} absolute mt-2 w-72 space-y-3 p-4 ${quickMenuDropdownPositionClass}`}>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            togglePanel();
                            setQuickMenuOpen(false);
                          }}
                          className={quickMenuItemClass}
                        >
                          <span>{panelOpen ? strings.closePanelLabel : strings.openPanelLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleSearchPanel();
                            setQuickMenuOpen(false);
                          }}
                          className={quickMenuItemClass}
                        >
                          <span>{searchPanelOpen ? strings.hideSearchLabel : strings.showSearchLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowImages((state) => !state);
                            setQuickMenuOpen(false);
                          }}
                          className={quickMenuItemClass}
                        >
                          <span>{showImages ? strings.hideImagesLabel : strings.showImagesLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRoute((state) => !state);
                            setQuickMenuOpen(false);
                          }}
                          className={quickMenuItemClass}
                        >
                          <span>{showRoute ? strings.hideRouteLabel : strings.showRouteLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!directions || directions.steps.length === 0) {
                              return;
                            }
                            if (routePlayerVisible) {
                              handleCloseRoutePlayer();
                            } else {
                              handleOpenRoutePlayer();
                            }
                            setQuickMenuOpen(false);
                          }}
                          className={`${quickMenuItemClass} ${
                            !directions || directions.steps.length === 0 ? "cursor-not-allowed opacity-50" : ""
                          }`}
                          disabled={!directions || directions.steps.length === 0}
                        >
                          <span>
                            {routePlayerVisible ? strings.routePlayerHideLabel : strings.routePlayerShowLabel}
                          </span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAccessibilityMode((prev) => !prev);
                            setQuickMenuOpen(false);
                          }}
                          className={quickMenuItemClass}
                        >
                          <div className="flex flex-col items-start">
                            <span>{accessibilityMode ? strings.accessibilityModeOffLabel : strings.accessibilityModeOnLabel}</span>
                            <p className={`text-xs ${mutedTextClass}`}>{strings.accessibilityDescription}</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQrOpen(true);
                            setQuickMenuOpen(false);
                          }}
                          className={quickMenuItemClass}
                        >
                          <span>{strings.shareTitle}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {directions && totalDirectionSteps > 0 && !initialWizardOpen && routePlayerVisible && (
        <aside
          className={`${panelBaseClass} pointer-events-auto fixed inset-x-4 bottom-4 z-30 flex w-[min(420px,100%)] flex-col gap-3 px-5 py-4 shadow-2xl shadow-slate-900/40 transition-transform duration-500 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-28 sm:w-[340px] sm:max-h-[75vh] sm:overflow-y-auto sm:px-6 sm:py-5 sm:translate-y-0 ${stepperPositionClass}`}
        >
          <div
            className={`flex items-start justify-between gap-3 ${isRtlLanguage ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex flex-col gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-sky-300 sm:text-xs ${
                isRtlLanguage ? "items-end text-right" : ""
              }`}
            >
              <span>{strings.routePlayerTitle}</span>
              <span className="tracking-normal text-slate-200">
                {strings.routePlayerStepCounter
                  .replace("{current}", displayedStepNumber.toString())
                  .replace("{total}", totalDirectionSteps.toString())}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCloseRoutePlayer}
              aria-label={strings.routePlayerCloseLabel}
              className={`${routeStepButtonClass} h-8 w-8 !rounded-full !px-0 !py-0 text-base leading-none`}
            >
              ×
            </button>
          </div>
          {totalDirectionSteps > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-500"
                style={{ width: `${routeProgressRatio * 100}%` }}
              />
            </div>
          )}
          {currentDirectionStep && (
            <div
              key={stepAnimationKey}
              className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 shadow-inner transition-all duration-500 ${
                isLightTheme
                  ? "border-slate-200/70 bg-white/80 text-slate-800"
                  : "border-white/10 bg-black/40 text-slate-100"
              } ${stepperContainerClass}`}
            >
              <p className="text-sm font-semibold sm:text-base">{currentDirectionStep.instruction}</p>
              <p className={`text-xs sm:text-sm ${mutedTextClass}`}>
                {currentDirectionStep.distance} {strings.distanceUnit}
                {currentStepOrientationLabel ? ` · ${currentStepOrientationLabel}` : ""}
                {currentDirectionStep.landmark ? ` · ${currentDirectionStep.landmark}` : ""}
              </p>
            </div>
          )}
          <div
            className={`flex items-center justify-between gap-2 ${isRtlLanguage ? "flex-row-reverse" : ""}`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStepPrev}
                disabled={clampedRouteProgress <= 0}
                className={`${routeStepButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {strings.routePlayerPrevious}
              </button>
              <button
                type="button"
                onClick={toggleAutoPlayDirections}
                className={`${routeStepButtonClass} ${autoPlayDirections ? "bg-sky-500/20 text-sky-100" : ""}`}
              >
                {autoPlayDirections ? strings.routePlayerPause : strings.routePlayerPlay}
              </button>
              <button
                type="button"
                onClick={handleStepNext}
                disabled={directions ? clampedRouteProgress >= directions.steps.length : true}
                className={`${routeStepButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {strings.routePlayerNext}
              </button>
            </div>
            <span className="hidden text-[0.65rem] font-semibold uppercase tracking-wide text-slate-300 sm:block">
              {autoPlayDirections ? strings.routePlayerAutoLabel : "\u00a0"}
            </span>
          </div>
        </aside>
      )}

      {initialWizardOpen && places.length > 0 && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 px-4 py-8 backdrop-blur-lg sm:flex sm:items-center sm:justify-center">
          <div className="mx-auto w-full max-w-3xl rounded-[32px] border border-white/10 bg-slate-900/90 p-5 text-white shadow-2xl sm:p-10">
            <div className={`flex flex-col gap-4 ${wizardHeadingClass}`}>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-sky-300 sm:text-xs">
                {strings.wizardStepIndicator
                  .replace("{current}", wizardStep.toString())
                  .replace("{total}", "2")}
              </span>
              <h2 className="text-3xl font-bold leading-tight sm:text-5xl">{strings.wizardTitle}</h2>
              <p className="text-base text-slate-200 sm:text-xl">{strings.wizardSubtitle}</p>
            </div>

            {wizardStep === 1 && (
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-4 text-sm text-slate-100 sm:p-5 sm:text-base">
                {geoStatus === "pending" && <p>{strings.wizardGpsDetecting}</p>}
                {geoStatus === "success" && detectedCoords && (
                  <p>
                    {strings.wizardGpsDetected.replace(
                      "{coordinates}",
                      `${detectedCoords.lat.toFixed(5)}, ${detectedCoords.lng.toFixed(5)}`
                    )}
                  </p>
                )}
                {geoStatus === "error" && <p>{strings.wizardGpsDenied}</p>}
                {geoStatus === "unsupported" && <p>{strings.wizardGpsUnsupported}</p>}
              </div>
            )}

            <div className="mt-8 flex items-center gap-3">
              <input
                value={wizardSearch}
                onChange={(event) => setWizardSearch(event.target.value)}
                placeholder={strings.wizardSearchPlaceholder}
                className="w-full rounded-full border border-white/15 bg-white/10 px-6 py-3 text-base text-white placeholder:text-slate-300 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 sm:text-lg"
              />
            </div>

            <div className="mt-6 grid max-h-[360px] gap-3 overflow-y-auto pr-1 sm:max-h-[420px]">
              {wizardFilteredPlaces.map((place) => {
                const isSelected =
                  wizardStep === 1 ? wizardStartId === place.id : wizardDestinationId === place.id;
                const isDisabled = wizardStep === 2 && wizardStartId === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1) {
                        setWizardStartId(place.id);
                        setWizardError(null);
                        return;
                      }
                      if (isDisabled) {
                        return;
                      }
                      setWizardDestinationId((prev) => (prev === place.id ? null : place.id));
                      setWizardError(null);
                    }}
                    className={`${wizardOptionLayoutClass} ${
                      isSelected
                        ? "border-sky-400 bg-sky-500/25 shadow-lg"
                        : "border-white/10 bg-white/5 hover:border-sky-400/60 hover:bg-sky-500/15"
                    } ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    disabled={isDisabled}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-semibold sm:text-2xl">{place.name}</span>
                      <span className="text-xs text-slate-200 sm:text-base">
                        {place.floor} · {place.zone}
                      </span>
                    </div>
                    {wizardStep === 1 && recommendedStartId === place.id && geoStatus === "success" && (
                      <span className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                        {strings.wizardSuggestedLabel}
                      </span>
                    )}
                    {wizardStep === 2 && isSelected && (
                      <span className="rounded-full border border-sky-400/60 bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100">
                        {strings.wizardSelectedLabel}
                      </span>
                    )}
                  </button>
                );
              })}

              {wizardFilteredPlaces.length === 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-center text-sm text-slate-200 sm:text-base">
                  {strings.noSearchResults}
                </div>
              )}
            </div>

            {wizardError && (
              <p className="mt-4 text-sm font-semibold text-rose-300 sm:text-base">{wizardError}</p>
            )}

            <div className={wizardFooterRowClass}>
              <button
                type="button"
                onClick={closeWizard}
                className="text-sm font-semibold uppercase tracking-wide text-slate-300 transition hover:text-white sm:text-base"
              >
                {strings.wizardSkipLabel}
              </button>
              {wizardStep === 1 ? (
                <div className={wizardActionRowClass}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!wizardStartId) {
                        setWizardError(strings.wizardStartValidation);
                        return;
                      }
                      setWizardDestinationId(null);
                      setWizardStep(2);
                      setWizardError(null);
                    }}
                    className="rounded-full bg-sky-500 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    {strings.wizardNextLabel}
                  </button>
                </div>
              ) : (
                <div className={wizardActionRowClass}>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardStep(1);
                      setWizardError(null);
                      setWizardDestinationId(null);
                    }}
                    className="rounded-full border border-white/20 px-6 py-3 text-lg font-semibold text-white transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  >
                    {strings.wizardBackLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => startNavigationFromWizard(false)}
                    className="rounded-full bg-emerald-500 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    {strings.wizardStartNavigationLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => startNavigationFromWizard(true)}
                    className="rounded-full border border-white/20 px-6 py-3 text-lg font-semibold text-white transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  >
                    {strings.wizardSkipDestinationLabel}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasExpandedContent && (
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[min(1800px,95vw)] flex-col gap-6 px-4 pb-20 pt-24 text-sm sm:gap-8 sm:px-6 sm:text-base lg:gap-10 lg:px-10 lg:text-lg">
        <header className={`${panelBaseClass} space-y-6 ${panelPaddingClass}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-400">
                {strings.mapViewHeading}
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{strings.appTitle}</h1>
              <p className={`mt-2 max-w-2xl text-sm leading-relaxed sm:text-base ${subtleTextClass}`}>
                  {strings.subtitle}
                </p>
              </div>
            <div
              className={`${mutedSurfaceClass} flex flex-col gap-2 px-4 py-3 text-sm ${
                isRtlLanguage ? "text-right" : "text-left"
              }`}
            >
              <span className={`text-xs font-medium uppercase tracking-wide ${mutedTextClass}`}>
                {strings.mobileNavHint}
              </span>
              <p className={`${subtleTextClass}`}>
                {strings.quickTipsLabel}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className={`flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide ${legendLabelClass}`}>
              {strings.languageNameLabel}
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className={`rounded-2xl border px-4 py-2 text-sm font-medium outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40 ${
                  isLightTheme
                    ? "border-slate-300/70 bg-white/90 text-slate-900"
                    : "border-white/15 bg-white/10 text-slate-100"
                }`}
              >
                {languages.map((option) => (
                  <option key={option.code} value={option.code} className="text-slate-900">
                    {option.label} ({option.code})
                  </option>
                ))}
              </select>
            </label>
            {dashboards.length > 0 && (
              <label className={`flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide ${legendLabelClass}`}>
                {strings.dashboardFilterLabel}
                <select
                  value={selectedDashboardId ?? "all"}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedDashboardId(value === "all" ? null : Number.parseInt(value, 10));
                  }}
                  aria-label={strings.dashboardFilterLabel}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 ${
                    isLightTheme
                      ? "border-slate-300/70 bg-white/90 text-slate-900"
                      : "border-white/15 bg-white/10 text-slate-100"
                  }`}
                >
                  <option value="all">{strings.dashboardAllLabel}</option>
                  {dashboards.map((dashboard) => (
                    <option key={dashboard.id} value={dashboard.id}>
                      {dashboard.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
              <button
                type="button"
                onClick={() => setLanguageFormOpen((state) => !state)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500/60 ${
                isLightTheme
                  ? "border border-sky-400/50 bg-sky-100 text-sky-700 hover:border-sky-400 hover:bg-sky-200"
                  : "border border-sky-500/60 bg-sky-500/20 text-sky-100 hover:border-sky-400 hover:bg-sky-500/30 hover:text-white"
              }`}
              >
                {strings.addLanguageLabel}
              </button>
            <Link
              href="/admin"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500/60 ${
                isLightTheme
                  ? "border border-emerald-500/60 bg-emerald-100 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-200"
                  : "border border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:border-emerald-300 hover:bg-emerald-500/30 hover:text-white"
              }`}
            >
              {strings.adminPanelLabel}
            </Link>
            </div>
            {languageFormOpen && (
              <form
                onSubmit={handleAddLanguage}
            className={`${mutedSurfaceClass} grid gap-3 p-4 shadow-inner`}
              >
            <label className={`text-xs font-semibold uppercase tracking-wide ${legendLabelClass}`}>
                  {strings.languageCodeLabel}
                  <input
                    value={languageCode}
                    onChange={(event) => setLanguageCode(event.target.value)}
                  placeholder="e.g. he, en, pt-BR"
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40 ${
                  isLightTheme
                    ? "border-slate-300/70 bg-white/85 text-slate-900"
                    : "border-white/10 bg-black/40 text-slate-100"
                }`}
                  />
                </label>
            <label className={`text-xs font-semibold uppercase tracking-wide ${legendLabelClass}`}>
                  {strings.languageNameLabel}
                  <input
                    value={languageLabel}
                    onChange={(event) => setLanguageLabel(event.target.value)}
                    placeholder="Language name"
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40 ${
                  isLightTheme
                    ? "border-slate-300/70 bg-white/85 text-slate-900"
                    : "border-white/10 bg-black/40 text-slate-100"
                }`}
                  />
                </label>
            <p className={`text-xs ${mutedTextClass}`}>{strings.languageFormHelper}</p>
                <button
                  type="submit"
              className={`mt-1 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                isLightTheme
                  ? "bg-sky-500 text-white hover:bg-sky-400"
                  : "bg-sky-500 text-white hover:bg-sky-400"
              }`}
                >
                  {strings.addLanguageLabel}
                </button>
              </form>
            )}
            {statusMessage && (
          <p
            className={`rounded-xl border px-3 py-2 text-xs ${
              isLightTheme
                ? "border-emerald-400/60 bg-emerald-100 text-emerald-700"
                : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
            }`}
          >
                {statusMessage}
              </p>
            )}
          </header>
        <div className={layoutGridClass}>
          {panelOpen && (
            <div className="flex flex-col gap-4">
                {qrOpen && (
                  <article className={`${panelBaseClass} space-y-4 ${panelPaddingClass}`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-semibold ${sectionHeadingClass}`}>{strings.shareTitle}</h2>
                    <button type="button" onClick={toggleQr} className={controlButtonClass}>
                      {strings.hideQrLabel}
                    </button>
                  </div>
                  <p className={`text-sm ${mutedTextClass}`}>{strings.shareDescription}</p>
                  {qrImageUrl ? (
                    <div className="flex justify-center">
                      <img
                        src={qrImageUrl}
                        alt={strings.shareTitle}
                        className="h-48 w-48 rounded-2xl border border-white/10 bg-white/5 p-3"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <p className={`rounded-2xl border px-3 py-3 text-sm ${legendCardClass}`}>
                      {strings.shareUnavailable}
                    </p>
                  )}
                  <p className="break-all text-[0.7rem] text-slate-400">{shareUrl}</p>
                </article>
              )}
              <article className={`${panelBaseClass} space-y-4 ${panelPaddingClass}`}>
            <div className="flex items-center justify-between gap-3">
                <h2 className={`text-lg font-semibold sm:text-xl ${sectionHeadingClass}`}>
                {strings.currentLocationLabel}
              </h2>
              {currentPlace && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeCurrentClass}`}
                  >
                  {currentPlace.name}
                </span>
              )}
            </div>
              <p className={`text-sm ${subtleTextClass}`}>{strings.selectLocationHint}</p>
              <div className={`${mutedSurfaceClass} p-4`}>
              <select
                value={currentPlaceId ?? undefined}
                onChange={(event) => handleSelectCurrent(Number.parseInt(event.target.value, 10))}
                  className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40 sm:text-base ${
                    isLightTheme
                      ? "border-slate-300/70 bg-white/85 text-slate-900"
                      : "border-white/10 bg-white/10 text-slate-100"
                  }`}
              >
                {places.map((place) => (
                  <option key={place.id} value={place.id} className="text-slate-900">
                    {place.name} · {place.floor}
                  </option>
                ))}
              </select>
            </div>
              <div className={`${mutedSurfaceClass} flex flex-wrap items-center gap-4 px-4 py-3`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${legendLabelClass}`}>
                  {strings.legendHeading}
                </span>
                <LegendDot className={legendDotClasses.current} label={strings.legendCurrent} />
                <LegendDot className={legendDotClasses.selected} label={strings.legendSelected} />
                <LegendDot className={legendDotClasses.nearby} label={strings.legendNearby} />
            </div>
          </article>
              {searchPanelOpen && (
                <article className={`${panelBaseClass} space-y-4 ${panelPaddingClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className={`text-lg font-semibold sm:text-xl ${sectionHeadingClass}`}>
                {strings.exploreHeading}
              </h2>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                      className={`text-xs font-semibold uppercase tracking-wide transition ${
                        isLightTheme
                          ? "text-sky-600 hover:text-sky-500"
                          : "text-sky-300 hover:text-sky-200"
                      }`}
                >
                  {strings.clearSearch}
                </button>
              )}
            </div>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={strings.searchPlaceholder}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40 sm:text-base ${
                    isLightTheme
                      ? "border-slate-300/70 bg-white/85 text-slate-900"
                      : "border-white/10 bg-black/30 text-slate-100"
                  }`}
                />
            <div className="space-y-3">
                  {searchResults.length === 0 ? (
                    <p className={`rounded-2xl border px-4 py-4 text-sm ${legendCardClass}`}>
                      {strings.noSearchResults}
                    </p>
                  ) : (
                    searchResults.map((place) => (
                  <div
                  key={place.id}
                  onClick={() => setSelectedPlaceId(place.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPlaceId(place.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`w-full cursor-pointer rounded-2xl border px-4 py-3 text-left transition ${
                    selectedPlaceId === place.id
                        ? isLightTheme
                          ? "border-sky-500 bg-sky-100 text-slate-900"
                          : "border-sky-400 bg-sky-500/20 text-white"
                        : isLightTheme
                          ? "border-slate-200/70 bg-white/70 text-slate-800 hover:border-sky-400/60 hover:bg-sky-50"
                      : "border-white/10 bg-black/30 text-slate-200 hover:border-sky-400/60 hover:bg-sky-500/10"
                  }`}
                >
                    {showImages && place.imageUrl ? (
                      <div
                        className={`mb-3 overflow-hidden rounded-xl border ${
                          isLightTheme ? "border-slate-200/80" : "border-white/10"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={place.imageUrl}
                          alt={place.name}
                          className="h-36 w-full rounded-lg object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                  <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold sm:text-base ${sectionHeadingClass}`}>
                        {place.name}
                      </span>
                      <span className={`text-xs ${mutedTextClass}`}>
                      {place.floor} · {place.zone}
                    </span>
                  </div>
                    <p className={`mt-1 line-clamp-2 text-xs sm:text-sm ${mutedTextClass}`}>
                    {place.description}
                  </p>
                  {currentPlaceId !== place.id && (
                      <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${subtleTextClass}`}>
                        <span
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectCurrent(place.id);
                        }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              handleSelectCurrent(place.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-wide transition ${
                            isLightTheme
                              ? "border-slate-300/70 text-slate-700 hover:border-sky-400 hover:text-sky-600"
                              : "border-white/20 text-slate-200 hover:border-sky-400 hover:text-white"
                          }`}
                      >
                        {strings.setAsCurrent}
                        </span>
                    </div>
                  )}
                  </div>
                    ))
                  )}
            </div>
          </article>
            )}
                </div>
              )}
          <div className="flex flex-col gap-4">
          <article className={`${panelBaseClass} space-y-4 ${panelPaddingClass}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={`text-lg font-semibold sm:text-xl ${sectionHeadingClass}`}>{strings.mapViewHeading}</h2>
              {currentPlace && (
                <div className={`text-xs sm:text-sm ${mutedTextClass}`}>
                  {currentPlace.floor} · {currentPlace.zone}
                </div>
              )}
            </div>
            <div
              className={`relative h-[340px] w-full overflow-hidden rounded-2xl border sm:h-[460px] lg:h-[min(70vh,700px)] ${
                isLightTheme ? "border-slate-300/70 bg-white/70" : "border-white/10 bg-black/30"
              }`}
            >
              <PlaceMap
                places={places}
                currentPlaceId={currentPlaceId}
                highlightedPlaceId={highlightPlaceId}
                navigatorPlaceId={currentPlaceId}
                destinationPlaceId={destinationPlaceId}
                activePlaceId={activePlaceId}
                neighbors={neighbors}
                pathSegments={pathSegments}
                routeProgressRatio={routeProgressRatio}
                showRoute={showRoute}
                labels={{
                  current: strings.legendCurrent,
                  selected: strings.legendSelected,
                  nearby: strings.legendNearby,
                  noMap: strings.noMapData,
                }}
                className="h-full w-full"
                theme={theme}
                showLegend
              />
            </div>
            <div className={`text-xs ${mutedTextClass}`}>
              {strings.currentLocationLabel}: {" "}
              {currentPlace ? `${currentPlace.name} · ${currentPlace.floor}` : strings.noMapData}
            </div>
          </article>
            <article className={`${panelBaseClass} space-y-4 ${panelPaddingClass}`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className={`text-lg font-semibold sm:text-xl ${sectionHeadingClass}`}>
                  {strings.surroundingHeading}
                </h2>
                {currentPlace && (
                  <div className={`text-xs sm:text-sm ${mutedTextClass}`}>
                    {currentPlace.floor} · {currentPlace.zone}
                  </div>
                )}
              </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {neighbors.length === 0 && (
                  <p className={`${mutedSurfaceClass} px-4 py-6 text-sm ${subtleTextClass}`}>
                  {strings.noNearbyResults}
                </p>
              )}
              {neighbors.map((neighbor) => (
                <button
                  key={neighbor.id}
                  type="button"
                  onClick={() => setSelectedPlaceId(neighbor.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    selectedPlaceId === neighbor.id
                        ? isLightTheme
                          ? "border-sky-500 bg-sky-100 text-slate-900"
                          : "border-sky-400 bg-sky-500/20 text-white"
                        : isLightTheme
                          ? "border-slate-200/70 bg-white/70 text-slate-800 hover:border-sky-400/60 hover:bg-sky-50"
                      : "border-white/10 bg-black/30 text-slate-200 hover:border-sky-400/60 hover:bg-sky-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                        {showImages && neighbor.imageUrl ? (
                          <div
                            className={`mb-2 overflow-hidden rounded-xl border ${
                              isLightTheme ? "border-slate-200/80" : "border-white/10"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={neighbor.imageUrl}
                              alt={neighbor.name}
                              className="h-28 w-full rounded-lg object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                        <h3 className={`text-sm font-semibold sm:text-base ${sectionHeadingClass}`}>
                          {neighbor.name}
                        </h3>
                        <p className={`mt-1 text-xs sm:text-sm ${mutedTextClass}`}>
                        {neighbor.description}
                      </p>
                    </div>
                      <div
                        className={`rounded-full border px-3 py-1 text-xs ${
                          isLightTheme
                            ? "border-slate-300/70 text-slate-700"
                            : "border-white/20 text-slate-200"
                        }`}
                      >
                      {neighbor.distance} {strings.distanceUnit}
                    </div>
                  </div>
                    <p className={`mt-2 text-xs sm:text-sm ${subtleTextClass}`}>
                    {neighbor.orientationLabel}
                    {neighbor.landmark ? ` · ${neighbor.landmark}` : ""}
                  </p>
                </button>
              ))}
            </div>
          </article>
            <article className={`${panelBaseClass} space-y-4 ${panelPaddingClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className={`text-lg font-semibold sm:text-xl ${sectionHeadingClass}`}>
                {strings.directionsHeading}
              </h2>
                  {directions && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setShowRoute((state) => !state)}
                        className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-wide transition ${actionChipClass}`}
                      >
                        {showRoute ? strings.hideRouteLabel : strings.showRouteLabel}
                      </button>
                      {ttsAvailable && (
                        <button
                          type="button"
                          onClick={isReadingDirections ? handleStopReading : handleReadDirections}
                          className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-wide transition ${actionChipClass}`}
                        >
                          {isReadingDirections ? strings.stopReadingLabel : strings.readDirectionsLabel}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              {selectedPlace && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      isLightTheme
                        ? "border border-sky-500/60 bg-sky-100 text-sky-700"
                        : "border border-sky-400/60 bg-sky-500/20 text-sky-200"
                    }`}
                  >
                  {selectedPlace.name}
                </span>
              )}
            </div>
              {directions && !ttsAvailable && (
                <p className={`text-xs ${mutedTextClass}`}>{strings.ttsUnavailableLabel}</p>
              )}
            {!currentPlaceId || !selectedPlaceId ? (
                <p className={`text-sm ${subtleTextClass}`}>{strings.directionsUnavailable}</p>
            ) : currentPlaceId === selectedPlaceId ? (
                <p
                  className={`rounded-2xl border px-4 py-4 text-sm ${
                    isLightTheme
                      ? "border-emerald-500/50 bg-emerald-100 text-emerald-700"
                      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                {strings.sameLocation}
              </p>
            ) : loadingDirections ? (
                <p
                  className={`rounded-2xl border px-4 py-4 text-sm ${
                    isLightTheme
                      ? "border-slate-300/70 bg-white/70 text-slate-700"
                      : "border-white/10 bg-black/30 text-slate-200"
                  }`}
                >
                {strings.loadingDirections}
              </p>
            ) : !directions ? (
                <p
                  className={`rounded-2xl border px-4 py-4 text-sm ${
                    isLightTheme
                      ? "border-rose-400/60 bg-rose-100 text-rose-700"
                      : "border-rose-400/40 bg-rose-500/10 text-rose-100"
                  }`}
                >
                {strings.directionsUnavailable}
              </p>
            ) : (
              <div className="space-y-4">
                  <div className={`flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm ${mutedTextClass}`}>
                  <span>
                    {directions.from.name} → {directions.to.name}
                  </span>
                  <span>
                      {strings.totalDistanceLabel}: {Math.round(directions.totalDistance)} {strings.distanceUnit}
                  </span>
                </div>
                <ol className="space-y-3">
                  {directions.steps.map((step, index) => {
                    const isActiveListStep = index === currentStepIndex;
                    const baseClasses = isLightTheme
                      ? "border-slate-200/70 bg-white/70 text-slate-800"
                      : "border-white/10 bg-black/30 text-slate-200";
                    const activeClasses = isLightTheme
                      ? "border-sky-400/80 shadow-lg shadow-sky-500/30"
                      : "border-sky-400/70 bg-sky-500/10 shadow-lg shadow-sky-900/40";
                    return (
                      <li
                        key={`${step.toId}-${index}`}
                        className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                          isActiveListStep ? activeClasses : baseClasses
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                            isLightTheme
                              ? isActiveListStep
                                ? "border-sky-600 bg-sky-200 text-sky-800"
                                : "border-sky-500/60 bg-sky-100 text-sky-700"
                              : isActiveListStep
                                ? "border-sky-300 bg-sky-500 text-white"
                                : "border-sky-400/50 bg-sky-500/20 text-sky-100"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className={`text-sm sm:text-base ${sectionHeadingClass}`}>{step.instruction}</p>
                          <p className={`mt-1 text-xs ${mutedTextClass}`}>
                            {step.distance} {strings.distanceUnit}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
              <p className={`hidden text-xs sm:block ${mutedTextClass}`}>{strings.mobileNavHint}</p>
          </article>
          </div>
        </div>
        </main>
      )}
    </div>
  );
}

type PlaceMapProps = {
  places: PlaceSummary[];
  currentPlaceId: number | null;
  highlightedPlaceId: number | null;
  navigatorPlaceId?: number | null;
  destinationPlaceId?: number | null;
  activePlaceId?: number | null;
  neighbors: NearbyPlace[];
  pathSegments: Array<{ from: PlaceSummary; to: PlaceSummary }>;
  routeProgressRatio: number;
  showRoute: boolean;
  labels: {
    current: string;
    selected: string;
    nearby: string;
    noMap: string;
  };
  className?: string;
  showLegend?: boolean;
  theme?: Theme;
};

function PlaceMap({
  places,
  currentPlaceId,
  highlightedPlaceId,
  navigatorPlaceId = null,
  destinationPlaceId = null,
  activePlaceId = null,
  neighbors,
  pathSegments,
  routeProgressRatio,
  showRoute,
  labels,
  className,
  showLegend = true,
  theme = "dark",
}: PlaceMapProps) {
  const mapTheme: "light" | "dark" = theme === "light" ? "light" : "dark";

  const mapPlaces = useMemo(
    () =>
      places.map((place) => ({
        id: place.id,
        name: place.name,
        floor: place.floor,
        zone: place.zone,
        imageUrl: place.imageUrl,
        latitude: place.latitude ?? null,
        longitude: place.longitude ?? null,
      })),
    [places]
  );

  const hasValidCoordinates = useMemo(
    () =>
      mapPlaces.some(
        (place) => typeof place.latitude === "number" && typeof place.longitude === "number"
      ),
    [mapPlaces]
  );

  const neighborIds = useMemo(() => neighbors.map((neighbor) => neighbor.id), [neighbors]);

  const routeCoordinates = useMemo(() => {
    if (!pathSegments.length) {
      return [] as Array<[number, number]>;
    }
    const coordinates: Array<[number, number]> = [];
    pathSegments.forEach((segment) => {
      if (
        typeof segment.from.latitude !== "number" ||
        typeof segment.from.longitude !== "number" ||
        typeof segment.to.latitude !== "number" ||
        typeof segment.to.longitude !== "number"
      ) {
        return;
      }
      const fromCoordinate: [number, number] = [segment.from.longitude, segment.from.latitude];
      const toCoordinate: [number, number] = [segment.to.longitude, segment.to.latitude];
      if (coordinates.length === 0) {
        coordinates.push(fromCoordinate);
      } else {
        const last = coordinates[coordinates.length - 1];
        if (last[0] !== fromCoordinate[0] || last[1] !== fromCoordinate[1]) {
          coordinates.push(fromCoordinate);
        }
      }
      coordinates.push(toCoordinate);
    });
    return coordinates;
  }, [pathSegments]);

  const normalizedRouteProgress = Number.isFinite(routeProgressRatio)
    ? Math.min(Math.max(routeProgressRatio, 0), 1)
    : 0;

  const effectiveShowRoute = showRoute && routeCoordinates.length >= 2 && hasValidCoordinates;

  if (!hasValidCoordinates) {
    const emptyClasses = [
      "flex items-center justify-center rounded-2xl border text-sm",
      mapTheme === "light"
        ? "border-slate-300/60 bg-white/75 text-slate-600"
        : "border-dashed border-white/20 bg-black/30 text-slate-400",
      className ?? "h-72 w-full",
    ]
      .filter(Boolean)
      .join(" ");
    return <div className={emptyClasses}>{labels.noMap}</div>;
  }

  const wrapperClassName = [
    "relative h-80 w-full overflow-hidden rounded-2xl border",
    mapTheme === "light"
      ? "border-slate-300/60 bg-slate-100 shadow-xl shadow-slate-300/40"
      : "border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-xl shadow-black/30",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const legendClassName = [
    "pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-wrap items-center gap-4 rounded-full border px-4 py-2 text-xs sm:text-sm",
    mapTheme === "light"
      ? "border-slate-300/70 bg-white/85 text-slate-700 shadow-lg shadow-slate-300/40"
      : "border-white/10 bg-black/55 text-slate-200 shadow-lg shadow-black/60 backdrop-blur",
  ].join(" ");

  const legendPalette =
    mapTheme === "light"
      ? {
          current: "border-emerald-500 bg-emerald-300",
          selected: "border-sky-500 bg-sky-300",
          nearby: "border-amber-500 bg-amber-300",
        }
      : {
          current: "border-emerald-300 bg-emerald-500",
          selected: "border-sky-300 bg-sky-500",
          nearby: "border-amber-300 bg-amber-500/70",
        };

  return (
    <div className={wrapperClassName}>
      <MapCanvas
        theme={mapTheme}
        places={mapPlaces}
        neighbors={neighborIds}
        currentPlaceId={currentPlaceId}
        highlightedPlaceId={highlightedPlaceId}
        activePlaceId={activePlaceId ?? null}
        navigatorPlaceId={navigatorPlaceId ?? null}
        destinationPlaceId={destinationPlaceId ?? null}
        routeCoordinates={routeCoordinates}
        routeProgressRatio={normalizedRouteProgress}
        showRoute={effectiveShowRoute}
      />
      {showLegend && (
        <div className={legendClassName}>
          <LegendDot className={legendPalette.current} label={labels.current} />
          <LegendDot className={legendPalette.selected} label={labels.selected} />
          <LegendDot className={legendPalette.nearby} label={labels.nearby} />
        </div>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-3 w-3 rounded-full border ${className}`} />
      <span>{label}</span>
    </div>
  );
}
