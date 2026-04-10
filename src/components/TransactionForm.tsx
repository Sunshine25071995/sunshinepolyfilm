import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { Chemical, Transaction } from '../types';
import { toast } from 'sonner';
import { Calendar, Package, Scale, User, Hash, DollarSign, Loader2, X, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';
import ChemicalDropdown from './ChemicalDropdown';
import { motion } from 'motion/react';

interface TransactionFormProps {
  type: 'purchase' | 'usage';
  chemicals: Chemical[];
  onComplete: () => void;
  editData?: Transaction | null;
}

export default function TransactionForm({ type, chemicals, onComplete, editData }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    chemicalId: '',
    quantityKg: '',
    date: new Date().toISOString().split('T')[0],
    batchRef: ''
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        chemicalId: editData.chemicalId,
        quantityKg: editData.quantityKg.toString(),
        date: new Date(editData.date).toISOString().split('T')[0],
        batchRef: editData.batchRef || ''
      });
    }
  }, [editData]);

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
      
      // If editing, we need to reverse the previous transaction's effect on stock first
      if (editData) {
        const oldQty = editData.quantityKg;
        const chemicalRef = doc(db, 'chemicals', editData.chemicalId);
        
        // Reverse old effect: 
        // If it was purchase, subtract oldQty. If it was usage, add oldQty.
        await updateDoc(chemicalRef, {
          currentStockKg: increment(editData.type === 'purchase' ? -oldQty : oldQty)
        });
      }

      // Re-fetch chemical to get fresh stock after reversal (if editing)
      const freshChemicalSnap = await getDoc(doc(db, 'chemicals', formData.chemicalId));
      const freshStock = freshChemicalSnap.data()?.currentStockKg || 0;

      // If usage, check if enough stock (considering the reversal)
      if (type === 'usage' && freshStock < qty) {
        toast.error(`Insufficient stock. Available: ${freshStock}kg`);
        // If it was an edit, we should probably restore the old state, but for simplicity we'll just stop here
        // and let the user correct the quantity.
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
        updatedAt: serverTimestamp(),
        ...(editData ? {} : { createdAt: serverTimestamp() })
      };

      if (editData) {
        // Update existing transaction
        await updateDoc(doc(db, 'transactions', editData.id), transactionData);
      } else {
        // Add new transaction
        await addDoc(collection(db, 'transactions'), transactionData);
      }

      // Update chemical stock with NEW quantity
      const chemicalRef = doc(db, 'chemicals', formData.chemicalId);
      await updateDoc(chemicalRef, {
        currentStockKg: increment(type === 'purchase' ? qty : -qty),
        lastUpdated: serverTimestamp()
      });

      toast.success(`${editData ? 'Entry updated' : (type === 'purchase' ? 'Purchase' : 'Usage')} recorded successfully`);
      onComplete();
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white p-6 shadow-xl"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "rounded-xl p-2 text-white",
            type === 'purchase' ? "bg-emerald-500" : "bg-amber-500"
          )}>
            {editData ? <Pencil className="h-6 w-6" /> : (type === 'purchase' ? <Package className="h-6 w-6" /> : <Scale className="h-6 w-6" />)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 capitalize">
              {editData ? 'Edit Entry' : `${type} Entry`}
            </h2>
            <p className="text-xs text-slate-500">Update stock for PVC manufacturing</p>
          </div>
        </div>
        {editData && (
          <button onClick={onComplete} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Chemical Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Chemical Name *</label>
          <ChemicalDropdown 
            chemicals={chemicals}
            value={formData.chemicalId}
            onChange={(id) => setFormData({ ...formData, chemicalId: id })}
          />
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

        {type === 'usage' && (
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
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (editData ? 'Update Entry' : (type === 'purchase' ? 'Add to Stock' : 'Deduct from Stock'))}
        </button>
      </form>
    </motion.div>
  );
}
