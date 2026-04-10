import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Package } from 'lucide-react';
import { Chemical } from '../types';
import { cn } from '../lib/utils';

interface ChemicalDropdownProps {
  chemicals: Chemical[];
  value: string;
  onChange: (id: string) => void;
  error?: boolean;
}

export default function ChemicalDropdown({ chemicals, value, onChange, error }: ChemicalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedChemical = chemicals.find(c => c.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border bg-slate-50 px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-slate-900",
          error ? "border-red-500" : "border-slate-200",
          isOpen && "ring-2 ring-slate-900"
        )}
      >
        <div className="flex items-center gap-3">
          <Package className={cn("h-5 w-5", selectedChemical ? "text-slate-900" : "text-slate-400")} />
          <span className={cn("text-sm font-medium", !selectedChemical && "text-slate-400")}>
            {selectedChemical ? selectedChemical.name : "Select Chemical"}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {chemicals.map((chemical) => (
                <button
                  key={chemical.id}
                  type="button"
                  onClick={() => {
                    onChange(chemical.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50",
                    value === chemical.id ? "bg-slate-50 font-bold text-slate-900" : "text-slate-600"
                  )}
                >
                  <span>{chemical.name}</span>
                  {value === chemical.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
