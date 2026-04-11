import { useRef, useState } from 'react';
import { Chemical } from '../types';
import { formatQuantity, cn } from '../lib/utils';
import { Share2, AlertTriangle, Search, ArrowUpNarrowWide, ArrowDownNarrowWide, MessageCircle } from 'lucide-react';
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
  white: '#ffffff',
  whatsapp: '#25D366'
};

export default function Dashboard({ chemicals }: DashboardProps) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const dashboardRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const filteredChemicals = chemicals
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.currentStockKg - b.currentStockKg;
      if (sortOrder === 'desc') return b.currentStockKg - a.currentStockKg;
      return 0;
    });

  const shareToWhatsApp = async () => {
    if (!reportRef.current) return;
    
    try {
      toast.loading('Generating WhatsApp report...');
      
      // Ensure the report is visible for capturing
      reportRef.current.style.display = 'block';
      
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: COLORS.white,
        scale: 3, // High quality
        logging: false,
        useCORS: true
      });
      
      reportRef.current.style.display = 'none';
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], `sunshine-report-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });
        
        const lowStockChemicals = chemicals.filter(c => c.currentStockKg <= (c.lowStockThreshold || 100));
        const lowStockText = lowStockChemicals.length > 0 
          ? `\n\n⚠️ *LOW STOCK ALERT:* \n${lowStockChemicals.map(c => `• *${c.name}*: ${formatQuantity(c.currentStockKg, c.kgPerBag)} 🚨`).join('\n')}`
          : '\n\n✅ *All stock levels are healthy.*';

        const shareText = `☀️ *SUNSHINE STOCK REPORT*\n📅 *Date:* ${new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}${lowStockText}\n\n📊 _Generated via Sunshine App_`;

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Sunshine Stock Report',
              text: shareText
            });
          } catch (err) {
            // Fallback to WhatsApp URL if file sharing fails
            const encodedText = encodeURIComponent(shareText);
            window.open(`https://wa.me/?text=${encodedText}`, '_blank');
          }
        } else {
          // Fallback: download and open WhatsApp
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sunshine-report.png`;
          a.click();
          
          const encodedText = encodeURIComponent(shareText);
          window.open(`https://wa.me/?text=${encodedText}`, '_blank');
          toast.success('Report downloaded! Share it on WhatsApp manually.');
        }
      });
      toast.dismiss();
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate report');
      if (reportRef.current) reportRef.current.style.display = 'none';
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
            onClick={shareToWhatsApp}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-600 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Stock Cards - Small Design */}
      <div className="grid grid-cols-2 gap-3">
        {filteredChemicals.map((chemical) => {
          const isLow = chemical.currentStockKg <= (chemical.lowStockThreshold || 100);
          return (
            <div
              key={chemical.id}
              className={cn(
                "relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all active:scale-[0.98]",
                isLow && "ring-1 ring-amber-200"
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <h3 className="text-[17px] font-bold text-blue-600 uppercase tracking-wider truncate">{chemical.name}</h3>
                {isLow && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
              </div>
              
              <div className="mt-1">
                <p className={cn(
                  "text-sm font-black",
                  isLow ? "text-amber-600" : "text-slate-900"
                )}>
                  {formatQuantity(chemical.currentStockKg, chemical.kgPerBag)}
                </p>
              </div>
              
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
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
      </div>

      {/* Hidden Report for Image Generation */}
      <div 
        ref={reportRef}
        style={{ 
          display: 'none', 
          width: '400px', 
          padding: '24px', 
          backgroundColor: '#ffffff',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>☀️ SUNSHINE STOCK</h2>
          <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {chemicals.map(c => {
            const isLow = c.currentStockKg <= (c.lowStockThreshold || 100);
            return (
              <div key={c.id} style={{ 
                padding: '10px', 
                borderRadius: '12px', 
                backgroundColor: isLow ? '#fffbeb' : '#f8fafc',
                border: isLow ? '1px solid #fde68a' : '1px solid #e2e8f0'
              }}>
                <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{c.name}</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 900, color: isLow ? '#d97706' : '#0f172a' }}>
                  {formatQuantity(c.currentStockKg, c.kgPerBag)}
                </p>
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '8px', color: '#94a3b8' }}>
          Generated via Sunshine App • sunshinepolyfilm.com
        </div>
      </div>

      {filteredChemicals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Search className="mb-2 h-12 w-12 opacity-20" />
          <p>No chemicals found</p>
        </div>
      )}
    </div>
  );
}
