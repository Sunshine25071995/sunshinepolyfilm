/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import { Chemical, Transaction, FIXED_CHEMICALS } from './types';
import { Toaster, toast } from 'sonner';
import { 
  LayoutDashboard, 
  PlusCircle, 
  MinusCircle, 
  History, 
  LogOut, 
  LogIn,
  Package,
  Share2,
  Download
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionHistory from './components/TransactionHistory';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchase' | 'usage' | 'history'>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Initialize chemicals if they don't exist
    const initChemicals = async () => {
      for (const name of FIXED_CHEMICALS) {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const chemicalRef = doc(db, 'chemicals', id);
        const snap = await getDoc(chemicalRef);
        if (!snap.exists()) {
          await setDoc(chemicalRef, {
            id,
            name,
            currentStockKg: 0,
            unit: name === 'Resin Bags' ? 'bags' : 'kg',
            kgPerBag: name === 'Resin Bags' ? 25 : 0,
            lowStockThreshold: 100,
            lastUpdated: new Date()
          });
        }
      }
    };
    initChemicals();

    // Listen for real-time updates
    const q = query(collection(db, 'chemicals'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Chemical);
      setChemicals(data);
    }, (error) => {
      console.error("Firestore Error:", error);
      toast.error("Failed to sync data. Check permissions.");
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="mb-8 rounded-full bg-white p-6 shadow-xl">
          <Package className="h-16 w-16 text-slate-900" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">PVC Stock Manager</h1>
        <p className="mb-8 text-slate-600">Secure chemical inventory tracking for PVC film manufacturing.</p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 rounded-xl bg-slate-900 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95"
        >
          <LogIn className="h-5 w-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-900 p-1.5">
            <Package className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">PVC Stock</h1>
        </div>
        <button
          onClick={logout}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md p-4">
        {activeTab === 'dashboard' && <Dashboard chemicals={chemicals} />}
        {activeTab === 'purchase' && <TransactionForm type="purchase" chemicals={chemicals} onComplete={() => setActiveTab('dashboard')} />}
        {activeTab === 'usage' && <TransactionForm type="usage" chemicals={chemicals} onComplete={() => setActiveTab('dashboard')} />}
        {activeTab === 'history' && <TransactionHistory />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t bg-white px-2 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard className="h-6 w-6" />}
          label="Stock"
        />
        <NavButton 
          active={activeTab === 'purchase'} 
          onClick={() => setActiveTab('purchase')}
          icon={<PlusCircle className="h-6 w-6" />}
          label="Purchase"
        />
        <NavButton 
          active={activeTab === 'usage'} 
          onClick={() => setActiveTab('usage')}
          icon={<MinusCircle className="h-6 w-6" />}
          label="Usage"
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<History className="h-6 w-6" />}
          label="History"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-4 transition-all",
        active ? "text-slate-900 scale-110" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}
