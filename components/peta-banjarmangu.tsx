"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Set web worker eksplisit agar vector tiles decoding (Liberty & Positron) serta GeoJSON parsing berjalan lancar
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

// Palet warna kontras harmonis untuk 17 desa
const DESA_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
  "#0d9488", "#b91c1c", "#15803d", "#a16207", "#7c3aed",
  "#0e7490", "#be185d",
];

// Data Kepala Desa 17 Desa di Kecamatan Banjarmangu
const KEPALA_DESA: Record<string, string> = {
  banjarmangu: "Nurul Hilal Eko Prayitno, S.IP.",
  banjarkulon: "Hudi",
  beji: "Nyana",
  gripit: "Sugeng (Pj.)",
  jenggawur: "Pranyoto",
  kalilunjar: "Slamet Rahardjo",
  kendaga: "Murtinah",
  kesenet: "Didin",
  majatengah: "Sarno",
  paseh: "Waris Mustofa",
  pekandangan: "Adhi Setiawan, S.Pd.",
  prendengan: "Muhamad Barokah",
  rejasari: "Siti Nurfaizah, S.Pd.AUD",
  sigeblog: "Akhmad Subandi",
  sijenggung: "Suyono",
  sijeruk: "Ramel",
  sipedang: "Subagyo",
};

type StyleKey = "liberty" | "positron" | "satelit";

interface SatelliteStyleSource {
  type: "raster";
  tiles: string[];
  tileSize: number;
  maxzoom: number;
}

interface SatelliteStyleLayer {
  id: string;
  type: "raster";
  source: string;
}

interface SatelliteStyle {
  version: 8;
  sources: {
    "esri-satellite": SatelliteStyleSource;
  };
  layers: SatelliteStyleLayer[];
}

const STYLES: Record<StyleKey, string | SatelliteStyle> = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  positron: "https://tiles.openfreemap.org/styles/positron",
  satelit: {
    version: 8,
    sources: {
      "esri-satellite": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: "esri-satellite-layer",
        type: "raster",
        source: "esri-satellite",
      },
    ],
  },
};

function getStyleConfig(key: StyleKey): string | maplibregl.StyleSpecification {
  if (key === "satelit") {
    return {
      version: 8,
      sources: {
        "esri-satellite": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: "esri-satellite-layer",
          type: "raster",
          source: "esri-satellite",
        },
      ],
    } as unknown as maplibregl.StyleSpecification;
  }
  return STYLES[key] as string;
}

interface GeoFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties?: Record<string, unknown>;
}

function calculateBounds(features: GeoFeature[]): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const traverse = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const lng = coords[0];
      const lat = coords[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      for (const item of coords) {
        traverse(item);
      }
    }
  };

  for (const feature of features) {
    if (feature.geometry?.coordinates) {
      traverse(feature.geometry.coordinates);
    }
  }

  if (isFinite(minLng) && isFinite(minLat) && isFinite(maxLng) && isFinite(maxLat)) {
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }
  return null;
}

