/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type LngLatLike, type StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Feature, Polygon, LineString, Geometry } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { PLACE_BASE_LATITUDE, PLACE_BASE_LONGITUDE } from "@/lib/constants";

type MapPlace = {
  id: number;
  name: string;
  floor: string;
  zone: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
};

type MapCanvasProps = {
  places: MapPlace[];
  theme: "light" | "dark";
  neighbors: number[];
  currentPlaceId: number | null;
  highlightedPlaceId: number | null;
  activePlaceId: number | null;
  navigatorPlaceId: number | null;
  destinationPlaceId: number | null;
  routeCoordinates: Array<[number, number]>;
  routeProgressRatio: number;
  showRoute: boolean;
};

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

const LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: OSM_ATTRIBUTION,
      maxzoom: 19,
    },
    osmB: {
      type: "raster",
      tiles: ["https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: OSM_ATTRIBUTION,
      maxzoom: 19,
    },
    osmC: {
      type: "raster",
      tiles: ["https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: OSM_ATTRIBUTION,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#eef2ff",
      },
    },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-brightness-min": 0.85,
        "raster-brightness-max": 1,
        "raster-saturation": -0.08,
        "raster-contrast": 0.12,
      },
    },
    {
      id: "osm-b",
      type: "raster",
      source: "osmB",
      paint: {
        "raster-brightness-min": 0.85,
        "raster-brightness-max": 1,
        "raster-saturation": -0.08,
        "raster-contrast": 0.12,
      },
    },
    {
      id: "osm-c",
      type: "raster",
      source: "osmC",
      paint: {
        "raster-brightness-min": 0.85,
        "raster-brightness-max": 1,
        "raster-saturation": -0.08,
        "raster-contrast": 0.12,
      },
    },
  ],
};

const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: OSM_ATTRIBUTION,
      maxzoom: 19,
    },
    osmB: {
      type: "raster",
      tiles: ["https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: OSM_ATTRIBUTION,
      maxzoom: 19,
    },
    osmC: {
      type: "raster",
      tiles: ["https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: OSM_ATTRIBUTION,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#020617",
      },
    },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-brightness-min": 0.25,
        "raster-brightness-max": 0.6,
        "raster-saturation": -0.85,
        "raster-contrast": 0.35,
        "raster-hue-rotate": 180,
      },
    },
    {
      id: "osm-b",
      type: "raster",
      source: "osmB",
      paint: {
        "raster-brightness-min": 0.25,
        "raster-brightness-max": 0.6,
        "raster-saturation": -0.85,
        "raster-contrast": 0.35,
        "raster-hue-rotate": 180,
      },
    },
    {
      id: "osm-c",
      type: "raster",
      source: "osmC",
      paint: {
        "raster-brightness-min": 0.25,
        "raster-brightness-max": 0.6,
        "raster-saturation": -0.85,
        "raster-contrast": 0.35,
        "raster-hue-rotate": 180,
      },
    },
  ],
};

function computePartialLine(coordinates: Array<[number, number]>, ratio: number): Array<[number, number]> {
  if (!coordinates.length) {
    return [];
  }
  if (coordinates.length === 1 || ratio <= 0) {
    return [coordinates[0]];
  }
  if (ratio >= 1) {
    return coordinates;
  }
  const segments = [];
  let totalLength = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const [lng1, lat1] = coordinates[index - 1];
    const [lng2, lat2] = coordinates[index];
    const segmentLength = Math.hypot(lng2 - lng1, lat2 - lat1);
    segments.push({ length: segmentLength, start: coordinates[index - 1], end: coordinates[index] });
    totalLength += segmentLength;
  }
  if (totalLength <= 0) {
    return [coordinates[0]];
  }

  const targetLength = totalLength * Math.min(Math.max(ratio, 0), 1);
  const partial: Array<[number, number]> = [coordinates[0]];
  let traversed = 0;

  for (const segment of segments) {
    if (segment.length <= 0) {
      continue;
    }
    if (traversed + segment.length <= targetLength) {
      partial.push(segment.end);
      traversed += segment.length;
      continue;
    }
    const remaining = targetLength - traversed;
    const t = remaining / segment.length;
    const interpolated: [number, number] = [
      segment.start[0] + (segment.end[0] - segment.start[0]) * t,
      segment.start[1] + (segment.end[1] - segment.start[1]) * t,
    ];
    partial.push(interpolated);
    break;
  }

  return partial;
}

