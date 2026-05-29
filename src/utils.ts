// Haversine Formula to compute distance in meters between two coordinates
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

// Format duration into readable hours/minutes
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return "-";
  return timeStr.substring(0, 5); // Returns HH:MM instead of HH:MM:ss
}

// Convert AttendanceRecord array to CSV and trigger browser download
export function exportToCSV(data: any[], fileName: string) {
  const headers = [
    "No",
    "ID Karyawan",
    "Nama Karyawan",
    "Tanggal",
    "Jam Masuk",
    "Jam Pulang",
    "Status Masuk",
    "Status Pulang",
    "Jarak Geofence (m)",
    "Dalam Jangkauan",
    "Catatan"
  ];

  const rows = data.map((rec, index) => [
    index + 1,
    rec.employeeId,
    `"${rec.employeeName.replace(/"/g, '""')}"`,
    rec.date,
    rec.clockInTime || "-",
    rec.clockOutTime || "-",
    rec.checkInStatus === 'ontime' ? "Tepat Waktu" : rec.checkInStatus === 'late' ? "Terlambat" : rec.checkInStatus === 'leave' ? "Sakit / Izin" : "Alpa / Belum Absen",
    rec.checkOutStatus === 'normal' ? "Normal" : rec.checkOutStatus === 'early' ? "Pulang Cepat" : "Belum Pulang",
    rec.distanceToGeofence !== null ? `${rec.distanceToGeofence}m` : "-",
    rec.isWithinGeofence ? "Ya" : "Tidak",
    `"${(rec.notes || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${fileName}.csv`);
  document.body.appendChild(link); // Required for FF
  link.click();
  document.body.removeChild(link);
}

// Check time difference in minutes
export function getMinutesDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  return (h1 * 60 + m1) - (h2 * 60 + m2);
}
