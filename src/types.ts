export interface Employee {
  id: string;
  name: string;
  nip: string;
  role: 'employee' | 'admin';
  position: string;
  email: string;
  status: 'active' | 'inactive';
  avatar?: string;
  joinDate: string;
}

export type CheckInStatus = 'ontime' | 'late' | 'absent' | 'leave';
export type CheckOutStatus = 'normal' | 'early' | 'none';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  clockInTime: string | null; // HH:MM:ss
  clockOutTime: string | null; // HH:MM:ss
  latitude: number | null;
  longitude: number | null;
  distanceToGeofence: number | null; // in meters
  isWithinGeofence: boolean;
  checkInStatus: CheckInStatus;
  checkOutStatus: CheckOutStatus;
  notes: string;
  selfie: string | null; // base64 or placeholder URL
  shiftId?: 'pagi' | 'siang' | 'malam' | 'pt';
  shiftName?: string;
}

export interface ShiftConfig {
  id: 'pagi' | 'siang' | 'malam' | 'pt';
  name: string; // e.g. "Shift Pagi"
  checkInTime: string; // "HH:MM"
  checkOutTime: string; // "HH:MM"
}

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  address: string;
  officeName: string;
  checkInTime: string; // "HH:MM" e.g. "08:00"
  checkOutTime: string; // "HH:MM" e.g. "17:00"
  lateToleranceMinutes: number; // e.g. 15
  logo?: string;
  favicon?: string;
  logoFooter?: string;
  shifts?: ShiftConfig[];
}

export interface SystemLog {
  id: string;
  timestamp: string; // ISO string
  message: string;
  type: 'info' | 'success' | 'warning' | 'attendance';
  employeeName?: string;
}
