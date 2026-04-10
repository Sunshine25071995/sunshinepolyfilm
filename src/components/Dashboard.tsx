import { useRef, useState } from 'react';
import { Chemical } from '../types';
import { formatQuantity, cn } from '../lib/utils';
import { Share2, AlertTriangle, Search, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface DashboardProps {
  chemicals: Chemical[];
}

const COLORS = {
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate900: '#0f172a',
  amber50: '#fffbeb',
  amber200: '#fde68a',
  amber500: '#f59e0b',
  amber600: '#d97706',
  emerald500: '#10b981',
  white: '#ffffff'
};

export default function Dashboard({ chemicals }: DashboardProps) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const dashboardRef = useRef<HTMLDivElement>(null);

  const filteredChemicals = chemicals
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.currentStockKg - b.currentStockKg;
      if (sortOrder === 'desc') return b.currentStockKg - a.currentStockKg;
      return 0;
    });

  const shareAsImage = async () => {
    if (!dashboardRef.current) return;
    
    try {
      toast.loading('Generating report...');
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: COLORS.slate50,
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], `stock-report-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });
        
        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: 'PVC Chemical Stock Report',
            text: `Current Stock Report - ${new Date().toLocaleDateString()}`
          });
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `stock-report.png`;
          a.click();
          toast.success('Report downloaded (Sharing not supported on this browser)');
        }
      });
      toast.dismiss();
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sticky top-[72px] z-20 bg-slate-50 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search chemicals..."
            className="w-full rounded-xl border-none bg-white pl-10 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-slate-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'none' : 'asc')}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                sortOrder === 'asc' ? "bg-slate-900 text-white" : "bg-white text-slate-600 shadow-sm"
              )}
            >
              <ArrowUpNarrowWide className="h-3.5 w-3.5" />
              Lowest
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'none' : 'desc')}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                sortOrder === 'desc' ? "bg-slate-900 text-white" : "bg-white text-slate-600 shadow-sm"
              )}
            >
              <ArrowDownNarrowWide className="h-3.5 w-3.5" />
              Highest
            </button>
          </div>
          
          <button
            onClick={shareAsImage}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Report
          </button>
        </div>
      </div>

      {/* Stock Cards */}
      <div 
        ref={dashboardRef} 
        className="grid gap-4 p-4 rounded-3xl"
        style={{ backgroundColor: COLORS.slate50 }}
      >
        <div 
          className="mb-6 border-b pb-4"
          style={{ borderBottomColor: COLORS.slate200 }}
        >
          <h2 className="text-2xl font-black" style={{ color: COLORS.slate900 }}>PVC Stock Status</h2>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.slate400 }}>
            {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
          </p>
        </div>
        
        {filteredChemicals.map((chemical) => {
          const isLow = chemical.currentStockKg <= (chemical.lowStockThreshold || 100);
          return (
            <div
              key={chemical.id}
              className="relative overflow-hidden rounded-2xl p-5 shadow-sm transition-all active:scale-[0.98]"
              style={{ 
                backgroundColor: COLORS.white,
                border: isLow ? `1px solid ${COLORS.amber200}` : 'none'
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: COLORS.slate900 }}>{chemical.name}</h3>
                  <p className="mt-1 text-2xl font-black" style={{ color: COLORS.slate900 }}>
                    {formatQuantity(chemical.currentStockKg, chemical.kgPerBag)}
                  </p>
                </div>
                {isLow && (
                  <div 
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: COLORS.amber50, color: COLORS.amber600 }}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock
                  </div>
                )}
              </div>
              
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: COLORS.slate100 }}>
                <div 
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((chemical.currentStockKg / 1000) * 100, 100)}%`,
                    backgroundColor: isLow ? COLORS.amber500 : COLORS.emerald500
                  }}
                />
              </div>
            </div>
          );
        })}
        
        {filteredChemicals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: COLORS.slate400 }}>
            <Search className="mb-2 h-12 w-12 opacity-20" />
            <p>No chemicals found</p>
          </div>
        )}
      </div>
    </div>
  );
}
