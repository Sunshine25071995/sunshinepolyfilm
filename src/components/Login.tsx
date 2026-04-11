import React, { useState } from 'react';
import { Package, Lock, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simple fixed credentials
    setTimeout(() => {
      if (id === '456' && password === '456') {
        localStorage.setItem('sunshine_auth', 'true');
        onLogin();
        toast.success('Welcome back!');
      } else {
        toast.error('Invalid ID or Password');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-xl">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900">Sunshine</h1>
          <p className="mt-2 text-sm font-medium text-slate-500 uppercase tracking-widest">Stock Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">User ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Enter ID"
                className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-slate-900 focus:border-slate-900 focus:ring-slate-900"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="Enter Password"
                className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-slate-900 focus:border-slate-900 focus:ring-slate-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </motion.div>
      
      <p className="mt-8 text-xs font-medium text-slate-400 uppercase tracking-widest">
        Sunshine Polyfilm © 2026
      </p>
    </div>
  );
}
