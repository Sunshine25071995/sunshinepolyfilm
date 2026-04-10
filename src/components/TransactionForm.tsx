import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { Chemical } from '../types';
import { toast } from 'sonner';
import { Calendar, Package, Scale, User, Hash, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TransactionFormProps {
  type: 'purchase' | 'usage';
  chemicals: Chemical[];
  onComplete: () => void;
}

export default function TransactionForm({ type, chemicals, onComplete }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    chemicalId: '',
    quantityKg: '',
    date: new Date().toISOString().split('T')[0],
    batchRef: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.chemicalId || !formData.quantityKg) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const qty = parseFloat(formData.quantityKg);
      const chemical = chemicals.find(c => c.id === formData.chemicalId);
      
      if (!chemical) throw new Error('Chemical not found');
      
      // If usage, check if enough stock
      if (type === 'usage' && chemical.currentStockKg < qty) {
        toast.error(`Insufficient stock. Current: ${chemical.currentStockKg}kg`);
        setLoading(false);
        return;
      }

      const transactionData = {
        chemicalId: formData.chemicalId,
        chemicalName: chemical.name,
        type,
        quantityKg: qty,
        date: new Date(formData.date),
        batchRef: formData.batchRef || null,
        createdBy: auth.currentUser?.email,
        createdAt: serverTimestamp()
      };

      // 1. Add transaction log
      await addDoc(collection(db, 'transactions'), transactionData);

      // 2. Update chemical stock
      const chemicalRef = doc(db, 'chemicals', formData.chemicalId);
      await updateDoc(chemicalRef, {
        currentStockKg: increment(type === 'purchase' ? qty : -qty),
        lastUpdated: serverTimestamp()
      });

      toast.success(`${type === 'purchase' ? 'Purchase' : 'Usage'} recorded successfully`);
      onComplete();
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className={cn(
          "rounded-xl p-2 text-white",
          type === 'purchase' ? "bg-emerald-500" : "bg-amber-500"
        )}>
          {type === 'purchase' ? <Package className="h-6 w-6" /> : <Scale className="h-6 w-6" />}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 capitalize">{type} Entry</h2>
          <p className="text-xs text-slate-500">Update stock for PVC manufacturing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Chemical Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Chemical Name *</label>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              required
              className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-slate-900 focus:border-slate-900 focus:ring-slate-900"
              value={formData.chemicalId}
              onChange={(e) => setFormData({ ...formData, chemicalId: e.target.value })}
            >
              <option value="">Select Chemical</option>
              {chemicals.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Quantity (kg) *</label>
          <div className="relative">
            <Scale className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-slate-900 focus:border-slate-900 focus:ring-slate-900"
              value={formData.quantityKg}
              onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Date *</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              required
              className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-slate-900 focus:border-slate-900 focus:ring-slate-900"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
        </div>

        {type === 'purchase' ? null : (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Batch Reference</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Batch #"
                className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-slate-900 focus:border-slate-900 focus:ring-slate-900"
                value={formData.batchRef}
                onChange={(e) => setFormData({ ...formData, batchRef: e.target.value })}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50",
            type === 'purchase' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
          )}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (type === 'purchase' ? 'Add to Stock' : 'Deduct from Stock')}
        </button>
      </form>
    </div>
  );
}
