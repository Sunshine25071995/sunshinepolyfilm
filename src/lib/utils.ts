import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatQuantity(kg: number, kgPerBag?: number) {
  if (kgPerBag && kgPerBag > 0) {
    const bags = kg / kgPerBag;
    return `${kg.toFixed(2)} kg (${bags.toFixed(1)} bags)`;
  }
  return `${kg.toFixed(2)} kg`;
}