export default function PetaBanjarmangu() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [activeStyle, setActiveStyle] = useState<StyleKey>("liberty");

  const dataRef = useRef<{
    kec: GeoJSON.FeatureCollection;
    desa: GeoJSON.FeatureCollection;
    bounds: [[number, number], [number, number]] | null;
  } | null>(null);

  const fittedRef = useRef(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isDisposed = false;

    // Inisialisasi peta MapLibre GL
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: STYLES.liberty,
      center: [109.685, -7.339],
      zoom: 12.5,
      scrollZoom: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Kontrol navigasi (zoom in, zoom out, reset orientasi)
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-left");

    // Popup interaktif saat kursor melayang di wilayah desa
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "desa-maplibre-popup",
    });

    const renderGeoJson = () => {
      const data = dataRef.current;
      if (!data || !map) return;

      // Jika layer desa sudah terpasang di style saat ini, lewati
      if (map.getSource("desa-source")) return;

      try {
        // 1. Tambahkan Layer Batas Kecamatan Banjarmangu
        if (!map.getSource("kecamatan-source")) {
          map.addSource("kecamatan-source", {
            type: "geojson",
            data: data.kec,
          });

          map.addLayer({
            id: "kecamatan-fill-layer",
            type: "fill",
            source: "kecamatan-source",
            paint: {
              "fill-color": "#3b82f6",
              "fill-opacity": 0.04,
            },
          });

          map.addLayer({
            id: "kecamatan-line-layer",
            type: "line",
            source: "kecamatan-source",
            paint: {
              "line-color": "#1e40af",
              "line-width": 2.5,
              "line-dasharray": [3, 2],
            },
          });
        }

        // 2. Tambahkan Layer 17 Wilayah Desa
        map.addSource("desa-source", {
          type: "geojson",
          data: data.desa,
        });

        map.addLayer({
          id: "desa-fill-layer",
          type: "fill",
          source: "desa-source",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.58,
          },
        });

        map.addLayer({
          id: "desa-line-layer",
          type: "line",
          source: "desa-source",
          paint: {
            "line-color": "#ffffff",
            "line-width": 1.5,
          },
        });

        // Fit bounds kamera ke seluruh wilayah kecamatan & desa
        if (!fittedRef.current && data.bounds) {
          fittedRef.current = true;
          map.fitBounds(data.bounds, { padding: 35, duration: 800 });
        }
      } catch {
        // Abaikan jika style belum siap di tick ini, styledata berikutnya akan memicu kembali
      }
    };

    // Event listener styledata: selalu terpanggil setiap style baru dimuat atau diubah
    map.on("styledata", () => {
      renderGeoJson();
    });

    map.on("load", () => {
      renderGeoJson();
    });

    // Interaktivitas hover popup desa: menampilkan Nama Desa & Kepala Desa
    map.on("mousemove", "desa-fill-layer", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (!feature) return;

      const rawName = (feature.properties?.Nama_Desa_ || "") as string;
      const cleanName = rawName.replace(/^Desa\s+/i, "").replace(/^Kel\.\s+/i, "");
      const slug = cleanName.toLowerCase().trim();
      const kades = KEPALA_DESA[slug] || "";

      popup
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:3px;letter-spacing:-0.01em;">
            ${rawName || `Desa ${cleanName}`}
          </div>
          ${
            kades
              ? `
            <div style="display:flex;align-items:center;gap:6px;margin:4px 0 5px 0;padding:3px 7px;border-radius:6px;background:#f0fdf4;border:1px solid #bbf7d0;">
              <span style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.02em;">Kepala Desa:</span>
              <span style="font-size:11.5px;font-weight:600;color:#14532d;">${kades}</span>
            </div>`
              : ""
          }
          <div style="font-family:var(--font-sans);font-size:11px;color:#64748b;line-height:1.3;">
            Kecamatan Banjarmangu · Banjarnegara
          </div>
          <div style="margin-top:4px;font-size:10.5px;color:#2563eb;font-weight:600;">
            Klik untuk profil desa →
          </div>
        `)
        .addTo(map);
    });

    map.on("mouseleave", "desa-fill-layer", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    // Navigasi ke halaman detail desa saat wilayah desa diklik
    map.on("click", "desa-fill-layer", (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const rawName = (feature.properties?.Nama_Desa_ || "") as string;
      const cleanName = rawName.replace(/^Desa\s+/i, "").replace(/^Kel\.\s+/i, "");
      const slug = cleanName.toLowerCase().trim();
      if (slug) {
        router.push(`/desa/${slug}`);
      }
    });

    // Ambil GeoJSON secara paralel
    Promise.all([
      fetch("/peta_kecamatan.geojson").then((r) => r.json()),
      fetch("/peta_desa.geojson").then((r) => r.json()),
    ])
      .then(([kecData, desaData]) => {
        if (isDisposed || !mapInstanceRef.current) return;

        // Filter batas kecamatan Banjarmangu
        const filteredKec: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: (kecData.features || []).filter((f: GeoFeature) => {
            const kec = String(f.properties?.Kecamatan || "");
            return kec.toLowerCase() === "banjarmangu";
          }),
        };

        // Filter 17 desa di kecamatan Banjarmangu
        let colorIdx = 0;
        const filteredDesa: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: (desaData.features || [])
            .filter((f: GeoFeature) => {
              const kec = String(f.properties?.Kecamatan || "");
              return kec.toLowerCase().includes("banjarmangu");
            })
            .map((f: GeoFeature) => {
              const color = DESA_COLORS[colorIdx % DESA_COLORS.length];
              colorIdx++;
              return {
                ...f,
                properties: {
                  ...f.properties,
                  color,
                },
              };
            }),
        };

        const allFeatures = [
          ...(filteredKec.features as GeoFeature[]),
          ...(filteredDesa.features as GeoFeature[]),
        ];
        const bounds = calculateBounds(allFeatures);

        dataRef.current = {
          kec: filteredKec,
          desa: filteredDesa,
          bounds,
        };

        if (map.isStyleLoaded()) {
          renderGeoJson();
        }
      })
      .catch((err) => {
        console.error("Gagal memuat GeoJSON:", err);
      });

    return () => {
      isDisposed = true;
      popup.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [router]);

  const switchStyle = (styleKey: StyleKey) => {
    setActiveStyle(styleKey);
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setStyle(getStyleConfig(styleKey));
  };

  return (
    <div className="relative w-full rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
      {/* Switcher Layer Peta Elegan */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 p-1 rounded-lg bg-white/95 backdrop-blur-md border border-blue-200 shadow-md">
        <button
          type="button"
          onClick={() => switchStyle("liberty")}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            activeStyle === "liberty"
              ? "bg-[#1e40af] text-white shadow-sm"
              : "text-slate-600 hover:text-blue-900 hover:bg-blue-50"
          }`}
        >
          Elegan (Liberty)
        </button>
        <button
          type="button"
          onClick={() => switchStyle("positron")}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            activeStyle === "positron"
              ? "bg-[#1e40af] text-white shadow-sm"
              : "text-slate-600 hover:text-blue-900 hover:bg-blue-50"
          }`}
        >
          Terang (Positron)
        </button>
        <button
          type="button"
          onClick={() => switchStyle("satelit")}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            activeStyle === "satelit"
              ? "bg-[#1e40af] text-white shadow-sm"
              : "text-slate-600 hover:text-blue-900 hover:bg-blue-50"
          }`}
        >
          Citra Satelit
        </button>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-[340px] sm:h-[440px] md:h-[520px]"
      />

      {/* Legenda Wilayah */}
      <div className="absolute bottom-3 right-3 z-10 p-3 rounded-lg bg-white/95 backdrop-blur-md border border-blue-200 shadow-md font-sans">
        <div className="font-serif text-xs font-bold text-[#1e3a8a] mb-1.5 tracking-tight">
          Kec. Banjarmangu
        </div>
        <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-700 font-medium">
          <span className="inline-block w-4 h-3 border-2 border-dashed border-[#1e40af] bg-blue-500/10 rounded-sm" />
          <span>Batas Kecamatan</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-700 font-medium">
          <span className="inline-block w-4 h-3 bg-[#2563eb] border border-white rounded-sm opacity-70" />
          <span>Wilayah Desa</span>
        </div>
      </div>

      <style>{`
        .desa-maplibre-popup .maplibregl-popup-content {
          border-radius: 10px !important;
          border: 1px solid #bfdbfe !important;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12) !important;
          padding: 8px 12px !important;
          background: rgba(255, 255, 255, 0.98) !important;
          backdrop-filter: blur(8px) !important;
        }
        .desa-maplibre-popup .maplibregl-popup-tip {
          border-top-color: #bfdbfe !important;
        }
        .maplibregl-ctrl-group {
          border-radius: 8px !important;
          overflow: hidden !important;
          border: 1px solid #bfdbfe !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
        }
      `}</style>
    </div>
  );
}
