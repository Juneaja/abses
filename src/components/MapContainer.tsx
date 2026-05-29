import React from 'react';
import { GeofenceConfig } from '../types';
import { Crosshair, MapPin, Radio, Compass, AlertCircle } from 'lucide-react';

interface MapContainerProps {
  config: GeofenceConfig;
  userLat: number;
  userLng: number;
  distance: number | null;
  isWithin: boolean;
  onSetSimulationPreset: (lat: number, lng: number) => void;
}

export default function MapContainer({
  config,
  userLat,
  userLng,
  distance,
  isWithin,
  onSetSimulationPreset,
}: MapContainerProps) {
  // We'll calculate a relative XY position for the user on our vector map.
  // Map represents a 300m x 300m square around the clinic.
  // Clinic is at the center of the viewport (x: 150, y: 150)
  
  // Scale factor: 1 meter = 0.8 pixels (geofence radius 50m = 40px circle)
  const scale = 0.8;
  const maxDistanceDisplayed = 150; // meters shown in map bounds
  
  // Calculate relative offsets
  const latDiff = userLat - config.latitude;
  const lngDiff = userLng - config.longitude;
  
  // Approximately 1 degree of lat = 111,000 meters
  // Approximately 1 degree of lng = 111,000 * cos(-7.12) = 110,130 meters
  const deltaY = latDiff * 111000;
  const deltaX = lngDiff * 110130;
  
  // Bound the offsets to avoid dots flying off-screen
  const boundedX = Math.max(-maxDistanceDisplayed, Math.min(maxDistanceDisplayed, deltaX));
  const boundedY = Math.max(-maxDistanceDisplayed, Math.min(maxDistanceDisplayed, deltaY));
  
  // Convert to SVG coordinates (origin 150, 150)
  // SVG Y goes down, so positive deltaY (north) means smaller Y (up)
  const userX = 150 + boundedX * scale;
  const userY = 150 - boundedY * scale;

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
            Radar Lokasi Geofencing Real-Time
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Jl. Lamongrejo No. 100 Lamongan • Jangkauan Radius: <span className="font-semibold text-emerald-300">{config.radius}m</span>
          </p>
        </div>
      </div>

      {/* Main Map Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* SVG Spaced Area */}
        <div className="md:col-span-7 bg-slate-950 rounded-xl border border-slate-800/60 p-4 aspect-square flex items-center justify-center relative overflow-hidden group">
          
          {/* Compass Rose background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
            <Compass className="w-72 h-72 animate-spin-slow text-slate-400" />
          </div>

          <svg viewBox="0 0 300 300" className="w-full h-full max-w-[320px] select-none">
            {/* Grid Circles */}
            <circle cx="150" cy="150" r="140" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx="150" cy="150" r="100" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx="150" cy="150" r="60" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
            
            {/* Cross Lines */}
            <line x1="150" y1="10" x2="150" y2="290" stroke="#1e293b" strokeWidth="1.5" />
            <line x1="10" y1="150" x2="290" y2="150" stroke="#1e293b" strokeWidth="1.5" />
            
            {/* Simulated streets of Lamongan around Jl Lamongrejo */}
            {/* Jl. Lamongrejo (Vertical) */}
            <path d="M 125,0 L 125,300 M 175,0 L 175,300" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="4,2" className="opacity-40" />
            <text x="110" y="30" fill="#475569" fontSize="7" transform="rotate(-90 110 30)" className="font-mono tracking-widest font-bold">JL. LAMONGREJO</text>
            
            {/* Jl. KH Dahlan / Gangs (Horizontal intersecting) */}
            <path d="M 0,110 L 300,110 M 0,170 L 300,170" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="4,2" className="opacity-40" />
            <text x="5" y="102" fill="#475569" fontSize="7" className="font-mono tracking-widest font-bold">JL. K.H. AHMAD DAHLAN</text>

            {/* Geofence Safe Radius Zone - Styled green when user is inside, orange when outside */}
            <circle 
              cx="150" 
              cy="150" 
              r={config.radius * scale} 
              fill={isWithin ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.04)"} 
              stroke={isWithin ? "#10b981" : "#f59e0b"} 
              strokeWidth="2" 
              strokeDasharray={isWithin ? "none" : "4,2"} 
              className="transition-all duration-500"
            />
            {/* Inner warning radius halo if outside */}
            {!isWithin && (
              <circle cx="150" cy="150" r={config.radius * scale + 15} fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,5" className="opacity-30" />
            )}

            {/* Central Clinic Pin */}
            <g transform="translate(150, 150)" className="cursor-pointer">
              <circle cx="0" cy="0" r="16" fill="rgba(16, 185, 129, 0.2)" className="animate-ping" />
              <circle cx="0" cy="0" r="8" fill="#10b981" className="stroke-slate-950 stroke-2" />
              <path d="M-4 0 H4 M0 -4 V4" stroke="white" strokeWidth="2.5" />
            </g>
            <text x="160" y="142" fill="#10b981" fontSize="9" className="font-sans font-bold tracking-tight">Klinik Sartika</text>

            {/* User Indicator Connecting Line (Radar sweep effect/distance) */}
            {distance !== null && (
              <line 
                x1="150" 
                y1="150" 
                x2={userX} 
                y2={userY} 
                stroke={isWithin ? "#10b981" : "#ef4444"} 
                strokeWidth="1.5" 
                strokeDasharray="2,3" 
                className="opacity-70 transition-all duration-300"
              />
            )}

            {/* Glowing User Pin */}
            <g transform={`translate(${userX}, ${userY})`} className="transition-all duration-300">
              <circle cx="0" cy="0" r="12" fill={isWithin ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"} className="animate-pulse" />
              <circle cx="0" cy="0" r="6" fill={isWithin ? "#10b981" : "#ef4444"} className="stroke-white stroke-2" />
              <polygon points="0,-4 3,2 -3,2" fill="white" transform="rotate(45)" className="scale-75" />
            </g>
            <text x={userX + 10} y={userY - 6} fill={isWithin ? "#34d399" : "#f87171"} fontSize="8" className="font-mono font-bold transition-all duration-300">Anda</text>
          </svg>

          {/* Location status overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-lg backdrop-blur-md">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">GPS Status</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isWithin ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className={`text-[11px] font-bold ${isWithin ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isWithin ? "Dalam Jangkauan" : "Luar Jangkauan"}
              </span>
            </div>
          </div>
        </div>

        {/* Info & Presets Panel */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4">
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex-1 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-emerald-500" />
              Metrik Geofencing
            </h4>
            
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 text-xs block">Jarak ke Klinik</span>
                <span className={`text-2xl font-black ${isWithin ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {distance !== null ? `${distance} meter` : 'Mendeteksi GPS...'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Maksimum Batas: <b className="text-slate-200">{config.radius}m</b> dari titik pusat
                </span>
              </div>
              
              <div className="border-t border-slate-800/80 pt-3">
                <span className="text-slate-400 text-xs block">Koordinat Anda</span>
                <span className="font-mono text-xs text-slate-200 block truncate mt-0.5">
                  LAT: {userLat.toFixed(6)}
                </span>
                <span className="font-mono text-xs text-slate-200 block truncate">
                  LNG: {userLng.toFixed(6)}
                </span>
              </div>

              <div className={`p-3 rounded-lg border flex gap-3 ${isWithin ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/5 border-amber-500/20 text-amber-300'}`}>
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">{isWithin ? 'BISA MELAKUKAN PRESENSI' : 'PRESENSI DIKUNCI'}</span>
                  <span className="text-[10.5px] text-slate-400 leading-relaxed block mt-0.5">
                    {isWithin 
                      ? 'Posisi Anda memenuhi batas geofencing Klinik Sartika. Kamera selfie dan tombol absen telah aktif.' 
                      : 'Posisi Anda terlalu jauh dari Jl. Lamongrejo No. 100. Posisikan slider GPS di dekat pusat untuk clock-in.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
