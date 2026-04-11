/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import { Chemical, Transaction, FIXED_CHEMICALS } from './types';
import { Toaster, toast } from 'sonner';
import { 
  LayoutDashboard, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Package
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionHistory from './components/TransactionHistory';
import InstallPrompt from './components/InstallPrompt';
import Login from './components/Login';
import { cn } from './lib/utils';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'purchase' | 'usage' | 'history'>('dashboard');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem('sunshine_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }

    if (!db) {
      setLoading(false);
      return;
    }

    // Initialize chemicals if they don't exist
    const initChemicals = async () => {
      try {
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
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    };
    initChemicals();

    // Listen for real-time updates
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'chemicals'), orderBy('name', 'asc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Chemical);
        setChemicals(data);
      }, (error) => {
        console.error("Firestore Error:", error);
        toast.error("Failed to sync data.");
      });
    } catch (err) {
      console.error("Snapshot error:", err);
    }

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Toaster position="top-center" />
      <InstallPrompt />
      
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-900 p-1.5">
            <Package className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Sunshine</h1>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('sunshine_auth');
            setIsAuthenticated(false);
          }}
          className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md p-4">
        {activeTab === 'dashboard' && <Dashboard chemicals={chemicals} />}
        {(activeTab === 'purchase' || activeTab === 'usage' || editingTransaction) && (
          <TransactionForm 
            type={editingTransaction ? editingTransaction.type : (activeTab === 'purchase' ? 'purchase' : 'usage')} 
            chemicals={chemicals} 
            editData={editingTransaction}
            onComplete={() => {
              // Stay on same tab, just clear editing state
              setEditingTransaction(null);
            }} 
          />
        )}
        {activeTab === 'history' && (
          <TransactionHistory 
            onEdit={(t) => {
              setEditingTransaction(t);
              setActiveTab('purchase'); // Just to trigger the form view
            }} 
          />
        )}
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
