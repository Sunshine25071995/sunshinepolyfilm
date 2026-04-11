import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp, doc, deleteDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Filter, Calendar, Download, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionHistoryProps {
  onEdit?: (transaction: Transaction) => void;
}

export default function TransactionHistory({ onEdit }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'usage'>('all');
  const [pressingId, setPressingId] = useState<string | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [pressProgress, setPressProgress] = useState(0);

  useEffect(() => {
    let q = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(50));
    
    if (filterType !== 'all') {
      q = query(collection(db, 'transactions'), where('type', '==', filterType), orderBy('date', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate()
      } as Transaction));
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error('History error:', error);
      toast.error('Failed to load history');
    });

    return () => unsubscribe();
  }, [filterType]);

  const handleUndo = async (transaction: Transaction) => {
    try {
      toast.loading('Restoring entry...');
      
      // Re-apply stock effect
      const chemicalRef = doc(db, 'chemicals', transaction.chemicalId);
      await updateDoc(chemicalRef, {
        currentStockKg: increment(transaction.type === 'purchase' ? transaction.quantityKg : -transaction.quantityKg)
      });

      // Restore transaction document
      const { id, ...data } = transaction;
      await setDoc(doc(db, 'transactions', id), {
        ...data,
        date: Timestamp.fromDate(transaction.date)
      });
      
      toast.dismiss();
      toast.success('Entry restored');
    } catch (error) {
      console.error('Undo error:', error);
      toast.error('Failed to restore entry');
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    try {
      toast.loading('Deleting...');
      
      // Reverse stock effect
      const chemicalRef = doc(db, 'chemicals', transaction.chemicalId);
      await updateDoc(chemicalRef, {
        currentStockKg: increment(transaction.type === 'purchase' ? -transaction.quantityKg : transaction.quantityKg)
      });

      // Delete transaction
      await deleteDoc(doc(db, 'transactions', transaction.id));
      
      toast.dismiss();
      toast('Entry deleted', {
        action: {
          label: 'Undo',
          onClick: () => handleUndo(transaction)
        },
        duration: 5000
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete entry');
    }
  };

  const startPress = (transaction: Transaction) => {
    setPressingId(transaction.id);
    setPressProgress(0);
    
    const startTime = Date.now();
    const duration = 5000; // 5 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setPressProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        handleDelete(transaction);
        setPressingId(null);
        setPressProgress(0);
      }
    }, 50);

    pressTimerRef.current = interval;
  };

  const endPress = () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressingId(null);
    setPressProgress(0);
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Date', 'Chemical', 'Type', 'Quantity (kg)', 'Batch Ref'];
    const rows = transactions.map(t => [
      format(t.date, 'yyyy-MM-dd HH:mm'),
      t.chemicalName,
      t.type,
      t.quantityKg,
      t.batchRef || ''
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(['all', 'purchase', 'usage'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all",
              filterType === type 
                ? "bg-slate-900 text-white shadow-md" 
                : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900"></div>
          </div>
        ) : transactions.length > 0 ? (
          transactions.map((t) => (
            <div key={t.id} className="relative">
              <button 
                onClick={() => onEdit?.(t)}
                onMouseDown={() => startPress(t)}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onTouchStart={() => startPress(t)}
                onTouchEnd={endPress}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition-all hover:ring-2 hover:ring-slate-900 active:scale-[0.98]",
                  pressingId === t.id && "scale-95"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  t.type === 'purchase' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>
                  {t.type === 'purchase' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <h3 className="truncate text-[17px] font-bold text-blue-600">{t.chemicalName}</h3>
                    <span className={cn(
                      "text-sm font-bold",
                      t.type === 'purchase' ? "text-emerald-600" : "text-amber-600"
                    )}>
                      {t.type === 'purchase' ? '+' : '-'}{t.quantityKg} kg
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    <Calendar className="h-3 w-3" />
                    {format(t.date, 'MMM d, h:mm a')}
                    {t.batchRef && <span className="text-slate-300">|</span>}
                    {t.batchRef && <span>Batch: {t.batchRef}</span>}
                  </div>
                </div>
              </button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Filter className="mb-2 h-12 w-12 opacity-20" />
            <p>No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
