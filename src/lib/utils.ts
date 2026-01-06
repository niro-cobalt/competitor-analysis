import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUserOrganization(user: any): string | null {
    if (!user || !user.email) return null;
    try {
        const email = user.email;
        const domain = email.split('@')[1];
        if (!domain) return null;
        return domain.split('.')[0]; 
    } catch (e) {
        return null;
    }
}
