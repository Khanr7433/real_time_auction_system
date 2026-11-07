import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMediaUrl(pathUrl: string | undefined | null): string {
  if (!pathUrl) return '';
  if (pathUrl.startsWith('http://') || pathUrl.startsWith('https://')) {
    return pathUrl;
  }
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
  const cleanPath = pathUrl.startsWith('/') ? pathUrl : `/${pathUrl}`;
  return `${base}${cleanPath}`;
}

