"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Warna untuk desa-desa
const DESA_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
  "#0d9488", "#b91c1c", "#15803d", "#a16207", "#7c3aed",
  "#0e7490", "#be185d",
];

export default function PetaBanjarmangu() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let removed = false;

    // Inisialisasi peta
    const map = L.map(mapRef.current, {
      center: [-7.339, 109.685],
      zoom: 13,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    // Base Map Layers (Sama persis seperti SIMAK Sistemdata)
    const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap kontributor",
      maxZoom: 19,
      referrerPolicy: "no-referrer",
    }).addTo(map);

    const esriLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 19,
      },
    );

    const satelitLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
        maxZoom: 18,
      },
    );

    L.control
      .layers(
        {
          "Peta Standar (OSM)": osmLayer,
          "Esri Street Map": esriLayer,
          "Citra Satelit": satelitLayer,
        },
        {},
        { position: "topright" },
      )
      .addTo(map);

    // Load GeoJSON
    Promise.all([
      fetch("/peta_kecamatan.geojson").then((r) => r.json()),
      fetch("/peta_desa.geojson").then((r) => r.json()),
    ]).then(([kecData, desaData]) => {
      if (removed || !mapInstanceRef.current) return;

      // Filter kecamatan Banjarmangu
      const kecLayer = L.geoJSON(kecData, {
        filter: (feature) =>
          (feature.properties.Kecamatan || "").toLowerCase() === "banjarmangu",
        style: {
          color: "#1e40af",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 0.05,
          dashArray: "8 4",
        },
      }).addTo(map);

      // Filter desa di Kec. Banjarmangu
      let colorIdx = 0;
      const desaLayer = L.geoJSON(desaData, {
        filter: (feature) =>
          (feature.properties.Kecamatan || "").toLowerCase().includes("banjarmangu"),
        style: () => {
          const color = DESA_COLORS[colorIdx % DESA_COLORS.length];
          colorIdx++;
          return {
            color: "#fff",
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.55,
          };
        },
        onEachFeature: (feature, layer) => {
          const nama = (feature.properties.Nama_Desa_ || "").replace(/^Desa\s+/i, "").replace(/^Kel\.\s+/i, "");
          layer.bindTooltip(nama, {
            permanent: false,
            direction: "center",
            className: "desa-label",
          });
          layer.bindPopup(`
            <div style="font-family:var(--font-serif);font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:2px;letter-spacing:-0.01em;">
              ${feature.properties.Nama_Desa_}
            </div>
            <div style="font-family:var(--font-sans);font-size:12px;color:#64748b;line-height:1.4;">
              Kecamatan Banjarmangu<br/>Kabupaten Banjarnegara
            </div>
          `);
        },
      }).addTo(map);

      // Fit bounds ke gabungan kecamatan + desa
      const bounds = kecLayer.getBounds();
      bounds.extend(desaLayer.getBounds());
      map.fitBounds(bounds, { padding: [30, 30] });

      // Legenda
      const legend = (L.control as any)({ position: "bottomright" });
      legend.onAdd = () => {
        const div = L.DomUtil.create("div", "peta-legend");
        div.innerHTML = `
          <div style="background:rgba(255,255,255,0.96);backdrop-filter:blur(8px);padding:10px 14px;border-radius:10px;border:1px solid #bfdbfe;box-shadow:0 4px 12px rgba(0,0,0,0.08);font-family:var(--font-sans);">
            <div style="font-family:var(--font-serif);font-size:13px;font-weight:700;color:#1e3a8a;margin-bottom:6px;letter-spacing:-0.01em;">
              Kec. Banjarmangu
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px;color:#334155;font-weight:500;">
              <span style="display:inline-block;width:16px;height:12px;border:2px dashed #1e40af;background:rgba(59,130,246,.08);border-radius:2px;"></span>
              <span>Batas Kecamatan</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#334155;font-weight:500;">
              <span style="display:inline-block;width:16px;height:12px;background:#2563eb;border:1px solid #fff;border-radius:2px;opacity:.65;"></span>
              <span>Wilayah Desa</span>
            </div>
          </div>
        `;
        return div;
      };
      legend.addTo(map);
    });

    return () => {
      removed = true;
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <>
      <div
        ref={mapRef}
        className="w-full h-[320px] sm:h-[420px] md:h-[500px] rounded-xl border border-[var(--color-border)] overflow-hidden"
      />
      <style>{`
        /* Konsistensi Font Aplikasi pada Seluruh Elemen Leaflet */
        .leaflet-container {
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
        }
        .leaflet-control {
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
        }
        .leaflet-control-layers {
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          border-radius: 10px !important;
          border: 1px solid #bfdbfe !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
          background: rgba(255,255,255,0.96) !important;
          backdrop-filter: blur(8px) !important;
        }
        .leaflet-control-layers-base label {
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
          font-size: 12px !important;
          color: #1e3a8a !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 2px 0 !important;
          cursor: pointer !important;
        }
        .leaflet-control-attribution {
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
          font-size: 11px !important;
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(4px) !important;
          color: #64748b !important;
        }
        .leaflet-control-attribution a {
          color: #1e40af !important;
          font-weight: 500 !important;
        }
        .leaflet-control-zoom {
          border-radius: 8px !important;
          overflow: hidden !important;
          border: 1px solid #bfdbfe !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
        }
        .leaflet-control-zoom a {
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
          font-weight: 700 !important;
          color: #1e3a8a !important;
          background: rgba(255,255,255,0.95) !important;
        }
        .desa-label {
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
          background: rgba(255,255,255,0.92) !important;
          border: 1px solid #bfdbfe !important;
          border-radius: 6px !important;
          padding: 3px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #1e3a8a !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
          white-space: nowrap !important;
          backdrop-filter: blur(4px) !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          border: 1px solid #bfdbfe !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.12) !important;
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
        }
        .leaflet-popup-content {
          font-family: var(--font-sans), "Roboto", system-ui, -apple-system, sans-serif !important;
          font-size: 12px !important;
          line-height: 1.5 !important;
          margin: 12px 14px !important;
        }
      `}</style>
    </>
  );
}
