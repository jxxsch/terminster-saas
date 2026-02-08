'use client'

import { useEffect, useRef } from 'react'

interface Shop {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
}

interface ShopsMapProps {
  shops: Shop[]
  primaryColor?: string
}

export default function ShopsMap({ shops, primaryColor = '#D4AF37' }: ShopsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  // Filter shops with valid coordinates
  const validShops = shops.filter(s => s.latitude && s.longitude)

  if (validShops.length === 0) {
    return (
      <div className="bg-zinc-800 rounded-lg h-48 flex items-center justify-center text-muted text-sm">
        Keine Standorte mit Koordinaten
      </div>
    )
  }

  // Calculate center and bounds
  const lats = validShops.map(s => s.latitude!)
  const lngs = validShops.map(s => s.longitude!)
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2

  // Calculate appropriate zoom level based on spread
  const latSpread = Math.max(...lats) - Math.min(...lats)
  const lngSpread = Math.max(...lngs) - Math.min(...lngs)
  const maxSpread = Math.max(latSpread, lngSpread)

  let zoom = 11
  if (maxSpread > 0.5) zoom = 9
  else if (maxSpread > 0.2) zoom = 10
  else if (maxSpread > 0.1) zoom = 11
  else if (maxSpread > 0.05) zoom = 12
  else zoom = 13

  // Create markers string for static map URL
  const markers = validShops.map((shop, i) =>
    `${shop.latitude},${shop.longitude}`
  ).join('|')

  // OpenStreetMap embed URL with markers
  const bbox = `${Math.min(...lngs) - 0.02},${Math.min(...lats) - 0.02},${Math.max(...lngs) + 0.02},${Math.max(...lats) + 0.02}`

  return (
    <div className="space-y-3">
      {/* Interactive Map using iframe */}
      <div className="relative rounded-lg overflow-hidden h-48 bg-zinc-800">
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
          className="w-full h-full border-0"
          style={{ filter: 'invert(90%) hue-rotate(180deg)' }}
        />

        {/* Overlay with shop pins (simulated) */}
        <div className="absolute inset-0 pointer-events-none">
          {validShops.map((shop, i) => {
            // Calculate relative position (rough approximation)
            const relX = ((shop.longitude! - (Math.min(...lngs) - 0.02)) / (Math.max(...lngs) - Math.min(...lngs) + 0.04)) * 100
            const relY = 100 - ((shop.latitude! - (Math.min(...lats) - 0.02)) / (Math.max(...lats) - Math.min(...lats) + 0.04)) * 100

            return (
              <div
                key={shop.id}
                className="absolute transform -translate-x-1/2 -translate-y-full"
                style={{ left: `${relX}%`, top: `${relY}%` }}
                title={shop.name}
              >
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-black"
                  style={{ backgroundColor: primaryColor }}
                >
                  {i + 1}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {validShops.map((shop, i) => (
          <div key={shop.id} className="flex items-center gap-1">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-black"
              style={{ backgroundColor: primaryColor }}
            >
              {i + 1}
            </span>
            <span className="text-muted truncate max-w-[100px]" title={shop.name}>
              {shop.address || shop.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
