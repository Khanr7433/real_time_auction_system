import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMediaUrl(pathUrl: string | undefined | null): string {
  if (!pathUrl) return '';
  if (/^(https?:\/\/|blob:|data:|\/\/)/i.test(pathUrl)) {
    return pathUrl;
  }
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api')
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, '');
  const cleanPath = pathUrl.startsWith('/') ? pathUrl : `/${pathUrl}`;
  return `${base}${cleanPath}`;
}
