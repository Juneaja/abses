import React, { useState, useEffect, useRef } from 'react';
import { Employee, AttendanceRecord, GeofenceConfig } from '../types';
import { Camera, RefreshCw, LogIn, LogOut, CheckCircle, Clock, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';

interface EmployeeCheckInProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: GeofenceConfig;
  distance: number | null;
  isWithin: boolean;
  onClockIn: (
    employeeId: string,
    notes: string,
    selfieUrl: string | null,
    shiftId?: 'pagi' | 'siang' | 'malam' | 'pt'
  ) => void;
  onClockOut: (employeeId: string) => void;
  currentSystemTime: Date;
  loggedInEmployee?: Employee | null;
}

export default function EmployeeCheckIn({
  employees,
  attendanceRecords,
  config,
  distance,
  isWithin,
  onClockIn,
  onClockOut,
  currentSystemTime,
  loggedInEmployee,
}: EmployeeCheckInProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || "");
  const [selectedShiftId, setSelectedShiftId] = useState<'pagi' | 'siang' | 'malam' | 'pt'>('pagi');
  const [notes, setNotes] = useState<string>("");
  const [cameraPermission, setCameraPermission] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Sync to verified logged in employee profile auto-selection
  useEffect(() => {
    if (loggedInEmployee) {
      setSelectedEmpId(loggedInEmployee.id);
    }
  }, [loggedInEmployee]);
  const widgetCameraRef = useRef<HTMLVideoElement>(null);

  // States for visual simulated camera scanning fallback
  const [isSimulatingCamera, setIsSimulatingCamera] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);

  // Fallback preset snapshots for quick testing
  const fallbackSelfies = [
    { name: "Selfie Profesional 1", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150" },
    { name: "Selfie Profesional 2", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" },
    { name: "Selfie Medis 1", url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150" },
    { name: "Selfie Medis 2", url: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=150" },
  ];
  const [selectedFallbackSelfie, setSelectedFallbackSelfie] = useState<string>(fallbackSelfies[0].url);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  // Find attendance record for selected employee today
  const todayDateStr = currentSystemTime.toISOString().split('T')[0];
  const todayRecord = attendanceRecords.find(
    rec => rec.employeeId === selectedEmpId && rec.date === todayDateStr
  );

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Safely bind active camera stream to video tag as soon as the element mounts/renders
  useEffect(() => {
    if (cameraStream && widgetCameraRef.current) {
      widgetCameraRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, widgetCameraRef.current]);

  // Handle setting active camera stream
  const startCamera = async () => {
    setCapturedPhoto(null);
    setIsSimulatingCamera(false);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } });
        setCameraStream(stream);
        setCameraPermission(true);
        if (widgetCameraRef.current) {
          widgetCameraRef.current.srcObject = stream;
        }
      } else {
        console.warn("Browser tidak mendukung web camera direct access.");
        setCameraPermission(false);
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable. Using fallbacks.", err);
      setCameraPermission(false);
    }
  };

  const capturePhoto = () => {
    if (widgetCameraRef.current && cameraStream) {
      const canvas = document.createElement('canvas');
      canvas.width = widgetCameraRef.current.videoWidth || 320;
      canvas.height = widgetCameraRef.current.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(widgetCameraRef.current, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg');
        setCapturedPhoto(photoData);
        // Stop stream
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
  };

  // Run beautiful visual simulation scan countdown as alternative to raw stream
  const runCameraSimulation = () => {
    setCapturedPhoto(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsSimulatingCamera(true);
    setSimulationProgress(0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setSimulationProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        // Snap! Use the selected fallback
        setCapturedPhoto(selectedFallbackSelfie);
        setIsSimulatingCamera(false);
      }
    }, 150);
  };

  const handleClockInAction = () => {
    const finalPhoto = capturedPhoto || selectedFallbackSelfie;
    onClockIn(selectedEmpId, notes, finalPhoto, selectedShiftId);
    setNotes("");
    setCapturedPhoto(null);
  };

  // Status checks
  const isCheckedIn = !!todayRecord?.clockInTime;
  const isCheckedOut = !!todayRecord?.clockOutTime;

  const availableShifts = config.shifts || [
    { id: 'pagi' as const, name: 'Shift Pagi', checkInTime: '08:00', checkOutTime: '17:00' },
    { id: 'siang' as const, name: 'Shift Siang', checkInTime: '14:00', checkOutTime: '22:00' },
    { id: 'malam' as const, name: 'Shift Malam', checkInTime: '22:00', checkOutTime: '08:00' },
    { id: 'pt' as const, name: 'Shift PT', checkInTime: '07:00', checkOutTime: '19:00' }
  ];

  const activeShift = isCheckedIn 
    ? (availableShifts.find(s => s.id === todayRecord?.shiftId) || { id: 'pagi' as const, name: todayRecord?.shiftName || 'Lainnya', checkInTime: config.checkInTime, checkOutTime: config.checkOutTime })
    : (availableShifts.find(s => s.id === selectedShiftId) || { id: 'pagi' as const, name: 'Shift Pagi', checkInTime: config.checkInTime, checkOutTime: config.checkOutTime });

  // Render digital clock UI
  const formatDigitalTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT: Identity Switcher & Clock Visual */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Identity Selector */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
            {loggedInEmployee ? "Verified Employee Profile" : "Select Employee Profile (Simulation)"}
          </label>
          <div className="relative">
            <select
              value={selectedEmpId}
              disabled={!!loggedInEmployee}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setCapturedPhoto(null);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm font-semibold select-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {employees.filter(emp => emp.role === 'employee').map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.position})
                </option>
              ))}
            </select>
          </div>

          {loggedInEmployee && (
            <div className="mt-2 text-[10.5px] font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Akun Terverifikasi via Firebase Auth
            </div>
          )}

          {selectedEmployee && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-4">
              <img
                src={selectedEmployee.avatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120"}
                alt={selectedEmployee.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-block">NIP: {selectedEmployee.nip}</span>
                <h4 className="text-sm font-bold text-slate-800 truncate mt-1">{selectedEmployee.name}</h4>
                <p className="text-xs text-slate-500 truncate">{selectedEmployee.position}</p>
              </div>
            </div>
          )}
        </div>

        {/* Live Digital Clock */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <Clock className="w-8 h-8 text-emerald-400 mb-2 animate-pulse" />
          <span className="text-base font-bold text-emerald-300 tracking-wider">JAM KERJA REAL-TIME</span>
          
          <span className="text-4xl font-black font-mono tracking-tight text-white mt-1.5 tabular-nums">
            {formatDigitalTime(currentSystemTime)}
          </span>
          
          <span className="text-[12px] text-slate-400 font-medium mt-1">
            {formatFullDate(currentSystemTime)}
          </span>

          <div className="border-t border-slate-800/80 w-full mt-4 pt-3.5 text-center text-xs">
            <span className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider block mb-1">
              Jadwal: {activeShift.name}
            </span>
            <div className="flex gap-4 justify-around">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Mulai Kerja</span>
                <span className="font-bold text-slate-300 font-mono text-[11px] block mt-0.5">{activeShift.checkInTime} WIB</span>
              </div>
              <div className="border-l border-slate-800/60 h-6 mt-1" />
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Batas Pulang</span>
                <span className="font-bold text-slate-300 font-mono text-[11px] block mt-0.5">{activeShift.checkOutTime} WIB</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT: Check-In Dashboard Panel */}
      <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        
        <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <LogIn className="w-6 h-6 text-emerald-600" />
          Portal Presensi Karyawan
        </h3>

        {/* Step-by-Step interactive clock setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Section A: Selfie Camera Simulation */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Langkah 1: Swafoto Kehadiran (Kamera Aktif)</span>
            
            <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center p-2 text-white shadow-inner">
              
              {/* If camera is scanning in simulation mode */}
              {isSimulatingCamera ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 relative">
                  {/* Camera Grid lines overlay */}
                  <div className="absolute inset-0 border border-emerald-500/10 grid grid-cols-3 grid-rows-3 pointer-events-none" />
                  {/* Outer crop marks */}
                  <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                  
                  {/* Animated scanning bar overlay */}
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399] transition-all duration-150" 
                    style={{ top: `${simulationProgress}%` }} 
                  />
                  
                  <Camera className="w-8 h-8 text-emerald-400 mb-2 animate-pulse" />
                  <p className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-widest animate-pulse">Menghubungkan Kamera...</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">Mengambil Swafoto Keamanan...</p>
                  
                  <div className="w-40 bg-slate-800 h-1 rounded-full overflow-hidden mt-3 border border-slate-700/50">
                    <div className="bg-emerald-400 h-full transition-all duration-150" style={{ width: `${simulationProgress}%` }} />
                  </div>
                </div>
              ) : cameraStream && !capturedPhoto ? (
                <>
                  <video
                    ref={widgetCameraRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-md"
                  />
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <Camera className="w-4 h-4" /> Ambil Swafoto
                  </button>
                </>
              ) : capturedPhoto ? (
                /* Capture Preview */
                <>
                  <img
                    src={capturedPhoto}
                    alt="Captured Selfie"
                    className="w-full h-full object-cover rounded-md opacity-90"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-600 text-[10px] font-bold text-white px-2.5 py-1 rounded-full border border-emerald-400 shadow-sm animate-pulse">Swafoto Siap ✓</div>
                  
                  <div className="absolute bottom-3 inset-x-0 flex justify-center px-4">
                    <button
                      onClick={startCamera}
                      className="bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-[11px] px-4 py-2 rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Ambil Ulang Swafoto
                    </button>
                  </div>
                </>
              ) : (
                /* Lightweight landing block */
                <div className="text-center p-6 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-slate-800/80 rounded-full flex items-center justify-center mb-3">
                    <Camera className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">Kamera Swafoto Mandiri</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-normal">
                    Ambil swafoto secara langsung untuk memvalidasi presensi medis Anda.
                  </p>
                  
                  <div className="mt-4 flex flex-col sm:flex-row gap-2.5 justify-center items-center w-full max-w-[280px]">
                    <button
                      onClick={startCamera}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-emerald-500"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" /> Buka Kamera
                    </button>
                  </div>
 
                  <button
                    onClick={runCameraSimulation}
                    className="mt-3 text-[10.5px] text-slate-400 hover:text-emerald-400 font-bold flex items-center justify-center gap-1 mx-auto uppercase tracking-wider transition-colors"
                  >
                    ⚡ Jalankan Simulasi Kamera Instan
                  </button>
                </div>
              )}
            </div>

            {/* Simulated/Mock Selfie Selectors */}
            {!cameraStream && !capturedPhoto && (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Simulasi Selfie Cadangan:</span>
                <div className="grid grid-cols-4 gap-2">
                  {fallbackSelfies.map((photo, spi) => (
                    <button
                      key={spi}
                      onClick={() => setSelectedFallbackSelfie(photo.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedFallbackSelfie === photo.url ? 'border-emerald-500 scale-102 ring-2 ring-emerald-500/20' : 'border-transparent opacity-75 hover:opacity-100'}`}
                    >
                      <img src={photo.url} referrerPolicy="no-referrer" alt={photo.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-slate-900/40 text-[7px] text-center text-white py-0.5 truncate">
                        {photo.name.replace("Selfie ", "")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section B: Geofence Verification & Action buttons */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Langkah 2: Status Absensi & Geofencing</span>
              
              <div className="space-y-3">
                {/* Geofence Status Badge */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${isWithin ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <MapPin className={`w-5 h-5 shrink-0 mt-0.5 ${isWithin ? 'text-emerald-600' : 'text-rose-600 animate-bounce'}`} />
                  <div>
                    <span className={`text-sm font-bold block ${isWithin ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {isWithin ? "Validasi Geofence Berhasil" : "Validasi Geofence Gagal"}
                    </span>
                    <span className="text-xs text-slate-500 leading-relaxed block mt-0.5">
                      {isWithin 
                        ? `Posisi Anda ${distance}m di dalam jangkauan Klinik Sartika Lamongan (Jl. Lamongrejo No. 100). Tombol absen aktif.` 
                        : `Posisi Anda ${distance !== null ? `${distance}m` : 'tidak terdeteksi'} di luar batas jangkauan (maks ${config.radius}m). Absensi terkunci.`}
                    </span>
                  </div>
                </div>

                {/* Today Selected Status Tracker */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Presensi Hari Ini:</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white px-3 py-2 border border-slate-100 rounded-lg flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Jam Masuk</span>
                        <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
                          {isCheckedIn ? todayRecord?.clockInTime : "Belum Absen"}
                        </span>
                        {isCheckedIn && (
                          <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded mt-0.5 inline-block ${todayRecord?.checkInStatus === 'ontime' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {todayRecord?.checkInStatus === 'ontime' ? "Tepat Waktu" : "Terlambat"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-white px-3 py-2 border border-slate-100 rounded-lg flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isCheckedOut ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Jam Pulang</span>
                        <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
                          {isCheckedOut ? todayRecord?.clockOutTime : "Belum Absen"}
                        </span>
                        {isCheckedOut && (
                          <span className="text-[8.5px] bg-indigo-100 text-indigo-800 font-bold px-1 py-0.2 rounded mt-0.5 inline-block">
                            {todayRecord?.checkOutStatus === 'normal' ? "Normal" : "Pulang Cepat"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SELECT SHIFT OPTION (Only display if not checked-in so they can choose, otherwise display checked-in shift name) */}
                {!isCheckedIn ? (
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Pilih Shift Kerja Hari Ini:</span>
                    <div className="grid grid-cols-2 gap-2">
                      {availableShifts.map((shift) => {
                        const isSel = selectedShiftId === shift.id;
                        return (
                          <button
                            type="button"
                            key={shift.id}
                            onClick={() => setSelectedShiftId(shift.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSel 
                                ? 'bg-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/10' 
                                : 'bg-transparent border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[11px] font-bold ${isSel ? 'text-emerald-700' : 'text-slate-600'}`}>{shift.name}</span>
                              {isSel && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            </div>
                            <span className="text-[9.5px] text-slate-400 font-mono block mt-0.5">
                              {shift.checkInTime} - {shift.checkOutTime}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block">Shift Aktif</span>
                      <span className="text-xs font-bold text-slate-800">{activeShift.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono font-bold bg-white border border-slate-200/60 px-2 py-1 rounded">
                      {activeShift.checkInTime} - {activeShift.checkOutTime}
                    </span>
                  </div>
                )}

                {/* Notes Input Field */}
                {!isCheckedIn && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Catatan Keterangan Kerja (Optional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Shift Pagi, Keperluan Medis, dll."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Buttons Row with dynamic disabling */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              
              {/* CLOCK IN BUTTON */}
              <button
                disabled={isCheckedIn || !isWithin}
                onClick={handleClockInAction}
                className={`py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 outline-none ${isCheckedIn ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200' : !isWithin ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100' : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-700 hover:to-teal-800 active:scale-98 ring-4 ring-emerald-500/10'}`}
              >
                <LogIn className="w-4 h-4" />
                {isCheckedIn ? "Sudah Clock-In Masuk" : "CLOCK-IN MASUK"}
              </button>

              {/* CLOCK OUT BUTTON */}
              <button
                disabled={!isCheckedIn || isCheckedOut || !isWithin}
                onClick={() => onClockOut(selectedEmpId)}
                className={`py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 outline-none ${!isCheckedIn ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100' : isCheckedOut ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200' : !isWithin ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100' : 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white hover:from-indigo-700 hover:to-blue-800 active:scale-98 ring-4 ring-indigo-500/10'}`}
              >
                <LogOut className="w-4 h-4" />
                {isCheckedOut ? "Sudah Clock-Out Pulang" : "CLOCK-OUT PULANG"}
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
