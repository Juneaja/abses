import { Employee, AttendanceRecord, GeofenceConfig } from '../types';

export const DEFAULT_GEOFENCE: GeofenceConfig = {
  officeName: "Klinik Sartika Lamongan",
  address: "Jl. Lamongrejo No. 100 Lamongan, Jawa Timur",
  latitude: -7.121118,
  longitude: 112.418290,
  radius: 50, // default 50 meters
  checkInTime: "08:00",
  checkOutTime: "17:00",
  lateToleranceMinutes: 15,
  shifts: [
    { id: 'pagi', name: 'Shift Pagi', checkInTime: '08:00', checkOutTime: '17:00' },
    { id: 'siang', name: 'Shift Siang', checkInTime: '14:00', checkOutTime: '22:00' },
    { id: 'malam', name: 'Shift Malam', checkInTime: '22:00', checkOutTime: '08:00' },
    { id: 'pt', name: 'Shift PT', checkInTime: '07:00', checkOutTime: '19:00' }
  ]
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "EMP001",
    name: "dr. Hendra Wijaya, Sp.PD",
    nip: "198810242015031002",
    role: "employee",
    position: "Dokter Spesialis Penyakit Dalam",
    email: "hendra.sp@sartikaclinic.id",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120",
    joinDate: "2018-03-01",
  },
  {
    id: "EMP002",
    name: "Rini Astuti, Amd.Kep",
    nip: "199408122018112003",
    role: "employee",
    position: "Perawat Senior (Kepala Shift)",
    email: "rini.astuti@sartikaclinic.id",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120",
    joinDate: "2019-11-15",
  },
  {
    id: "EMP003",
    name: "Budi Santoso",
    nip: "199011032014021001",
    role: "employee",
    position: "Staff Administrasi & Pendaftaran",
    email: "budi.adm@sartikaclinic.id",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    joinDate: "2015-02-10",
  },
  {
    id: "EMP004",
    name: "Dewi Lestari, S.Farm, Apt",
    nip: "199205162021052004",
    role: "employee",
    position: "Apoteker Pertama",
    email: "dewi.apt@sartikaclinic.id",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
    joinDate: "2021-05-01",
  },
  {
    id: "EMP005",
    name: "Cahyo Utomo",
    nip: "199602282022091005",
    role: "employee",
    position: "Staff Umum & Facility Management",
    email: "cahyo.umum@sartikaclinic.id",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    joinDate: "2022-09-01",
  },
  {
    id: "ADM001",
    name: "Siti Sartika, M.Kes",
    nip: "197804152005012001",
    role: "admin",
    position: "Pimpinan / Manager Klinik",
    email: "dr.siti@sartikaclinic.id",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=120",
    joinDate: "2010-01-01",
  }
];

