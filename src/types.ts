export interface Chemical {
  id: string;
  name: string;
  currentStockKg: number;
  unit?: 'kg' | 'bags';
  kgPerBag?: number;
  lowStockThreshold?: number;
  lastUpdated?: any;
}

export interface Transaction {
  id: string;
  date: any;
  chemicalId: string;
  chemicalName: string;
  type: 'purchase' | 'usage';
  quantityKg: number;
  batchRef?: string;
  createdBy?: string;
}

export const FIXED_CHEMICALS = [
  "DOP",
  "Tin",
  "Epoxy",
  "G161",
  "G3",
  "PA20",
  "PE1",
  "B22",
  "AC316",
  "G741",
  "GS",
  "Resin Bags"
];