export default function MapCanvas(props: MapCanvasProps) {
  const {
    theme,
    places,
    neighbors,
    currentPlaceId,
    highlightedPlaceId,
    activePlaceId,
    navigatorPlaceId,
    destinationPlaceId,
    routeCoordinates,
    routeProgressRatio,
    showRoute,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const hasFittedBoundsRef = useRef(false);
  const placeLabelMarkersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const [currentZoom, setCurrentZoom] = useState(0);

  const filteredPlaces = useMemo(() => {
    return places.filter(
      (place) => typeof place.latitude === "number" && typeof place.longitude === "number"
    ) as Array<MapPlace & { latitude: number; longitude: number }>;
  }, [places]);

  const neighborSet = useMemo(() => new Set(neighbors), [neighbors]);

  const getPlaceState = useCallback(
    (placeId: number): string => {
      if (placeId === navigatorPlaceId || placeId === currentPlaceId) {
        return "navigator";
      }
      if (placeId === destinationPlaceId) {
        return "destination";
      }
      if (placeId === activePlaceId) {
        return "active";
      }
      if (placeId === highlightedPlaceId) {
        return "highlighted";
      }
      if (neighborSet.has(placeId)) {
        return "neighbor";
      }
      return "default";
    },
    [activePlaceId, currentPlaceId, destinationPlaceId, highlightedPlaceId, neighborSet, navigatorPlaceId]
  );

  const placeGeoJSON = useMemo(() => {
    const features: Feature[] = filteredPlaces.map((place) => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [place.longitude, place.latitude],
        },
        properties: {
          id: place.id,
          name: place.name,
          floor: place.floor,
          zone: place.zone,
          state: getPlaceState(place.id),
        },
      };
    });
    return { type: "FeatureCollection", features } as FeatureCollection<Geometry>;
  }, [filteredPlaces, getPlaceState]);

  const routeFullGeoJSON = useMemo(() => {
    if (!showRoute || routeCoordinates.length < 2) {
      const collection: FeatureCollection<LineString> = {
        type: "FeatureCollection",
        features: [] as Feature<LineString>[],
      };
      return collection;
    }
    const feature: Feature<LineString> = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: routeCoordinates,
      },
      properties: {},
    };
    return {
      type: "FeatureCollection",
      features: [
        {
          ...feature,
        },
      ],
    } as FeatureCollection<LineString>;
  }, [routeCoordinates, showRoute]);

  const routeProgressGeoJSON = useMemo(() => {
    if (!showRoute || routeCoordinates.length < 2) {
      return {
        type: "FeatureCollection",
        features: [] as Feature<LineString>[],
      } as FeatureCollection<LineString>;
    }
    const partialCoordinates = computePartialLine(routeCoordinates, routeProgressRatio);
    if (partialCoordinates.length < 2) {
      return {
        type: "FeatureCollection",
        features: [] as Feature<LineString>[],
      } as FeatureCollection<LineString>;
    }
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: partialCoordinates,
          },
          properties: {},
        },
      ],
    };
  }, [routeCoordinates, routeProgressRatio, showRoute]);

  const bounds = useMemo(() => {
    if (filteredPlaces.length === 0) {
      return null;
    }
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLng = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;

    filteredPlaces.forEach((place) => {
      minLat = Math.min(minLat, place.latitude);
      maxLat = Math.max(maxLat, place.latitude);
      minLng = Math.min(minLng, place.longitude);
      maxLng = Math.max(maxLng, place.longitude);
    });

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ] as [LngLatLike, LngLatLike];
  }, [filteredPlaces]);

  const campusGlow = useMemo(() => {
    if (!filteredPlaces.length) {
      return null;
    }
    const points = filteredPlaces.map((place) => [place.longitude, place.latitude] as [number, number]);
    let sumLat = 0;
    let sumLng = 0;
    points.forEach(([lng, lat]) => {
      sumLat += lat;
      sumLng += lng;
    });
    const center: [number, number] = [sumLng / points.length, sumLat / points.length];
    let maxDistance = 0;
    points.forEach(([lng, lat]) => {
      const distance = Math.hypot(lng - center[0], lat - center[1]);
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    });
    const radius = maxDistance * 1.35 || 0.0025;
    const segments = 48;
    const coordinates: Array<[number, number]> = [];
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const lng = center[0] + Math.cos(angle) * radius;
      const lat = center[1] + Math.sin(angle) * radius;
      coordinates.push([lng, lat]);
    }
    const polygonFeature: Feature<Polygon> = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
      properties: {},
    };
    const collection: FeatureCollection<Polygon> = {
      type: "FeatureCollection",
      features: [
        {
          ...polygonFeature,
        },
      ],
    };
    return collection;
  }, [filteredPlaces]);

  const campusBlueprint = useMemo(() => {
    if (!filteredPlaces.length) {
      return null;
    }
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLng = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;

    filteredPlaces.forEach((place) => {
      minLat = Math.min(minLat, place.latitude);
      maxLat = Math.max(maxLat, place.latitude);
      minLng = Math.min(minLng, place.longitude);
      maxLng = Math.max(maxLng, place.longitude);
    });

    const toLngLat = (x: number, y: number) => [
      minLng + (maxLng - minLng) * x,
      minLat + (maxLat - minLat) * y,
    ] as [number, number];

    const polygonBlueprints: Array<Array<[number, number]>> = [
      [
        toLngLat(0.16, 0.18),
        toLngLat(0.36, 0.12),
        toLngLat(0.38, 0.34),
        toLngLat(0.2, 0.38),
      ],
      [
        toLngLat(0.58, 0.14),
        toLngLat(0.82, 0.16),
        toLngLat(0.8, 0.38),
        toLngLat(0.6, 0.36),
      ],
      [
        toLngLat(0.32, 0.55),
        toLngLat(0.7, 0.5),
        toLngLat(0.68, 0.74),
        toLngLat(0.28, 0.78),
      ],
    ];

    const walkwayBlueprints: Array<Array<[number, number]>> = [
      [toLngLat(0.48, 0.1), toLngLat(0.52, 0.88)],
      [toLngLat(0.22, 0.26), toLngLat(0.78, 0.62)],
      [toLngLat(0.18, 0.62), toLngLat(0.84, 0.3)],
    ];

    const buildingFeatures: Feature<Polygon>[] = polygonBlueprints.map((coordinates) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...coordinates, coordinates[0]]],
      },
      properties: {},
    }));

    const pathFeatures: Feature<LineString>[] = walkwayBlueprints.map((coordinates) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates,
      },
      properties: {},
    }));

    return {
      buildings: {
        type: "FeatureCollection",
        features: buildingFeatures,
      } as FeatureCollection<Polygon>,
      paths: {
        type: "FeatureCollection",
        features: pathFeatures,
      } as FeatureCollection<LineString>,
    };
  }, [filteredPlaces]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    if (mapRef.current) {
      placeLabelMarkersRef.current.forEach((marker) => marker.remove());
      placeLabelMarkersRef.current.clear();
      mapRef.current.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      hasFittedBoundsRef.current = false;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: theme === "light" ? LIGHT_STYLE : DARK_STYLE,
      center: [filteredPlaces[0]?.longitude ?? PLACE_BASE_LONGITUDE, filteredPlaces[0]?.latitude ?? PLACE_BASE_LATITUDE],
      zoom: 17,
      pitch: 48,
      bearing: -12,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
      }),
      "top-right"
    );

    map.on("load", () => {
      mapLoadedRef.current = true;

      map.dragPan.enable();
      map.touchZoomRotate.enable();
      map.scrollZoom.enable({ around: "center" });
      map.doubleClickZoom.enable();
      map.keyboard.enable();
      map.touchZoomRotate.enableRotation();

      if (campusGlow) {
        map.addSource("campus-halo", {
          type: "geojson",
          data: campusGlow,
        });

        map.addLayer({
          id: "campus-halo-outer",
          type: "fill",
          source: "campus-halo",
          paint: {
            "fill-color":
              theme === "light"
                ? "rgba(56,189,248,0.22)"
                : "rgba(14,165,233,0.16)",
            "fill-outline-color":
              theme === "light"
                ? "rgba(14,116,144,0.4)"
                : "rgba(14,165,233,0.45)",
          },
        });

        map.addLayer({
          id: "campus-halo-inner",
          type: "fill",
          source: "campus-halo",
          paint: {
            "fill-color":
              theme === "light"
                ? "rgba(186,230,253,0.45)"
                : "rgba(56,189,248,0.35)",
          },
        });
      }

      if (campusBlueprint) {
        map.addSource("campus-blueprint-buildings", {
          type: "geojson",
          data: campusBlueprint.buildings,
        });

        map.addLayer({
          id: "campus-blueprint-fill",
          type: "fill",
          source: "campus-blueprint-buildings",
          paint: {
            "fill-color": theme === "light" ? "rgba(15,23,42,0.08)" : "rgba(148,163,184,0.15)",
            "fill-outline-color": theme === "light" ? "rgba(15,23,42,0.3)" : "rgba(148,163,184,0.35)",
          },
        });

        map.addLayer({
          id: "campus-blueprint-outline",
          type: "line",
          source: "campus-blueprint-buildings",
          paint: {
            "line-color": theme === "light" ? "rgba(2,132,199,0.7)" : "rgba(125,211,252,0.8)",
            "line-width": 1.6,
            "line-dasharray": [2, 1.2],
          },
        });

        map.addSource("campus-blueprint-paths", {
          type: "geojson",
          data: campusBlueprint.paths,
        });

        map.addLayer({
          id: "campus-blueprint-paths",
          type: "line",
          source: "campus-blueprint-paths",
          paint: {
            "line-color": theme === "light" ? "rgba(14,165,233,0.6)" : "rgba(56,189,248,0.55)",
            "line-width": 2.2,
            "line-dasharray": [0.75, 0.4],
            "line-blur": 0.6,
          },
        });
      }

      map.addSource("places", {
        type: "geojson",
        data: placeGeoJSON,
      });

      map.addLayer({
        id: "places-glow",
        type: "circle",
        source: "places",
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "state"], "navigator"],
            22,
            ["==", ["get", "state"], "destination"],
            20,
            ["==", ["get", "state"], "active"],
            18,
            14,
          ],
          "circle-color": [
            "match",
            ["get", "state"],
            "navigator",
            theme === "light" ? "rgba(34,197,94,0.45)" : "rgba(74,222,128,0.45)",
            "destination",
            theme === "light" ? "rgba(168,85,247,0.45)" : "rgba(192,132,252,0.45)",
            "active",
            theme === "light" ? "rgba(56,189,248,0.35)" : "rgba(125,211,252,0.4)",
            "neighbor",
            theme === "light" ? "rgba(251,191,36,0.28)" : "rgba(253,224,71,0.28)",
            "highlighted",
            theme === "light" ? "rgba(59,130,246,0.35)" : "rgba(96,165,250,0.35)",
            theme === "light" ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.15)",
          ],
          "circle-blur": 0.85,
        },
      });

      map.addLayer({
        id: "places-core",
        type: "circle",
        source: "places",
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "state"], "navigator"],
            9,
            ["==", ["get", "state"], "destination"],
            8,
            ["==", ["get", "state"], "active"],
            7.5,
            ["==", ["get", "state"], "highlighted"],
            7,
            6,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#020617",
          "circle-color": [
            "match",
            ["get", "state"],
            "navigator",
            theme === "light" ? "#22c55e" : "#4ade80",
            "destination",
            theme === "light" ? "#a855f7" : "#c084fc",
            "active",
            theme === "light" ? "#0ea5e9" : "#38bdf8",
            "highlighted",
            theme === "light" ? "#38bdf8" : "#60a5fa",
            "neighbor",
            theme === "light" ? "#facc15" : "#fbbf24",
            theme === "light" ? "#f8fafc" : "#1e293b",
          ],
        },
      });

      map.addSource("route-full", {
        type: "geojson",
        lineMetrics: true,
        data: routeFullGeoJSON,
      });

      map.addLayer({
        id: "route-full",
        type: "line",
        source: "route-full",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": 8,
          "line-color": theme === "light" ? "rgba(15,23,42,0.15)" : "rgba(148,163,184,0.12)",
        },
      });

      map.addSource("route-progress", {
        type: "geojson",
        lineMetrics: true,
        data: routeProgressGeoJSON,
      });

      map.addLayer({
        id: "route-progress",
        type: "line",
        source: "route-progress",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": 5.5,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            theme === "light" ? "#0284c7" : "#0ea5e9",
            1,
            theme === "light" ? "#0f766e" : "#14b8a6",
          ],
        },
      });

      map.addLayer({
        id: "route-progress-glow",
        type: "line",
        source: "route-progress",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": 10,
          "line-color": theme === "light" ? "rgba(14,165,233,0.25)" : "rgba(56,189,248,0.25)",
          "line-opacity": 0.65,
        },
      });

      (map as unknown as { setFog: (options: unknown) => void }).setFog?.({
        range: [0.5, 10],
        color: theme === "light" ? "rgba(15,23,42,0.04)" : "rgba(8,47,73,0.08)",
        "high-color": theme === "light" ? "rgba(59,130,246,0.18)" : "rgba(125,211,252,0.18)",
      });

      map.setLight({
        color: theme === "light" ? "#f8fafc" : "#cbd5f5",
        intensity: 0.45,
      });

      // maplibre-gl sky layer requires a source; skip custom sky when not available
    });

    map.on("styledata", () => {
      if (campusGlow && map.getSource("campus-halo")) {
        (map.getSource("campus-halo") as maplibregl.GeoJSONSource).setData(
          campusGlow as unknown as FeatureCollection<Geometry>
        );
      }
      if (campusBlueprint?.buildings && map.getSource("campus-blueprint-buildings")) {
        (map.getSource("campus-blueprint-buildings") as maplibregl.GeoJSONSource).setData(
          campusBlueprint.buildings as unknown as FeatureCollection<Geometry>
        );
      }
      if (campusBlueprint?.paths && map.getSource("campus-blueprint-paths")) {
        (map.getSource("campus-blueprint-paths") as maplibregl.GeoJSONSource).setData(
          campusBlueprint.paths as unknown as FeatureCollection<Geometry>
        );
      }
    });

    map.on("zoom", () => {
      setCurrentZoom(map.getZoom());
    });

    return () => {
      placeLabelMarkersRef.current.forEach((marker) => marker.remove());
      placeLabelMarkersRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        mapLoadedRef.current = false;
        hasFittedBoundsRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    setCurrentZoom(map.getZoom());
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) {
      return;
    }

    const placesSource = map.getSource("places") as maplibregl.GeoJSONSource | undefined;
    if (placesSource) {
      placesSource.setData(placeGeoJSON as unknown as FeatureCollection<Geometry>);
    }

    const routeFullSource = map.getSource("route-full") as maplibregl.GeoJSONSource | undefined;
    if (routeFullSource) {
      routeFullSource.setData(routeFullGeoJSON as unknown as FeatureCollection<Geometry>);
    }

    const routeProgressSource = map.getSource("route-progress") as maplibregl.GeoJSONSource | undefined;
    if (routeProgressSource) {
      routeProgressSource.setData(routeProgressGeoJSON as unknown as FeatureCollection<Geometry>);
    }

    if (bounds && !hasFittedBoundsRef.current) {
      const padding = window.innerWidth < 640 ? 80 : 120;
      map.fitBounds(bounds, { padding, duration: 950, maxZoom: 19 });
      hasFittedBoundsRef.current = true;
    }
  }, [bounds, campusGlow, campusBlueprint, placeGeoJSON, routeFullGeoJSON, routeProgressGeoJSON]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) {
      return;
    }
    const markers = placeLabelMarkersRef.current;
    const currentDir = typeof document !== "undefined" ? document.documentElement.dir || "ltr" : "ltr";
    const activeIds = new Set(filteredPlaces.map((place) => place.id));

    markers.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    });

    const getLabelClassName = (state: string) => {
      const base =
        "pointer-events-none whitespace-nowrap rounded-full px-3 py-1 text-[0.6rem] font-semibold tracking-[0.25em] uppercase shadow-2xl ring-1 backdrop-blur";
      const themeClass =
        theme === "light"
          ? "bg-white/95 text-slate-700 ring-slate-200/70 shadow-slate-200/60"
          : "bg-slate-950/75 text-slate-100 ring-white/15 shadow-black/40";
      let accent = "";
      if (state === "navigator") {
        accent = theme === "light" ? "text-emerald-600" : "text-emerald-300";
      } else if (state === "destination") {
        accent = theme === "light" ? "text-fuchsia-600" : "text-fuchsia-300";
      } else if (state === "active") {
        accent = theme === "light" ? "text-sky-600" : "text-sky-300";
      } else if (state === "highlighted") {
        accent = theme === "light" ? "text-blue-600" : "text-blue-300";
      } else if (state === "neighbor") {
        accent = theme === "light" ? "text-amber-600" : "text-amber-300";
      }
      return `${base} ${themeClass} ${accent}`.trim();
    };

    filteredPlaces.forEach((place) => {
      const state = getPlaceState(place.id);
      const lngLat: [number, number] = [place.longitude, place.latitude];
      const existing = markers.get(place.id);
      if (existing) {
        existing.setLngLat(lngLat);
        const element = existing.getElement();
        element.textContent = place.name;
        element.className = getLabelClassName(state);
        element.setAttribute("dir", currentDir);
        return;
      }
      if (typeof document === "undefined") {
        return;
      }
      const element = document.createElement("div");
      element.className = getLabelClassName(state);
      element.textContent = place.name;
      element.style.pointerEvents = "none";
      element.setAttribute("dir", currentDir);
      const marker = new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat(lngLat).addTo(map);
      markers.set(place.id, marker);
    });
  }, [filteredPlaces, getPlaceState, theme]);

  const handleZoomIn = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.easeTo({ zoom: map.getZoom() + 0.4, duration: 360, easing: (t) => t });
  }, []);

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.easeTo({ zoom: map.getZoom() - 0.4, duration: 360, easing: (t) => t });
  }, []);

  const handleResetView = useCallback(() => {
    const map = mapRef.current;
    if (!map || !bounds) {
      return;
    }
    const padding = window.innerWidth < 640 ? 80 : 140;
    map.fitBounds(bounds, { padding, duration: 650, maxZoom: 19, pitch: 48, bearing: -12 });
  }, [bounds]);

  const handleLocateMe = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo({
            center: [longitude, latitude],
            zoom: Math.max(map.getZoom(), 18),
            speed: 1.2,
            curve: 1.4,
          });
        },
        () => {
          handleResetView();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      handleResetView();
    }
  }, [bounds, placeGeoJSON, routeFullGeoJSON, routeProgressGeoJSON]);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/40 shadow-[0_30px_90px_-45px_rgba(8,47,73,0.75)] sm:h-[480px]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.15),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(34,197,94,0.15),transparent_45%)] mix-blend-screen opacity-85" />
      <div
        className={`pointer-events-none absolute left-5 top-5 flex flex-col gap-2 sm:left-6 sm:top-6 ${
          theme === "light" ? "text-slate-700" : "text-slate-100"
        }`}
      >
        <div className="pointer-events-auto flex flex-col gap-2 rounded-3xl border border-white/15 bg-slate-950/75 p-3 shadow-xl shadow-black/40 backdrop-blur sm:flex-row sm:items-center sm:gap-3 sm:px-3 sm:py-2">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-white transition hover:border-sky-400 hover:bg-sky-500/70 hover:text-white sm:h-10 sm:w-10"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-white transition hover:border-sky-400 hover:bg-sky-500/70 hover:text-white sm:h-10 sm:w-10"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-sky-400 hover:bg-sky-500/70 hover:text-white sm:flex"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            className="hidden rounded-full border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/40 sm:flex"
          >
            Locate
          </button>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <label className="text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/80">
              Zoom
            </label>
            <input
              type="range"
              min={15}
              max={20.5}
              step={0.05}
              value={currentZoom}
              onChange={(event) => {
                const map = mapRef.current;
                if (!map) {
                  return;
                }
                const target = Number(event.currentTarget.value);
                map.easeTo({ zoom: target, duration: 320, easing: (t) => t });
              }}
              className="h-2 w-32 accent-sky-400"
            />
          </div>
        </div>
        <div className="pointer-events-none hidden rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white shadow-inner shadow-black/60 sm:block">
          ×{currentZoom.toFixed(2)}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-3xl bg-gradient-to-r from-white/6 via-white/8 to-white/4 p-[1px] backdrop-blur">
        <div className="rounded-[30px] border border-white/10 bg-slate-950/65 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-slate-300">
          Live campus navigation
        </div>
      </div>
    </div>
  );
}