// Generate rich attendance data for May 2026 (May 1 to May 27)
export function generateMockAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const employees = INITIAL_EMPLOYEES.filter(emp => emp.role === 'employee');
  
  // Set current year and month for mocking (May 2026)
  const totalDays = 27; // May 1 to May 27, 2026
  
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = `2026-05-${dayStr}`;
    
    // Skip Sundays for clinic rest days, or make some minimal staffing
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday
    if (dayOfWeek === 0) continue;
    
    employees.forEach((emp) => {
      // 5% chance of being absent/sick/leave
      const attendanceRoll = Math.random();
      
      let clockInTime: string | null = null;
      let clockOutTime: string | null = null;
      let checkInStatus: 'ontime' | 'late' | 'absent' | 'leave' = 'ontime';
      let checkOutStatus: 'normal' | 'early' | 'none' = 'normal';
      let notes = "";
      let isWithinGeofence = true;
      let distanceToGeofence = Math.floor(Math.random() * 25); // distance inside fence (0 - 25m)
      
      if (attendanceRoll < 0.04) {
        // Leave / Izin
        checkInStatus = 'leave';
        notes = "Izin Sakit dengan Surat Dokter";
      } else if (attendanceRoll < 0.07) {
        // Absent / Alpha
        checkInStatus = 'absent';
        notes = "Tanpa Keterangan";
      } else {
        // Normal Attendance
        const inHour = 7;
        let inMin = Math.floor(Math.random() * 60); // 7:00 to 7:59 (on time)
        
        // 15% chance of being late
        if (Math.random() < 0.15) {
          const lateMinutes = Math.floor(Math.random() * 45) + 16; // 16 to 60 minutes late
          const totalInMinutes = 8 * 60 + lateMinutes;
          const h = Math.floor(totalInMinutes / 60);
          const m = totalInMinutes % 60;
          clockInTime = `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${Math.floor(Math.random() * 50) + 10}`;
          checkInStatus = 'late';
          const lateReasons = [
            "Pecah ban di jl. Panglima Sudirman",
            "Mengantar anak sekolah dasar",
            "Jalanan macet karena pasar tumpah",
            "Hujan deras di area Karanggeneng",
            "Keperluan darurat keluarga"
          ];
          notes = lateReasons[Math.floor(Math.random() * lateReasons.length)];
        } else {
          // On time
          clockInTime = `07:${inMin < 10 ? '0' + inMin : inMin}:${Math.floor(Math.random() * 50) + 10}`;
          checkInStatus = 'ontime';
        }
        
        // Clock out (normally after 17:00)
        // 10% chance of early clock out
        if (Math.random() < 0.08) {
          const earlyMin = Math.floor(Math.random() * 30) + 1; // 1 to 30 mins early
          const totalOutMin = 17 * 60 - earlyMin;
          const h = Math.floor(totalOutMin / 60);
          const m = totalOutMin % 60;
          clockOutTime = `${h}:${m < 10 ? '0' + m : m}:${Math.floor(Math.random() * 50) + 10}`;
          checkOutStatus = 'early';
        } else {
          const leaveMin = Math.floor(Math.random() * 45); // 17:00 to 17:45
          clockOutTime = `17:${leaveMin < 10 ? '0' + leaveMin : leaveMin}:${Math.floor(Math.random() * 50) + 10}`;
          checkOutStatus = 'normal';
        }
        
        // Minimal simulated coordinates very close to Klinik Sartika
        // -7.121118, 112.418290
        const deltaLat = (Math.random() - 0.5) * 0.0003; // ~30m
        const deltaLng = (Math.random() - 0.5) * 0.0003; // ~30m
        
        // 3% chance of being out of range (simulated fake attempt caught by geofence)
        if (Math.random() < 0.03) {
          isWithinGeofence = false;
          distanceToGeofence = Math.floor(Math.random() * 400) + 150; // 150m to 550m away
          notes = "Mencoba absen di luar batas jangkauan (sistem menolak otomatis)";
        }
      }
      
      const selfieUrls = [
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
      ];
      
      records.push({
        id: `REC-${emp.id}-${date}`,
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        clockInTime,
        clockOutTime,
        latitude: clockInTime ? (DEFAULT_GEOFENCE.latitude + (Math.random() - 0.5) * 0.0001) : null,
        longitude: clockInTime ? (DEFAULT_GEOFENCE.longitude + (Math.random() - 0.5) * 0.0001) : null,
        distanceToGeofence: clockInTime ? distanceToGeofence : null,
        isWithinGeofence,
        checkInStatus,
        checkOutStatus,
        notes,
        selfie: clockInTime ? selfieUrls[Math.floor(Math.random() * selfieUrls.length)] : null,
      });
    });
  }
  
  return records;
}

export const INITIAL_LOGS = [
  { id: "log-1", timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), message: "dr. Hendra Wijaya melakukan Clock-In (Tepat Waktu)", type: "attendance" as const, employeeName: "dr. Hendra Wijaya, Sp.PD" },
  { id: "log-2", timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), message: "Rini Astuti melakukan Clock-In (Tepat Waktu)", type: "attendance" as const, employeeName: "Rini Astuti, Amd.Kep" },
  { id: "log-3", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), message: "Budi Santoso terdeteksi berada di luar geofencing Klinik Sartika (radius 184 meter)", type: "warning" as const, employeeName: "Budi Santoso" },
  { id: "log-4", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), message: "Konfigurasi Geofencing diperbarui oleh Siti Sartika", type: "info" as const },
];
