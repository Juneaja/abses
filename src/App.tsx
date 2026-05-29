import React, { useState, useEffect, useMemo } from 'react';
import { Employee, AttendanceRecord, GeofenceConfig, SystemLog } from './types';
import { DEFAULT_GEOFENCE, INITIAL_EMPLOYEES, generateMockAttendance, INITIAL_LOGS } from './data/mockData';
import { getDistanceInMeters } from './utils';

import MapContainer from './components/MapContainer';
import EmployeeCheckIn from './components/EmployeeCheckIn';
import AdminPanel from './components/AdminPanel';
import ReportDashboard from './components/ReportDashboard';
import AdminLogin from './components/AdminLogin';
import { useToast } from './components/Toast';

import { 
  Building, LogIn, Award, ListFilter, Bell, ToggleLeft, ToggleRight, 
  Settings, Users, Activity, FileText, MapPin, Compass, ShieldCheck, 
  Volume2, Trash2, ShieldAlert, CheckCircle, Radio, LogOut, Key, Sparkles, RefreshCw
} from 'lucide-react';

// Import Firebase Auth & Firestore instances
import { db, auth, googleProvider, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

// Chime player function
function playChime(type: 'success' | 'alert' | 'info') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.28);
    } else if (type === 'alert') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, ctx.currentTime); // G4
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    console.warn("Chime blocked by browser safety", e);
  }
}

