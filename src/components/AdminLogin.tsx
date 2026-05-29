import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ChevronLeft, Chrome, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AdminLoginProps {
  onGoogleSignIn: () => Promise<void>;
  onDemoSignIn: (email: string) => void;
  onBackToPortal: () => void;
  authLoading: boolean;
}

export default function AdminLogin({
  onGoogleSignIn,
  onDemoSignIn,
  onBackToPortal,
  authLoading,
}: AdminLoginProps) {
  const [email, setEmail] = useState('dr.siti@sartikaclinic.id');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Simulate standard credential checking
    setTimeout(() => {
      // Allow Siti Sartika or any dummy credentials that match the admin role
      if (email === 'dr.siti@sartikaclinic.id' && password === 'admin123') {
        onDemoSignIn(email);
      } else if (email === 'ketoktotok@gmail.com') {
        // Allow developer email for easy bypass
        onDemoSignIn(email);
      } else {
        setError('Email atau password admin salah. Silakan coba lagi atau gunakan Akun Demo Instan.');
      }
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
      {/* Header Accent */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white text-center relative">
        <button
          onClick={onBackToPortal}
          className="absolute left-4 top-6 text-slate-300 hover:text-white flex items-center gap-1 text-xs font-bold transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali
        </button>
        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
        </div>
        <h2 className="text-lg font-extrabold tracking-tight">Konsol Kontrol Admin</h2>
        <p className="text-[11px] text-slate-400 mt-1">Gunakan Firebase Google Auth atau Akun Demo Klinik</p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex gap-2.5 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Firebase Google Sign-In */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={async () => {
              setError(null);
              try {
                await onGoogleSignIn();
              } catch (e: any) {
                console.error(e);
                setError(e.message || 'Gagal login via Google Auth.');
              }
            }}
            disabled={authLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer border border-slate-800 disabled:opacity-50"
          >
            <Chrome className="w-4 h-4 text-emerald-400" />
            {authLoading ? 'Verifikasi...' : 'Masuk Dengan Google Auth'}
          </button>
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atau Gunakan Email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
        </div>

        {/* Credential login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5ClassName">Email Akses Admin</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cth: dr.siti@sartikaclinic.id"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Kata Sandi / Passkey</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || authLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md cursor-pointer hover:shadow-indigo-500/10 disabled:opacity-50"
          >
            {isSubmitting ? 'Menghubungkan...' : 'Masuk Konsol Admin'}
          </button>
        </form>

        {/* Demo Hint Area */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-xl space-y-2 text-xs">
          <p className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Panduan Pengujian Instan:
          </p>
          <p className="text-slate-500 leading-relaxed text-[11px]">
            Tersedia akun demonstrasi Pimpinan Klinik yang telah terkonfigurasi. Klik tombol di bawah untuk langsung mengisi kredensial & login:
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setEmail('dr.siti@sartikaclinic.id');
                setPassword('admin123');
                onDemoSignIn('dr.siti@sartikaclinic.id');
              }}
              className="bg-white border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all text-[10.5px] font-extrabold text-indigo-700 px-3 py-2 rounded-lg cursor-pointer"
            >
              ⚡ 1-Click Masuk Demo Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
