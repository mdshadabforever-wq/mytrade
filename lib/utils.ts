import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIndianRupees(value: number): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  });
  return formatter.format(value);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}