export default function App() {
  const { showToast } = useToast();
  // Core application States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<GeofenceConfig>(DEFAULT_GEOFENCE);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Auth States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  // Current system simulation time
  const [currentSystemTime, setCurrentSystemTime] = useState<Date>(new Date());
  
  // Simulation speed (in seconds per dynamic cycle)
  const [systemTimeOffsetMinutes, setSystemTimeOffsetMinutes] = useState<number>(0);

  // User simulated GPS coordinates (Default: Tepat di Klinik Sartika)
  const [userLat, setUserLat] = useState<number>(DEFAULT_GEOFENCE.latitude);
  const [userLng, setUserLng] = useState<number>(DEFAULT_GEOFENCE.longitude);

  // Reminders configurations
  const [morningReminderEnabled, setMorningReminderEnabled] = useState(true);
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(true);

  // active screen tabs: 'portal' | 'admin' | 'reports' | 'notifications'
  const [activeTab, setActiveTab] = useState<'portal' | 'admin' | 'reports' | 'notifications'>('portal');

  // Interactive user switcher active role
  const [currentRole, setCurrentRole] = useState<'employee' | 'admin'>('employee');

  // Push notification state logs
  const [shownNotifications, setShownNotifications] = useState<Array<{ id: string; title: string; body: string; time: string }>>([]);

  // Compute live system time
  const liveTime = useMemo(() => {
    if (systemTimeOffsetMinutes === 0) return currentSystemTime;
    const offsetDate = new Date(currentSystemTime.getTime());
    offsetDate.setMinutes(offsetDate.getMinutes() + systemTimeOffsetMinutes);
    return offsetDate;
  }, [currentSystemTime, systemTimeOffsetMinutes]);

  // Keep live time ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSystemTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize browser Favicon when custom favicon is configured
  useEffect(() => {
    if (config?.favicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = config.favicon;
    }
  }, [config?.favicon]);

  // Sync to Firestore seeding / real-time listener setup
  const seedFirebaseData = async () => {
    try {
      // 1. Seed settings
      const configDoc = doc(db, 'settings', 'geofence');
      const configSnap = await getDoc(configDoc);
      if (!configSnap.exists()) {
        await setDoc(configDoc, DEFAULT_GEOFENCE);
      }

      // 2. Seed default employees (if collection is empty)
      const empColl = collection(db, 'employees');
      const empSnap = await getDocs(empColl);
      if (empSnap.empty) {
        for (const emp of INITIAL_EMPLOYEES) {
          await setDoc(doc(db, 'employees', emp.id), emp);
        }
      }

      // 3. Seed initial records
      const recColl = collection(db, 'attendanceRecords');
      const recSnap = await getDocs(recColl);
      if (recSnap.empty) {
        const mockRecs = generateMockAttendance();
        // Seed first 45 records (to fit limit & keep write loads light but fully complete)
        for (const rec of mockRecs.slice(0, 45)) {
          await setDoc(doc(db, 'attendanceRecords', rec.id), rec);
        }
      }

      // 4. Seed initial system logs
      const logColl = collection(db, 'logs');
      const logSnap = await getDocs(logColl);
      if (logSnap.empty) {
        for (const log of INITIAL_LOGS) {
          await setDoc(doc(db, 'logs', log.id), log);
        }
      }
      console.log("Database Bootstrap Seeding Checked ✓");
    } catch (e) {
      console.warn("Bootstrap seeding skipped (Permission restrictions or existing data)", e);
    }
  };

  // Manage Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        setDemoMode(false);
        // Automatic setup for primary manager email
        if (user.email === "ketoktotok@gmail.com") {
          setCurrentRole('admin');
          setActiveTab('admin');
        } else {
          setCurrentRole('employee');
          setActiveTab('portal');
        }
        seedFirebaseData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Auto-Sensing Real GPS Location (Browser Geolocation API / IP-based fallback)
  useEffect(() => {
    let active = true;

    const fetchIPFallback = async () => {
      try {
        console.log("Memulai deteksi lokasi berdasarkan IP...");
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('ipapi.co fail');
        const data = await res.json();
        if (active && data.latitude && data.longitude) {
          setUserLat(data.latitude);
          setUserLng(data.longitude);
          console.log(`[Auto Location] IP Location detected: ${data.latitude}, ${data.longitude}`);
        }
      } catch (e) {
        console.warn("[Auto Location] First IP fallback failed, trying backup API...", e);
        try {
          const resBackup = await fetch('https://freeipapi.com/api/json');
          if (resBackup.ok) {
            const dataBackup = await resBackup.json();
            if (active && dataBackup.latitude && dataBackup.longitude) {
              setUserLat(dataBackup.latitude);
              setUserLng(dataBackup.longitude);
              console.log(`[Auto Location] Backup IP Location detected: ${dataBackup.latitude}, ${dataBackup.longitude}`);
            }
          }
        } catch (e2) {
          console.error("[Auto Location] All IP fallbacks failed.", e2);
        }
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (active) {
            setUserLat(pos.coords.latitude);
            setUserLng(pos.coords.longitude);
            console.log(`[Auto Location] Real GPS detected: ${pos.coords.latitude}, ${pos.coords.longitude}`);
          }
        },
        (err) => {
          console.warn("[Auto Location] Geolocation permission denied or unavailable. Getting IP fallback...", err);
          fetchIPFallback();
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    } else {
      fetchIPFallback();
    }

    return () => {
      active = false;
    };
  }, []);

  // Authentication & Session helpers
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        addLog(`Admin masuk via Google Auth: ${res.user.displayName || res.user.email}`, 'info');
      }
    } catch (e: any) {
      console.error("Firebase Sign In Error", e);
      throw e;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoSignIn = (emailAddress: string) => {
    setDemoMode(true);
    setCurrentRole('admin');
    setCurrentUser({
      email: emailAddress,
      displayName: emailAddress === 'dr.siti@sartikaclinic.id' ? 'Siti Sartika, M.Kes' : 'Developer Admin',
      photoURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=120'
    });
    setShowAdminLogin(false);
    setActiveTab('admin');
    addLog(`Admin masuk via Mode Demo Klinis (${emailAddress})`, 'info');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut failed:", e);
    }
    setCurrentUser(null);
    setCurrentRole('employee');
    setDemoMode(true); // Fallback to local storage / prefilled mock indicators
    setShowAdminLogin(false);
    setActiveTab('portal');
    addLog("Sesi admin telah ditutup", "info");
  };

  // Manage Real-Time Sync Subscriptions
  useEffect(() => {
    if (!currentUser || demoMode) {
      if (demoMode) {
        // Load default mock data in demo fallback mode
        const storedEmployees = localStorage.getItem('sartika_employees');
        setEmployees(storedEmployees ? JSON.parse(storedEmployees) : INITIAL_EMPLOYEES);

        const storedAttendance = localStorage.getItem('sartika_attendance');
        setAttendanceRecords(storedAttendance ? JSON.parse(storedAttendance) : generateMockAttendance());

        const storedConfig = localStorage.getItem('sartika_config');
        setConfig(storedConfig ? JSON.parse(storedConfig) : DEFAULT_GEOFENCE);

        const storedLogs = localStorage.getItem('sartika_logs');
        setLogs(storedLogs ? JSON.parse(storedLogs) : INITIAL_LOGS);
      } else {
        // Clear variables
        setEmployees([]);
        setAttendanceRecords([]);
        setConfig(DEFAULT_GEOFENCE);
        setLogs([]);
      }
      return;
    }

    // Subscribe to employees collection
    const unsubEmp = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const list: Employee[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as Employee);
      });
      setEmployees(list.length > 0 ? list : INITIAL_EMPLOYEES);

      // Map verified logged in email user's role
      const matched = list.find(e => e.email === currentUser.email);
      if (matched) {
        setCurrentRole(matched.role);
      } else if (currentUser.email === "ketoktotok@gmail.com") {
        setCurrentRole('admin');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees');
    });

    // Subscribe to attendance records - filter safely by role to prevent permission-denied errors
    const recsQuery = currentRole === 'admin' 
      ? collection(db, 'attendanceRecords') 
      : query(collection(db, 'attendanceRecords'), where('employeeId', '==', currentUser.uid));

    const unsubRecs = onSnapshot(recsQuery, (snapshot) => {
      const list: AttendanceRecord[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as AttendanceRecord);
      });
      list.sort((a, b) => b.id.localeCompare(a.id));
      setAttendanceRecords(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendanceRecords');
    });

    // Subscribe to settings config
    const unsubConfig = onSnapshot(doc(db, 'settings', 'geofence'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as GeofenceConfig);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/geofence');
    });

    // Subscribe to logs - only admins can read system logs
    let unsubLogs = () => {};
    if (currentRole === 'admin') {
      unsubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
        const list: SystemLog[] = [];
        snapshot.forEach(d => {
          list.push(d.data() as SystemLog);
        });
        list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setLogs(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'logs');
      });
    } else {
      setLogs([]);
    }

    return () => {
      unsubEmp();
      unsubRecs();
      unsubConfig();
      unsubLogs();
    };
  }, [currentUser, demoMode, currentRole]);

  // Sync to local storage only when in Guest/Demo Mode
  useEffect(() => {
    if (demoMode) {
      localStorage.setItem('sartika_employees', JSON.stringify(employees));
    }
  }, [employees, demoMode]);

  useEffect(() => {
    if (demoMode) {
      localStorage.setItem('sartika_attendance', JSON.stringify(attendanceRecords));
    }
  }, [attendanceRecords, demoMode]);

  useEffect(() => {
    if (demoMode) {
      localStorage.setItem('sartika_config', JSON.stringify(config));
    }
  }, [config, demoMode]);

  useEffect(() => {
    if (demoMode) {
      localStorage.setItem('sartika_logs', JSON.stringify(logs));
    }
  }, [logs, demoMode]);

  // Compute distance to geofence based on current center coordinates and user GPS lat/lng
  const distanceToCenter = useMemo(() => {
    return getDistanceInMeters(userLat, userLng, config.latitude, config.longitude);
  }, [userLat, userLng, config]);

  const isWithinGeofence = useMemo(() => {
    return distanceToCenter <= config.radius;
  }, [distanceToCenter, config.radius]);

  // System actions helper
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'attendance', employeeName?: string) => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: liveTime.toISOString(),
      message,
      type,
      employeeName,
    };
    setLogs(prev => [newLog, ...prev]);

    if (!demoMode) {
      setDoc(doc(db, 'logs', newLog.id), newLog).catch(err => {
        console.error("Gagal menyimpan log ke Firestore:", err);
      });
    }
  };

  // Real or simulation Browser Notification triggers
  const executeNotificationPush = (title: string, body: string) => {
    // Save to inside push logs history
    const newNotif = {
      id: `push-${Date.now()}`,
      title,
      body,
      time: liveTime.toTimeString().split(' ')[0],
    };
    setShownNotifications(prev => [newNotif, ...prev]);
    playChime('alert');

    // Standard HTML5 Browser Push
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    }
  };

  // Action: Clock In Employee
  const handleClockIn = async (
    employeeId: string,
    notes: string,
    selfieUrl: string | null,
    shiftId?: 'pagi' | 'siang' | 'malam' | 'pt'
  ) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    const todayDateStr = liveTime.toISOString().split('T')[0];
    const clockTimeStr = liveTime.toTimeString().split(' ')[0]; // HH:MM:ss

    // Find the chosen shift config or fallback to main config
    const activeShift = config.shifts?.find(s => s.id === shiftId) || {
      id: 'pagi' as const,
      name: 'Shift Pagi',
      checkInTime: config.checkInTime,
      checkOutTime: config.checkOutTime
    };

    const targetCheckIn = activeShift.checkInTime;

    // Check if late based on shift specific checkInTime
    const [h, m] = clockTimeStr.split(':').map(Number);
    const [targetH, targetM] = targetCheckIn.split(':').map(Number);
    const tolerance = config.lateToleranceMinutes;
    
    const minutesSinceTarget = (h * 60 + m) - (targetH * 60 + targetM);
    const checkInStatus = minutesSinceTarget > tolerance ? 'late' : 'ontime';

    const newRecord: AttendanceRecord = {
      id: `REC-${employeeId}-${todayDateStr}`,
      employeeId,
      employeeName: emp.name,
      date: todayDateStr,
      clockInTime: clockTimeStr,
      clockOutTime: null,
      latitude: userLat,
      longitude: userLng,
      distanceToGeofence: distanceToCenter,
      isWithinGeofence,
      checkInStatus,
      checkOutStatus: 'none',
      notes,
      selfie: selfieUrl,
      shiftId: activeShift.id,
      shiftName: activeShift.name,
    };

    if (!demoMode) {
      try {
        await setDoc(doc(db, 'attendanceRecords', newRecord.id), newRecord);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `attendanceRecords/${newRecord.id}`);
        return;
      }
    }

    // Always update React state to guarantee instant UI response
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !(r.employeeId === employeeId && r.date === todayDateStr));
      return [newRecord, ...filtered];
    });

    playChime('success');
    addLog(
      `${emp.name} melakukan Clock-In @ ${clockTimeStr} untuk [${activeShift.name}] (${checkInStatus === 'ontime' ? 'Tepat Waktu' : `Terlambat ${minutesSinceTarget} menit`})`,
      'attendance',
      emp.name
    );

    // Prompt user on screen of successful simulation
    showToast(`Clock-in berhasil!\n${emp.name} terdata Hadir ${checkInStatus === 'ontime' ? 'Tepat Waktu' : 'Terlambat'} pada [${activeShift.name}] jam ${clockTimeStr}.`, "success");
  };

  // Action: Clock Out Employee
  const handleClockOut = async (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    const todayDateStr = liveTime.toISOString().split('T')[0];
    const clockTimeStr = liveTime.toTimeString().split(' ')[0];

    // Read current entry record
    const existingRec = attendanceRecords.find(r => r.employeeId === employeeId && r.date === todayDateStr);
    if (!existingRec) {
      showToast("Harap lakukan clock-in terlebih dulu sebelum clock-out!", "warning");
      return;
    }

    // Find the associated shift or fallback to main config
    const activeShift = config.shifts?.find(s => s.id === existingRec.shiftId) || {
      id: 'pagi' as const,
      name: 'Shift Pagi',
      checkInTime: config.checkInTime,
      checkOutTime: config.checkOutTime
    };

    const targetCheckOut = activeShift.checkOutTime;

    // Check if early clock-out
    const [h, m] = clockTimeStr.split(':').map(Number);
    const [targetH, targetM] = targetCheckOut.split(':').map(Number);
    const earlyMinutes = (targetH * 60 + targetM) - (h * 60 + m);
    const checkOutStatus = earlyMinutes > 0 ? 'early' : 'normal';

    const updatedRecord: AttendanceRecord = {
      ...existingRec,
      clockOutTime: clockTimeStr,
      checkOutStatus,
    };

    if (!demoMode) {
      try {
        await setDoc(doc(db, 'attendanceRecords', updatedRecord.id), updatedRecord);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `attendanceRecords/${updatedRecord.id}`);
        return;
      }
    }

    setAttendanceRecords(prev => prev.map(rec => 
      (rec.employeeId === employeeId && rec.date === todayDateStr) ? updatedRecord : rec
    ));

    playChime('success');
    addLog(
      `${emp.name} melakukan Clock-Out @ ${clockTimeStr} untuk [${activeShift.name}] (${checkOutStatus === 'normal' ? 'Normal' : 'Pulang Lebih Cepat'})`,
      'attendance',
      emp.name
    );

    showToast(`Clock-out berhasil!\n${emp.name} terdata Pulang pada [${activeShift.name}] jam ${clockTimeStr}. Sampai jumpa besok.`, "success");
  };

  // Admin Management Actions
  const handleAddEmployee = async (newEmpData: Omit<Employee, "id" | "joinDate">) => {
    const newId = `EMP00${employees.length + 1}`;
    const newEmployee: Employee = {
      ...newEmpData,
      id: newId,
      joinDate: liveTime.toISOString().split('T')[0],
    };

    if (!demoMode) {
      try {
        await setDoc(doc(db, 'employees', newEmployee.id), newEmployee);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `employees/${newEmployee.id}`);
        return;
      }
    }

    setEmployees(prev => [...prev, newEmployee]);
    addLog(`Karyawan baru terdaftar: ${newEmployee.name} (${newEmployee.position})`, 'info');
  };

  const handleEditEmployee = async (updatedEmp: Employee) => {
    if (!demoMode) {
      try {
        await setDoc(doc(db, 'employees', updatedEmp.id), updatedEmp);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `employees/${updatedEmp.id}`);
        return;
      }
    }

    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    addLog(`Data karyawan diperbarui: ${updatedEmp.name}`, 'info');
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!demoMode) {
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `employees/${id}`);
        return;
      }
    }

    setEmployees(prev => prev.filter(e => e.id !== id));
    addLog(`Karyawan dihapus dari sistem (ID: ${id})`, 'info');
  };

  const handleUpdateConfig = async (newConfig: GeofenceConfig) => {
    if (!demoMode) {
      try {
        await setDoc(doc(db, 'settings', 'geofence'), newConfig);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'settings/geofence');
        return;
      }
    }

    setConfig(newConfig);
    addLog(`Konfigurasi Geofencing diperbarui oleh Manager`, 'info');
  };

  // Preset set location latitude & longitude
  const handleSetSimulationPreset = (lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);
    playChime('info');
    
    const dist = getDistanceInMeters(lat, lng, config.latitude, config.longitude);
    const inRange = dist <= config.radius;
    addLog(
      `Tester mengubah simulasi GPS koordinat (Jarak ke klink: ${dist}m - ${inRange ? 'Di dalam range' : 'Luar jangkauan'})`,
      inRange ? 'info' : 'warning'
    );
  };

  // Auto trigger check schedule effect if system simulated time matches
  // Reminders values 07:45 and 17:00
  const timeStrHM = liveTime.toTimeString().substring(0, 5); // HH:MM

  const [lastTriggeredTime, setLastTriggeredTime] = useState("");
  useEffect(() => {
    if (timeStrHM !== lastTriggeredTime) {
      if (timeStrHM === "07:45" && morningReminderEnabled) {
        executeNotificationPush(
          "⏰ PENGINGAT MASUK KERJA - Klinik Sartika",
          "Selamat Pagi! Jam kerja dimulai jam 08:00 WIB. Pastikan GPS Anda aktif dan lakukan Clock-In dalam jangkauan Jl. Lamongrejo No. 100."
        );
        setLastTriggeredTime(timeStrHM);
      }
      if (timeStrHM === "17:00" && eveningReminderEnabled) {
        executeNotificationPush(
          "🏠 PENGINGAT PULANG - Klinik Sartika",
          "Waktunya pulang! Terima kasih atas dedikasi pelayanan medis Anda hari ini. Harap lakukan Clock-Out sebelum meninggalkan klink."
        );
        setLastTriggeredTime(timeStrHM);
      }
    }
  }, [timeStrHM, lastTriggeredTime, morningReminderEnabled, eveningReminderEnabled]);

  // Request browser permission for real push on launch if toggled
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        showToast(`Status izin notifikasi browser anda: ${permission}`, permission === 'granted' ? 'success' : 'info');
      });
    } else {
      showToast("Browser anda tidak mendukung HTML5 Notifikasi API.", "warning");
    }
  };

  // Get active record stats today
  const todayDateStr = liveTime.toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(r => r.date === todayDateStr);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-900">
      
      {/* 1. TOP BAR BRAND HEADER */}
      {currentRole === 'admin' ? (
        <header className="bg-slate-900 border-b border-indigo-900/40 sticky top-0 z-40 shadow-xs no-print text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            
            <div className="flex items-center gap-3">
              {config.logo ? (
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 border border-slate-700/50 shadow-md">
                  <img src={config.logo} alt="Logo" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold tracking-tighter text-md shadow-lg border border-indigo-500">
                  ADM
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-extrabold text-white tracking-tight">Sartika Absen</h1>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded-full border border-indigo-500/30">Konsol Admin</span>
                </div>
                <p className="text-[10px] text-slate-400">Jl. Lamongrejo No. 100 Lamongan</p>
              </div>
            </div>

            {/* Admin Session Info & Logout */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] font-black block leading-none text-white">
                    {currentUser?.displayName || 'Siti Sartika, M.Kes'}
                  </span>
                  <span className="text-[9px] text-indigo-400 font-extrabold block uppercase tracking-wider mt-0.5">
                    {currentUser?.email === 'ketoktotok@gmail.com' ? 'Developer' : 'Pimpinan Klinik'}
                  </span>
                </div>
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full border border-indigo-500/50 object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-800 text-indigo-300 text-xs font-bold flex items-center justify-center border border-indigo-600">
                    SS
                  </div>
                )}
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600 text-red-100 hover:text-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-red-500/20 font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>

          </div>
        </header>
      ) : (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            
            <div className="flex items-center gap-3">
              {config.logo ? (
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 border border-slate-200/80 shadow-xs">
                  <img src={config.logo} alt="Logo" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold tracking-tighter text-md shadow-sm">
                  KS
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">Sartika Absen</h1>
                  <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-200">Portal Karyawan</span>
                </div>
                <p className="text-[10px] text-slate-400">Jl. Lamongrejo No. 100 Lamongan</p>
              </div>
            </div>

            {/* Secure Admin Access key button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdminLogin(true)}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-indigo-200/60 font-bold hover:shadow-xs"
              >
                <Key className="w-3.5 h-3.5 animate-pulse" />
                Akses Admin
              </button>
            </div>

          </div>
        </header>
      )}

      {/* 2. DYNAMIC WORKSPACE BODY */}
      {currentRole === 'admin' ? (
        // ==========================================
        // ADMIN CONSOLE WORKSPACE
        // ==========================================
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8 animate-fadeIn">
          
          {/* Simulation GPS Control Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-650 animate-spin-slow shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-700 block">Uji Koordinat GPS Geofencing</span>
                <p className="text-[10.5px] text-slate-400 leading-none">Simulasikan lokasi uji coba untuk mengonfirmasi ketepatan radius zona {config.officeName}.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1 max-w-sm">
              <span className="text-[10px] font-mono font-bold text-rose-500">Jauh (800m)</span>
              <input
                type="range"
                min="0"
                max="5000"
                step="2"
                value={Math.round(distanceToCenter)}
                onChange={(e) => {
                  const distanceVal = parseFloat(e.target.value);
                  const delta = distanceVal / 111000;
                  setUserLat(config.latitude + delta / Math.sqrt(2));
                  setUserLng(config.longitude + delta / Math.sqrt(2));
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] font-mono font-bold text-indigo-500 font-extrabold">Klinik (0m)</span>
            </div>

            <div className="text-right">
              <span className="text-xs bg-slate-100 border text-slate-700 px-3 py-1.5 rounded-lg font-mono">
                Simulasi Jarak Posisi: <b className="text-indigo-700">{distanceToCenter}m</b>
              </span>
            </div>
          </div>

          {/* ADMIN CONSOLE TABS */}
          <div className="flex border-b border-indigo-200/60 gap-1.5 no-print overflow-x-auto scroller-none">
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-6 py-3.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${activeTab === 'admin' ? 'border-indigo-600 text-indigo-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Users className="w-4 h-4 text-indigo-505" />
              Dashboard Karyawan
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-6 py-3.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${activeTab === 'reports' ? 'border-indigo-600 text-indigo-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <FileText className="w-4 h-4 text-indigo-505" />
              Rekap & Laporan Bulanan
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-6 py-3.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${activeTab === 'notifications' ? 'border-indigo-600 text-indigo-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Bell className="w-4 h-4 text-indigo-505" />
              Jadwal Notifikasi Push
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="space-y-6">
            {activeTab === 'admin' && (
              <AdminPanel
                employees={employees}
                config={config}
                logs={logs}
                todayRecords={todayRecords}
                onUpdateConfig={handleUpdateConfig}
                onAddEmployee={handleAddEmployee}
                onEditEmployee={handleEditEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onClearLogs={() => setLogs([])}
              />
            )}

            {activeTab === 'reports' && (
              <ReportDashboard
                employees={employees}
                attendanceRecords={attendanceRecords}
                config={config}
              />
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
                
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bell className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-md font-extrabold text-slate-800">Konfigurasi Pengingat & Simulasi Notifikasi</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Atur jam pengiriman push otomatis masuk dan pulang kerja bagi karyawan.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  <div className="space-y-5 bg-slate-50 border border-slate-200/60 p-5 rounded-xl">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Pengaturan Penjadwalan Push</span>
                    
                    <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200/60 rounded-xl shadow-xs">
                      <div>
                        <span className="text-xs font-black text-slate-700 block">Pengingat Masuk Shift (07:45 WIB)</span>
                        <span className="text-[10.5px] text-slate-400 block mt-0.5">Dikirimkan 15 menit sebelum waktu toleransi clock-in.</span>
                      </div>
                      <button
                        onClick={() => setMorningReminderEnabled(!morningReminderEnabled)}
                        className="text-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
                      >
                        {morningReminderEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200/60 rounded-xl shadow-xs">
                      <div>
                        <span className="text-xs font-black text-slate-700 block">Pengingat Jam Pulang (17:00 WIB)</span>
                        <span className="text-[10.5px] text-slate-400 block mt-0.5">Dikirimkan tepat waktu pulang klinis untuk mencegah lupa absen.</span>
                      </div>
                      <button
                        onClick={() => setEveningReminderEnabled(!eveningReminderEnabled)}
                        className="text-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
                      >
                        {eveningReminderEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                      </button>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Kirim Notifikasi Simulasi Instan:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            executeNotificationPush(
                              "⏰ PENGINGAT MASUK SHIFT PAGI - Klinik Sartika",
                              "Selamat Pagi! Jam kerja dimulai jam 08:00 WIB. Pastikan GPS Anda aktif dan lakukan Clock-In dalam jangkauan Jl. Lamongrejo No. 100."
                            );
                          }}
                          className="text-xs bg-slate-900 text-white font-bold p-3 rounded-lg hover:bg-slate-800 shadow transition-all border border-slate-800 cursor-pointer"
                        >
                          Tes Push Jam Masuk
                        </button>
                        <button
                          onClick={() => {
                            executeNotificationPush(
                              "🏠 PENGINGAT PULANG - Klinik Sartika",
                              "Waktunya pulang! Terima kasih atas dedikasi pelayanan medis Anda hari ini. Harap lakukan Clock-Out sebelum meninggalkan klink."
                            );
                          }}
                          className="text-xs bg-slate-900 text-white font-bold p-3 rounded-lg hover:bg-slate-800 shadow transition-all border border-slate-800 cursor-pointer"
                        >
                          Tes Push Jam Pulang
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">History Log Push Notifikasi</span>
                      <button 
                        onClick={() => setShownNotifications([])}
                        className="text-[10.5px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Hapus Riwayat
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {shownNotifications.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-xs text-slate-400">
                          Belum ada simulasi pengingat push terkirim di tab ini.
                        </div>
                      ) : (
                        shownNotifications.map((notif) => (
                          <div key={notif.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-xs leading-relaxed flex gap-2.5">
                            <Bell className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-0.5">
                                  <span>{notif.time} WIB</span>
                                  <span className="text-emerald-600 font-bold uppercase text-[9px]">Terkirim</span>
                              </div>
                              <span className="font-extrabold text-slate-800 block text-xs">{notif.title}</span>
                              <span className="text-slate-500 block leading-normal mt-0.5">{notif.body}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        </main>
      ) : showAdminLogin ? (
        // ==========================================
        // CENTERED ADMIN LOGIN WORKSPACE
        // ==========================================
        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <AdminLogin
              onGoogleSignIn={handleGoogleSignIn}
              onDemoSignIn={handleDemoSignIn}
              onBackToPortal={() => setShowAdminLogin(false)}
              authLoading={authLoading}
            />
          </div>
        </main>
      ) : (
        // ==========================================
        // EMPLOYEE PORTAL WORKSPACE
        // ==========================================
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8 animate-fadeIn">
          
          {/* INTERACTIVE COMPASS RADAR MAP */}
          <div className="no-print">
            <MapContainer
              config={config}
              userLat={userLat}
              userLng={userLng}
              distance={distanceToCenter}
              isWithin={isWithinGeofence}
              onSetSimulationPreset={handleSetSimulationPreset}
            />
          </div>

          {/* SIMULATION GPS SLIDER COORDINATE CONTROLLER BAR */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-600 animate-spin-slow shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-700 block">Simulasi Posisi GPS Karyawan</span>
                <p className="text-[10.5px] text-slate-400 leading-none">Seret slider untuk mensimulasikan jarak HP Anda ke lokasi Klinik Lamongrejo.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1 max-w-sm">
              <span className="text-[10px] font-mono font-bold text-rose-500">Jauh (800m)</span>
              <input
                type="range"
                min="0"
                max="5000"
                step="2"
                value={Math.round(distanceToCenter)}
                onChange={(e) => {
                  const distanceVal = parseFloat(e.target.value);
                  const delta = distanceVal / 111000;
                  setUserLat(config.latitude + delta / Math.sqrt(2));
                  setUserLng(config.longitude + delta / Math.sqrt(2));
                }}
                className="w-full select-none h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <span className="text-[10px] font-mono font-bold text-emerald-500">Merapat (0m)</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs bg-slate-100 border text-slate-700 px-3 py-1.5 rounded-lg font-mono">
                Jarak Sekarang: <b className="text-emerald-700">{distanceToCenter}m</b>
              </span>
              <button
                onClick={async () => {
                  if (typeof navigator !== 'undefined' && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setUserLat(pos.coords.latitude);
                        setUserLng(pos.coords.longitude);
                        const dist = getDistanceInMeters(pos.coords.latitude, pos.coords.longitude, config.latitude, config.longitude);
                        showToast(`Sukses! Lokasi GPS asli berhasil terbaca.\n\nLintang: ${pos.coords.latitude}\nBujur: ${pos.coords.longitude}\nJarak ke Klinik: ${dist} m.`, "success");
                      },
                      async (err) => {
                        console.warn("GPS diblokir, beralih ke deteksi IP...", err);
                        try {
                          const res = await fetch('https://ipapi.co/json/');
                          if (!res.ok) throw new Error('ipapi failed');
                          const data = await res.json();
                          if (data.latitude && data.longitude) {
                            setUserLat(data.latitude);
                            setUserLng(data.longitude);
                            const dist = getDistanceInMeters(data.latitude, data.longitude, config.latitude, config.longitude);
                            showToast(`Lokasi berhasil dideteksi via alamat IP Internet HP/Perangkat Anda!\n\nLintang: ${data.latitude}\nBujur: ${data.longitude}\nJarak ke Klinik: ${dist} m.`, "success");
                          } else {
                            throw new Error('No coordinates returned');
                          }
                        } catch (ipErr) {
                          try {
                            const resBackup = await fetch('https://freeipapi.com/api/json');
                            if (resBackup.ok) {
                              const dataBackup = await resBackup.json();
                              if (dataBackup.latitude && dataBackup.longitude) {
                                setUserLat(dataBackup.latitude);
                                setUserLng(dataBackup.longitude);
                                const dist = getDistanceInMeters(dataBackup.latitude, dataBackup.longitude, config.latitude, config.longitude);
                                showToast(`Lokasi berhasil dideteksi via Backup IP Perangkat Anda!\n\nLintang: ${dataBackup.latitude}\nBujur: ${dataBackup.longitude}\nJarak ke Klinik: ${dist} m.`, "success");
                                return;
                              }
                            }
                          } catch (secondErr) {
                            console.error("Semua alternatif gagal", secondErr);
                          }
                          showToast(`Gagal mengambil GPS asli: ${err.message}. Layanan lokasi diblokir atau tidak tersedia.`, "error");
                        }
                      },
                      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
                    );
                  } else {
                    showToast("Browser Anda tidak mendukung deteksi lokasi langsung.", "warning");
                  }
                }}
                className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-800 transition-all cursor-pointer shadow hover:shadow-md"
              >
                Gunakan GPS Asli
              </button>
            </div>
          </div>

          {/* PORTAL SWAFOTO ABSENSI */}
          <div className="space-y-6">
            <EmployeeCheckIn
              employees={employees}
              attendanceRecords={attendanceRecords}
              config={config}
              distance={distanceToCenter}
              isWithin={isWithinGeofence}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              currentSystemTime={liveTime}
            />
          </div>

        </main>
      )}

      {/* 4. FOOTER CREDITS */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 mt-16 text-center text-xs no-print">
        <div className="max-w-7xl mx-auto px-4 leading-relaxed flex flex-col items-center gap-3">
          {config.logoFooter && (
            <div className="bg-white/95 p-1 px-3 rounded-lg max-h-12 flex items-center justify-center border border-slate-800 shadow-sm max-w-[200px]">
              <img src={config.logoFooter} alt="Logo Footer" className="max-h-10 object-contain" />
            </div>
          )}
          <div>
            <p>© 2026 Klinik Sartika Lamongan. Peta Lokasi Geofencing & Rekapitulasi Laporan Bulanan Otomatis.</p>
            <p className="text-[10.5px] text-slate-500 mt-1">
              Menggunakan verifikasi radius presisi {config.radius}m yang berbasis pada koordinat Jl. Lamongrejo No. 100 Lamongan, Jawa Timur.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
