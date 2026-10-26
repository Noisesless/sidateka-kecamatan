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

    // 1. CARTO Voyager — Berbasis data OpenStreetMap kontributor (CDN cepat, bebas blokir 403 Tile Usage Policy)
    const osmVoyager = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      },
    );

    // 2. OpenStreetMap Klasik (via mirror OSM-France — bebas dari blokir 403 volunteer servers OSM Foundation)
    const osmClassic = L.tileLayer(
      "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      {
        subdomains: "abc",
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      },
    );

    // 3. Citra Satelit (Esri World Imagery)
    const esriSatelit = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
        maxZoom: 18,
      },
    );

    // Default aktif: CARTO Voyager (OpenStreetMap kontributor)
    osmVoyager.addTo(map);

    L.control
      .layers(
        {
          "OpenStreetMap (Voyager)": osmVoyager,
          "OpenStreetMap (Klasik)": osmClassic,
          "Citra Satelit": esriSatelit,
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
          layer.bindPopup(`<strong>${feature.properties.Nama_Desa_}</strong><br/>Kec. Banjarmangu<br/>Kab. Banjarnegara`);
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
          <div style="background:#fff;padding:10px 14px;border-radius:8px;box-shadow:0 1px 5px rgba(0,0,0,.2);font-size:12px;">
            <div style="font-weight:700;margin-bottom:6px;">Kec. Banjarmangu</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="display:inline-block;width:16px;height:12px;border:2px dashed #1e40af;background:rgba(59,130,246,.05);border-radius:2px;"></span>
              <span>Batas Kecamatan</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:16px;height:12px;background:#2563eb;border:1px solid #fff;border-radius:2px;opacity:.55;"></span>
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
        className="w-full rounded-xl border border-[var(--color-border)] overflow-hidden"
        style={{ height: "500px" }}
      />
      <style>{`
        .desa-label {
          background: rgba(255,255,255,.85);
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0,0,0,.15);
          white-space: nowrap;
        }
        .leaflet-popup-content {
          font-size: 13px;
          line-height: 1.5;
        }
      `}</style>
    </>
  );
}
