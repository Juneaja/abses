import React, { useState, useMemo } from 'react';
import { Employee, AttendanceRecord, GeofenceConfig } from '../types';
import { exportToCSV, formatTime } from '../utils';
import { 
  FileSpreadsheet, Printer, Calendar, CalendarCheck2, Clock, 
  MapPin, AlertCircle, Award, CheckCircle, TrendingUp, ChevronLeft, ChevronRight, UserCheck
} from 'lucide-react';

interface ReportDashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: GeofenceConfig;
}

export default function ReportDashboard({
  employees,
  attendanceRecords,
  config,
}: ReportDashboardProps) {
  // Report Month/Year selection state (Default: May 2026)
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // 1-12 (May=5)
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const monthsList = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Filter records for the chosen month and year
  const monthlyRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      const parts = rec.date.split('-');
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return y === selectedYear && m === selectedMonth;
    });
  }, [attendanceRecords, selectedMonth, selectedYear]);

  // Compute individual statistics for each active employee
  const employeeStats = useMemo(() => {
    const list = employees.filter(e => e.role === 'employee');
    
    return list.map(emp => {
      const records = monthlyRecords.filter(r => r.employeeId === emp.id);
      const totalDays = records.length;
      
      const presentRecords = records.filter(r => r.clockInTime);
      const attendanceCount = presentRecords.length;
      const onTimeCount = presentRecords.filter(r => r.checkInStatus === 'ontime').length;
      const lateRecords = presentRecords.filter(r => r.checkInStatus === 'late');
      const lateCount = lateRecords.length;
      
      const leaveCount = records.filter(r => r.checkInStatus === 'leave').length;
      const absentCount = records.filter(r => r.checkInStatus === 'absent').length;

      // Calculate total late minutes
      let totalLateMinutes = 0;
      lateRecords.forEach(r => {
        if (r.clockInTime) {
          const [h, m] = r.clockInTime.split(':').map(Number);
          const [targetH, targetM] = config.checkInTime.split(':').map(Number);
          const diff = (h * 60 + m) - (targetH * 60 + targetM);
          if (diff > 0) totalLateMinutes += diff;
        }
      });

      // Calculate average distance
      const distances = presentRecords.map(r => r.distanceToGeofence || 0);
      const avgDistance = distances.length > 0 
        ? Math.round(distances.reduce((sum, d) => sum + d, 0) / distances.length * 10) / 10 
        : 0;

      const presenceRate = totalDays > 0 ? Math.round((attendanceCount / totalDays) * 100) : 100;

      return {
        employee: emp,
        totalDays,
        attendanceCount,
        onTimeCount,
        lateCount,
        leaveCount,
        absentCount,
        totalLateMinutes,
        avgDistance,
        presenceRate,
      };
    });
  }, [employees, monthlyRecords, config]);

  // Aggregate stats across all employees
  const aggregateStats = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalOnTime = 0;
    let totalLeave = 0;
    let totalAbsent = 0;
    let totalLateTime = 0;

    employeeStats.forEach(stat => {
      totalPresent += stat.attendanceCount;
      totalLate += stat.lateCount;
      totalOnTime += stat.onTimeCount;
      totalLeave += stat.leaveCount;
      totalAbsent += stat.absentCount;
      totalLateTime += stat.totalLateMinutes;
    });

    const totalPossibilities = totalPresent + totalLeave + totalAbsent;
    const avgAttendanceRate = totalPossibilities > 0 
      ? Math.round((totalPresent / totalPossibilities) * 100) 
      : 0;

    return {
      totalPresent,
      totalLate,
      totalOnTime,
      totalLeave,
      totalAbsent,
      totalLateTime,
      avgAttendanceRate,
    };
  }, [employeeStats]);

  const reportTitle = `${monthsList[selectedMonth - 1]} ${selectedYear}`;

  const handleExportCSV = () => {
    const fileName = `Rekap_Absensi_Sartika_${reportTitle.replace(" ", "_")}`;
    exportToCSV(monthlyRecords, fileName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Print styles override (non-intrusive) */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* FILTER HEADER (no-print) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Laporan Bulanan Geofencing</h3>
            <p className="text-xs text-slate-400 mt-0.5">Filter dan ekspor lembar rekapitulasi data kehadiran.</p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedMonth(prev => prev === 1 ? 12 : prev - 1)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 text-slate-800 min-w-[120px] text-center">
              {monthsList[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={() => setSelectedMonth(prev => prev === 12 ? 1 : prev + 1)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Export CSV/Excel */}
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-98 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Ekspor Excel (CSV)
          </button>

          {/* Print PDF */}
          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-98 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      {/* RENDERED REPORT PANEL (print-full) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8 print-full">
        
        {/* Printable Letterhead */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white text-xl shadow-md border-b-2 border-emerald-800">
              KS
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">KLINIK SARTIKA LAMONGAN</h1>
              <p className="text-xs text-slate-500 font-medium">Jl. Lamongrejo No. 100 Lamongan, Jawa Timur • Telp: (0322) 321xxx</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded inline-block tracking-widest no-print">Laporan Terpilih</span>
            <h2 className="text-md font-bold text-slate-800 mt-1 uppercase tracking-tight">REKAPITULASI PRESENSI {reportTitle}</h2>
            <p className="text-xs text-slate-400">Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>

        {/* Dashboard Cards inside the Printed Report */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
              <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Tingkat Kehadiran</span>
            </div>
            <span className="text-2xl font-black text-slate-800">{aggregateStats.avgAttendanceRate}%</span>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Rata-rata kehadiran staf</span>
          </div>

          <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Hadir Tepat Waktu</span>
            </div>
            <span className="text-2xl font-black text-emerald-600">{aggregateStats.totalOnTime}</span>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Dari total data presensi</span>
          </div>

          <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Kasus Terlambat</span>
            </div>
            <span className="text-2xl font-black text-amber-500">{aggregateStats.totalLate}</span>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Total komulatif terlambat</span>
          </div>

          <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Akumulasi Keterlambatan</span>
            </div>
            <span className="text-2xl font-black text-rose-600">{aggregateStats.totalLateTime} mnt</span>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Menit keterlambatan bulanan</span>
          </div>
        </div>

        {/* Visual Charts Section (Injected Custom SVGs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
          
          {/* Chart A: On-Time Ratio Donut */}
          <div className="bg-slate-50 p-5 border border-slate-200/60 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Rasio Ketepatan Waktu Kerja
              </h4>
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded" />
                  <span className="text-slate-600">Tepat Waktu: <b>{aggregateStats.totalOnTime} kali</b></span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded" />
                  <span className="text-slate-600">Terlambat: <b>{aggregateStats.totalLate} kali</b></span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded animate-pulse" />
                  <span className="text-slate-600">Alpa/Alpha: <b>{aggregateStats.totalAbsent} kali</b></span>
                </div>
              </div>
            </div>

            {/* Custom SVG Donut Chart */}
            <div className="w-28 h-28 relative flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                {/* On-Time slice */}
                {aggregateStats.totalPresent > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.2"
                    strokeDasharray={`${(aggregateStats.totalOnTime / (aggregateStats.totalPresent + aggregateStats.totalAbsent + aggregateStats.totalLeave)) * 100} ${100 - (aggregateStats.totalOnTime / (aggregateStats.totalPresent + aggregateStats.totalAbsent + aggregateStats.totalLeave)) * 100}`}
                    strokeDashoffset="0"
                  />
                )}
                {/* Late slice */}
                {aggregateStats.totalPresent > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3.2"
                    strokeDasharray={`${(aggregateStats.totalLate / (aggregateStats.totalPresent + aggregateStats.totalAbsent + aggregateStats.totalLeave)) * 100} ${100 - (aggregateStats.totalLate / (aggregateStats.totalPresent + aggregateStats.totalAbsent + aggregateStats.totalLeave)) * 100}`}
                    strokeDashoffset={`-${(aggregateStats.totalOnTime / (aggregateStats.totalPresent + aggregateStats.totalAbsent + aggregateStats.totalLeave)) * 100}`}
                  />
                )}
              </svg>
              {/* Inner Center stats */}
              <div className="absolute flex flex-col items-center">
                <span className="text-xs font-black text-slate-800">
                  {aggregateStats.totalPresent > 0 
                    ? Math.round((aggregateStats.totalOnTime / aggregateStats.totalPresent) * 100)
                    : 100}%
                </span>
                <span className="text-[7.5px] text-slate-400 font-bold uppercase">Akurasi</span>
              </div>
            </div>
          </div>

          {/* Chart B: Distance Leaderboard */}
          <div className="bg-slate-50 p-5 border border-slate-200/60 rounded-xl">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Leaderboard Presensi Konsisten (Hadir Terbanyak)
            </h4>
            
            <div className="space-y-2.5">
              {employeeStats.slice(0, 3).map((stat, sindex) => (
                <div key={stat.employee.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-200 px-1 rounded">#{sindex+1}</span>
                      <span className="font-semibold text-slate-700">{stat.employee.name}</span>
                    </div>
                    <span className="font-bold text-slate-600 text-[11px]">{stat.attendanceCount} hari</span>
                  </div>
                  {/* Progress Bar represent presence */}
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${stat.presenceRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Detailed Leaderboard Table for the Report printable */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Rincian Kehadiran Bulanan Staf
          </h4>
          
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 uppercase tracking-wider font-bold text-[9px] text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Lengkap & Jabatan</th>
                  <th className="px-4 py-3 text-center">Hadir</th>
                  <th className="px-4 py-3 text-center">Tepat Waktu</th>
                  <th className="px-4 py-3 text-center">Terlambat</th>
                  <th className="px-4 py-3 text-center">Sakit/Izin</th>
                  <th className="px-4 py-3 text-center">Alpha</th>
                  <th className="px-4 py-3 text-center">Rata Jarak GPS</th>
                  <th className="px-4 py-3 text-right">Rasio Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {employeeStats.map((stat) => (
                  <tr key={stat.employee.id} className="hover:bg-slate-50/20">
                    <td className="px-4 py-3.5">
                      <span className="font-bold block text-slate-900">{stat.employee.name}</span>
                      <span className="text-[10px] text-slate-400 block">{stat.employee.position}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">{stat.attendanceCount} kali</td>
                    <td className="px-4 py-3.5 text-center text-emerald-600 font-bold">{stat.onTimeCount} kali</td>
                    <td className="px-4 py-3.5 text-center text-amber-600 font-bold">
                      {stat.lateCount > 0 ? `${stat.lateCount}x (${stat.totalLateTime}m)` : '0'}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-500">{stat.leaveCount} kali</td>
                    <td className="px-4 py-3.5 text-center text-rose-500 font-medium">{stat.absentCount} kali</td>
                    <td className="px-4 py-3.5 text-center font-mono text-slate-600">
                      {stat.attendanceCount > 0 ? `${stat.avgDistance}m` : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-900">{stat.presenceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Signatures for PDF print outs */}
        <div className="grid grid-cols-2 gap-4 text-center pt-8 border-t border-slate-100 text-[11px] leading-relaxed">
          <div>
            <p className="text-slate-400">Verifikator Kehadiran,</p>
            <div className="h-16" />
            <p className="font-bold text-slate-800 underline">Budi Santoso</p>
            <p className="text-slate-400">Staff Administrasi (Perekam Medis)</p>
          </div>
          <div>
            <p className="text-slate-400">Mengetahui, Pimpinan Klinik,</p>
            <div className="h-16" />
            <p className="font-bold text-slate-800 underline">dr. Siti Sartika, M.Kes</p>
            <p className="text-slate-400">NIP. 197804152005012001</p>
          </div>
        </div>

      </div>

    </div>
  );
}
