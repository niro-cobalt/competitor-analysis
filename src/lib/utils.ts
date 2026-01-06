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
        
        const orgName = domain.split('.')[0];
        
        // Organization Aliasing
        if (orgName === 'toqen' || orgName === 'getcobalt' || orgName === 'cobalt') {
            return 'toqen';
        }
        
        return orgName; 
    } catch (e) {
        return null;
    }
}
