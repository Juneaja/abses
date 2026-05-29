import React, { useState, useEffect } from 'react';
import { Employee, GeofenceConfig, SystemLog, AttendanceRecord } from '../types';
import { useToast } from './Toast';
import { 
  Users, MapPin, Sliders, Activity, Plus, Search, Edit2, Trash2, 
  Settings, Key, CheckCircle, XCircle, AlertTriangle, ShieldAlert,
  Clock, Landmark, Save, RefreshCw, UserPlus, Info, Upload, Image, Trash
} from 'lucide-react';

interface AdminPanelProps {
  employees: Employee[];
  config: GeofenceConfig;
  logs: SystemLog[];
  todayRecords: AttendanceRecord[];
  onUpdateConfig: (newConfig: GeofenceConfig) => void;
  onAddEmployee: (emp: Omit<Employee, "id" | "joinDate">) => void;
  onEditEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onClearLogs: () => void;
}

export default function AdminPanel({
  employees,
  config,
  logs,
  todayRecords,
  onUpdateConfig,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onClearLogs,
}: AdminPanelProps) {
  const { showToast } = useToast();
  // Tabs: "monitoring" | "employees" | "geofencing"
  const [activeSubTab, setActiveSubTab] = useState<'monitoring' | 'employees' | 'geofencing'>('monitoring');
  
  // Search employee
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Employee form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: "",
    nip: "",
    role: "employee" as const,
    position: "",
    email: "",
    status: "active" as const,
    avatar: "",
  });

  // Edit Employee state
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Config form state
  const [formConfig, setFormConfig] = useState<GeofenceConfig>({ ...config });

  // Sync form state when config prop changes
  useEffect(() => {
    setFormConfig({ ...config });
  }, [config]);

  // Drag and drop visual feedback states
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});

  const handleDrag = (e: React.DragEvent, fieldName: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fieldName]: active }));
  };

  const handleDrop = (e: React.DragEvent, fieldName: 'logo' | 'favicon' | 'logoFooter') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fieldName]: false }));

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        showToast("Ukuran file terlalu besar. Maksimal diperbolehkan 500KB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const updatedConfig = { ...formConfig, [fieldName]: base64 };
        setFormConfig(updatedConfig);
        onUpdateConfig(updatedConfig);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Logo, Favicon, and Footer Logo upload (convert to Base64 and write immediately to Firebase)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logo' | 'favicon' | 'logoFooter') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB Limit
        showToast("Ukuran file terlalu besar. Maksimal diperbolehkan 500KB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const updatedConfig = { ...formConfig, [fieldName]: base64 };
        setFormConfig(updatedConfig);
        onUpdateConfig(updatedConfig); // Auto-save to Firebase
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear/reset custom logo items
  const clearLogoField = (fieldName: 'logo' | 'favicon' | 'logoFooter') => {
    const updatedConfig = { ...formConfig };
    delete updatedConfig[fieldName];
    setFormConfig(updatedConfig);
    onUpdateConfig(updatedConfig); // Auto-save to Firebase
  };

  // Handle Shift setting change
  const handleShiftChange = (
    shiftId: 'pagi' | 'siang' | 'malam' | 'pt',
    field: 'name' | 'checkInTime' | 'checkOutTime',
    value: string
  ) => {
    const defaultShifts = [
      { id: 'pagi' as const, name: 'Shift Pagi', checkInTime: '08:00', checkOutTime: '17:00' },
      { id: 'siang' as const, name: 'Shift Siang', checkInTime: '14:00', checkOutTime: '22:00' },
      { id: 'malam' as const, name: 'Shift Malam', checkInTime: '22:00', checkOutTime: '08:00' },
      { id: 'pt' as const, name: 'Shift PT', checkInTime: '07:00', checkOutTime: '19:00' }
    ];
    const currentShifts = [...(formConfig.shifts || defaultShifts)];
    const index = currentShifts.findIndex(s => s.id === shiftId);
    if (index !== -1) {
      currentShifts[index] = { ...currentShifts[index], [field]: value };
    } else {
      const defaultMatch = defaultShifts.find(s => s.id === shiftId);
      currentShifts.push({
        id: shiftId,
        name: defaultMatch ? defaultMatch.name : shiftId,
        checkInTime: defaultMatch ? defaultMatch.checkInTime : '08:00',
        checkOutTime: defaultMatch ? defaultMatch.checkOutTime : '17:00',
        [field]: value
      });
    }
    setFormConfig({ ...formConfig, shifts: currentShifts });
  };

  // Handle new employee submission
  const handleAddNewEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.nip || !newEmp.position) {
      showToast("Harap lengkapi Nama, NIP, dan Jabatan!", "warning");
      return;
    }
    // Simple placeholder avatar if empty
    const avatar = newEmp.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120`;
    onAddEmployee({ ...newEmp, avatar });
    setNewEmp({
      name: "",
      nip: "",
      role: "employee",
      position: "",
      email: "",
      status: "active",
      avatar: "",
    });
    setShowAddModal(false);
  };

  // Handle Edit employee submit
  const handleEditEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmp) {
      onEditEmployee(editingEmp);
      setEditingEmp(null);
    }
  };

  // Handle Geofence Config submit
  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(formConfig);
    showToast("Konfigurasi lokasi dan jam kerja Klinik Sartika Lamongan berhasil diperbarui.", "success");
  };

  // Filter Employees
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.nip.includes(searchQuery) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats today
  const totalEmployees = employees.filter(e => e.role === 'employee').length;
  const loggedInTodayCount = todayRecords.filter(r => r.clockInTime).length;
  const lateTodayCount = todayRecords.filter(r => r.checkInStatus === 'late').length;
  const onTimeTodayCount = todayRecords.filter(r => r.checkInStatus === 'ontime').length;
  const absentTodayCount = totalEmployees - loggedInTodayCount;
  const outOfRangeAttempts = todayRecords.filter(r => !r.isWithinGeofence && r.clockInTime).length;

  return (
    <div className="space-y-6">
      
      {/* Tab Navigation for Panels */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scroller-none">
        <button
          onClick={() => setActiveSubTab('monitoring')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'monitoring' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Activity className="w-4 h-4" />
          Live Monitoring & Analisis
        </button>
        <button
          onClick={() => setActiveSubTab('employees')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'employees' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Users className="w-4 h-4" />
          Kelola Data Staf ({employees.length})
        </button>
        <button
          onClick={() => setActiveSubTab('geofencing')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all shrink-0 ${activeSubTab === 'geofencing' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Sliders className="w-4 h-4" />
          Konfigurasi Geofencing
        </button>
      </div>

      {/* SUBTAB CONTENT: MONITORING */}
      {activeSubTab === 'monitoring' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">TOTAL EMPLOYEES</span>
                <span className="text-3xl font-black text-slate-800 block mt-1">{totalEmployees}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">HADIR TEPAT WAKTU</span>
                <span className="text-3xl font-black text-emerald-600 block mt-1">{onTimeTodayCount}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">TERLAMBAT</span>
                <span className="text-3xl font-black text-amber-500 block mt-1">{lateTodayCount}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">ABSENT / ALPHA</span>
                <span className="text-3xl font-black text-rose-500 block mt-1">{absentTodayCount}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Monitor Table list of employees checked in today */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Live Presensi Karyawan Hari Ini (Real-Time)
                </h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Automated</span>
              </div>
              
              <div className="overflow-x-auto grow">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 uppercase tracking-wider font-bold text-[9px] text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Staf</th>
                      <th className="px-5 py-3">Jam Masuk (In)</th>
                      <th className="px-5 py-3">Jam Pulang (Out)</th>
                      <th className="px-5 py-3">Geofence Status</th>
                      <th className="px-5 py-3 text-right">Selfie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {employees.filter(e => e.role === 'employee').map(emp => {
                      const record = todayRecords.find(r => r.employeeId === emp.id);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/40">
                          <td className="px-5 py-3.5 flex items-center gap-3">
                            <img src={emp.avatar} referrerPolicy="no-referrer" alt={emp.name} className="w-8 h-8 rounded-full object-cover border" />
                            <div>
                              <span className="font-bold block text-slate-800">{emp.name}</span>
                              <span className="text-[10px] text-slate-400">{emp.position}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {record?.clockInTime ? (
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-slate-800">{record.clockInTime}</span>
                                <span className={`block text-[8.5px] font-bold px-1 py-0.2 rounded w-max ${record.checkInStatus === 'ontime' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {record.checkInStatus === 'ontime' ? 'Tepat Waktu' : 'Terlambat'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">Belum Clock-In</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {record?.clockOutTime ? (
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-slate-800">{record.clockOutTime}</span>
                                <span className="block text-[8.5px] bg-indigo-50 text-indigo-700 font-bold px-1 py-0.2 rounded w-max">
                                  {record.checkOutStatus === 'normal' ? 'Normal' : 'Pulang Cepat'}
                                </span>
                              </div>
                            ) : record?.clockInTime ? (
                              <span className="text-amber-500 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                Sedang Bekerja
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {record?.clockInTime ? (
                              <div className="space-y-0.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${record.isWithinGeofence ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {record.isWithinGeofence ? '✓ Dalam Radius' : '⚠️ Di Luar Radius'}
                                </span>
                                <span className="block text-[9px] text-slate-400">Jarak: {record.distanceToGeofence}m</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {record?.selfie ? (
                              <div className="inline-block relative group">
                                <img src={record.selfie} referrerPolicy="no-referrer" alt="Selfie" className="w-8 h-8 rounded-md object-cover border border-slate-200 cursor-zoom-in" />
                                <div className="absolute bottom-full right-0 hidden group-hover:block bg-slate-900/90 text-white p-1 rounded border border-slate-800 z-10">
                                  <img src={record.selfie} referrerPolicy="no-referrer" alt="Expanded" className="w-24 h-24 object-cover" />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live System Log Activity Feed */}
            <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl shadow-md p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                    <Activity className="w-4.5 h-4.5 animate-pulse" />
                    Log Aktivitas Sistem
                  </h4>
                  <button 
                    onClick={onClearLogs}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                  >
                    Bersihkan
                  </button>
                </div>

                <div className="space-y-3.5 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
                  {logs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Info className="w-8 h-8 mx-auto stroke-1" />
                      <p className="text-xs mt-2">Belum ada log aktivitas hari ini</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="text-[11px] leading-relaxed border-l-2 pl-3 py-0.5 border-slate-800 flex flex-col gap-0.5 hover:bg-slate-800/10 transition-colors">
                        <div className="flex items-center justify-between text-[9px] text-slate-500">
                          <span className="font-bold text-emerald-500/80 uppercase">
                            {log.type === 'attendance' ? 'PRESENSI' : log.type === 'warning' ? 'PERINGATAN' : 'SISTEM'}
                          </span>
                          <span className="font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className={log.type === 'warning' ? 'text-amber-300 font-medium' : 'text-slate-300'}>
                          {log.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4 mt-4 text-[10.5px] text-slate-400/90 leading-relaxed">
                📢 Sistem geofencing mendeteksi koordinat latitude/longitude secara otomatis dan menolak clock-in di luar parameter {config.radius} meter.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUBTAB CONTENT: EMPLOYEES */}
      {activeSubTab === 'employees' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, jabatan, atau NIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Manual entry trigger */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all active:scale-98 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Tambah Karyawan Baru
            </button>
          </div>

          {/* Employee Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 uppercase tracking-wider font-bold text-[9px] text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Lengkap & NIP</th>
                    <th className="px-5 py-3">Jabatan & Email</th>
                    <th className="px-5 py-3">Hak Akses</th>
                    <th className="px-5 py-3">Tanggal Bergabung</th>
                    <th className="px-5 py-3 border-x-0">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 flex items-center gap-3">
                        <img src={emp.avatar} referrerPolicy="no-referrer" alt={emp.name} className="w-9 h-9 rounded-full object-cover border" />
                        <div>
                          <span className="font-bold block text-slate-800">{emp.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">NIP: {emp.nip}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold block text-slate-800">{emp.position}</span>
                        <span className="text-[10px] text-slate-400">{emp.email}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${emp.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}`}>
                          {emp.role === 'admin' ? 'Manager / Admin' : 'Karyawan / Staf'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        {emp.joinDate}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${emp.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setEditingEmp(emp)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded text-slate-600 hover:text-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={emp.role === 'admin'}
                          onClick={() => {
                            if (confirm(`Hapus data ${emp.name}?`)) {
                              onDeleteEmployee(emp.id);
                            }
                          }}
                          className={`p-1.5 rounded border border-slate-200 ${emp.role === 'admin' ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 hover:border-rose-200'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUBTAB CONTENT: GEOFENCING CONFIG */}
      {activeSubTab === 'geofencing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          
          {/* Config form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-600" />
              Parameter Geofencing & Jam Kerja
            </h4>

            <form onSubmit={handleConfigSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Nama Tempat</label>
                  <input
                    type="text"
                    value={formConfig.officeName}
                    onChange={(e) => setFormConfig({ ...formConfig, officeName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Alamat Klinik</label>
                  <input
                    type="text"
                    value={formConfig.address}
                    onChange={(e) => setFormConfig({ ...formConfig, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Office Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formConfig.latitude}
                    onChange={(e) => setFormConfig({ ...formConfig, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Office Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formConfig.longitude}
                    onChange={(e) => setFormConfig({ ...formConfig, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Radius Jangkauan (Meter)</label>
                  <input
                    type="number"
                    value={formConfig.radius}
                    onChange={(e) => setFormConfig({ ...formConfig, radius: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Jam Masuk (Format HH:MM)</label>
                  <input
                    type="text"
                    value={formConfig.checkInTime}
                    onChange={(e) => setFormConfig({ ...formConfig, checkInTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Jam Pulang (Format HH:MM)</label>
                  <input
                    type="text"
                    value={formConfig.checkOutTime}
                    onChange={(e) => setFormConfig({ ...formConfig, checkOutTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Toleransi Keterlambatan (Minit)</label>
                  <input
                    type="number"
                    value={formConfig.lateToleranceMinutes}
                    onChange={(e) => setFormConfig({ ...formConfig, lateToleranceMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* SHIFT SCHEDULING CONFIGURATION SECTION */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Pengaturan Jadwal Shift Kerja Manual
                  </h5>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed -mt-2">
                  Konfigurasikan label nama shift, jam masuk, dan jam pulang secara manual untuk masing-masing opsi shift karyawan. Sifat data sinkron dengan Firebase.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(formConfig.shifts || [
                    { id: 'pagi' as const, name: 'Shift Pagi', checkInTime: '08:00', checkOutTime: '17:00' },
                    { id: 'siang' as const, name: 'Shift Siang', checkInTime: '14:00', checkOutTime: '22:00' },
                    { id: 'malam' as const, name: 'Shift Malam', checkInTime: '22:00', checkOutTime: '08:00' },
                    { id: 'pt' as const, name: 'Shift PT', checkInTime: '07:00', checkOutTime: '19:00' }
                  ]).map((shift) => (
                    <div key={shift.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                        <input
                          type="text"
                          value={shift.name}
                          onChange={(e) => handleShiftChange(shift.id as any, 'name', e.target.value)}
                          className="text-xs font-extrabold text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none p-1 rounded border border-transparent focus:border-slate-300 w-2/3 transition-all font-sans"
                          placeholder="Nama Shift"
                        />
                        <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded-md uppercase border border-slate-300/40">
                          {shift.id}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Mulai Masuk (HH:MM)</label>
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={shift.checkInTime}
                            onChange={(e) => handleShiftChange(shift.id as any, 'checkInTime', e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-800 font-mono text-[11px] rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Target Pulang (HH:MM)</label>
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={shift.checkOutTime}
                            onChange={(e) => handleShiftChange(shift.id as any, 'checkOutTime', e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-800 font-mono text-[11px] rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all outline-none"
              >
                <Save className="w-4 h-4" />
                Simpan & Deklarasikan Konfigurasi Baru
              </button>

            </form>
          </div>

          {/* Quick Explanation Guidelines & Branding Controls */}
          <div className="space-y-6 flex flex-col">
            
            {/* Branding Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                <Image className="w-4 h-4 text-emerald-600" />
                Manajemen Branding & Logo Klinik
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kustomisasikan identitas visual Klinik Anda. File/gambar yang Anda unggah akan otomatis terunggah & disinkronkan ke Firebase secara instan.
              </p>

              {/* Upload Item: Logo Utama */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">1. Logo Utama Klinik (Header)</span>
                  {formConfig.logo && (
                    <button
                      type="button"
                      onClick={() => clearLogoField('logo')}
                      className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash className="w-3 h-3" /> Hapus
                    </button>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 bg-slate-100 border rounded-xl flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {formConfig.logo ? (
                      <img src={formConfig.logo} alt="Preview Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">KS</span>
                    )}
                  </div>
                  <div
                    onDragOver={(e) => handleDrag(e, 'logo', true)}
                    onDragLeave={(e) => handleDrag(e, 'logo', false)}
                    onDrop={(e) => handleDrop(e, 'logo')}
                    className={`flex-1 relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center transition-all bg-slate-50/50 hover:bg-slate-50 relative group cursor-pointer ${
                      dragActive['logo'] ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-500'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'logo')}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 mb-0.5" />
                    <span className="text-[10px] text-slate-500 font-bold">Seret / Klik untuk unggah logo</span>
                    <span className="text-[8px] text-slate-400 mt-0.5">Maks 500KB (Disarankan transparan)</span>
                  </div>
                </div>
              </div>

              {/* Upload Item: Favicon */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">2. Favicon Browser (Tab Icon)</span>
                  {formConfig.favicon && (
                    <button
                      type="button"
                      onClick={() => clearLogoField('favicon')}
                      className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash className="w-3 h-3" /> Hapus
                    </button>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 bg-slate-100 border rounded-xl flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {formConfig.favicon ? (
                      <img src={formConfig.favicon} alt="Preview Favicon" className="w-6 h-6 object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">FAV</span>
                    )}
                  </div>
                  <div
                    onDragOver={(e) => handleDrag(e, 'favicon', true)}
                    onDragLeave={(e) => handleDrag(e, 'favicon', false)}
                    onDrop={(e) => handleDrop(e, 'favicon')}
                    className={`flex-1 relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center transition-all bg-slate-50/50 hover:bg-slate-50 relative group cursor-pointer ${
                      dragActive['favicon'] ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-500'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'favicon')}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 mb-0.5" />
                    <span className="text-[10px] text-slate-500 font-bold">Seret / Klik untuk unggah favicon</span>
                    <span className="text-[8px] text-slate-400 mt-0.5">Maks 500KB (Format kotak .ico/.png)</span>
                  </div>
                </div>
              </div>

              {/* Upload Item: Logo Footer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">3. Logo Bagian Footer (Bawah)</span>
                  {formConfig.logoFooter && (
                    <button
                      type="button"
                      onClick={() => clearLogoField('logoFooter')}
                      className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash className="w-3 h-3" /> Hapus
                    </button>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 bg-slate-100 border rounded-xl flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {formConfig.logoFooter ? (
                      <img src={formConfig.logoFooter} alt="Preview Footer" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">FOOT</span>
                    )}
                  </div>
                  <div
                    onDragOver={(e) => handleDrag(e, 'logoFooter', true)}
                    onDragLeave={(e) => handleDrag(e, 'logoFooter', false)}
                    onDrop={(e) => handleDrop(e, 'logoFooter')}
                    className={`flex-1 relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center transition-all bg-slate-50/50 hover:bg-slate-50 relative group cursor-pointer ${
                      dragActive['logoFooter'] ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-500'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'logoFooter')}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 mb-0.5" />
                    <span className="text-[10px] text-slate-500 font-bold">Seret / Klik untuk unggah logo footer</span>
                    <span className="text-[8px] text-slate-400 mt-0.5">Maks 500KB (Warna kontras/putih disarankan)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Explanation Guidelines */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between flex-1">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-600" />
                  Daftar Panduan Geofence Klinik
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Geofencing adalah gerbang pengaman virtual berbasis satelit (koordinat GPS). Di Klinik Sartika Lamongan (Jl. Lamongrejo No. 100), sitem mewajibkan seluruh perawat, dokter, dan staf administrasi untuk berada dalam radius yang telah ditentukan (misalnya <b>50 meter</b>) agar bisa:
                </p>
                
                <ul className="text-xs text-slate-600 space-y-2.5 list-disc pl-5">
                  <li>Melakukan clock-in masuk kerja secara sah.</li>
                  <li>Merekam bukti swafoto (selfie) verifikasi kehadiran.</li>
                  <li>Mencatat jam pulang (clock-out) di penghujung shift.</li>
                </ul>
                
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Jika koordinat GPS diubah ke luar radius (contoh presisinya: Alun-Alun Lamongan berjarak ±320m), tombol presensi masuk/pulang di portal karyawan akan <b>terkunci secara otomatis</b> untuk mencegah manipulasi.
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-400">
                *Koordinat GPS asli Klinik Sartika berada di sekitar: <b>Lat: -7.121118, Lng: 112.418290</b>.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MODAL: ADD EMPLOYEE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border p-6 shadow-2xl relative animate-scaleIn">
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-3 mb-4">
              Registrasi Karyawan Klinik Baru
            </h4>
            
            <form onSubmit={handleAddNewEmployeeSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: dr. Ahmad Yani"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. 1994200115"
                    value={newEmp.nip}
                    onChange={(e) => setNewEmp({ ...newEmp, nip: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Jabatan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Perawat Poli Gigi"
                    value={newEmp.position}
                    onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Alamat Email Kerja</label>
                <input
                  type="email"
                  required
                  placeholder="E.g. nama@sartikaclinic.id"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Link Foto / Avatar (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newEmp.avatar}
                  onChange={(e) => setNewEmp({ ...newEmp, avatar: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-lg transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-md transition-all"
                >
                  Daftarkan Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT EMPLOYEE */}
      {editingEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border p-6 shadow-2xl relative">
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-3 mb-4">
              Edit Data Karyawan
            </h4>
            
            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingEmp.name}
                  onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Jabatan</label>
                <input
                  type="text"
                  required
                  value={editingEmp.position}
                  onChange={(e) => setEditingEmp({ ...editingEmp, position: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Status Keaktifan</label>
                  <select
                    value={editingEmp.status}
                    onChange={(e) => setEditingEmp({ ...editingEmp, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Akses</label>
                  <select
                    disabled
                    value={editingEmp.role}
                    className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-xs rounded-lg p-2.5 cursor-not-allowed"
                  >
                    <option value="employee">Karyawan</option>
                    <option value="admin">Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-lg transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-md transition-all"
                >
                  Perbarui Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
