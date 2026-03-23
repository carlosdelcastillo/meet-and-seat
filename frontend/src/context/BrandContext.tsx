import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../api/client';
import type { BrandSettings } from '../types';

interface BrandContextType {
  brand: BrandSettings;
  refreshBrand: () => Promise<void>;
}

const defaultBrand: BrandSettings = {
  company_name: 'Meet & Seat',
  logo_url: '',
  primary_color: '#0F766E',
  accent_color: '#2DD4BF',
};

const BrandContext = createContext<BrandContextType>({
  brand: defaultBrand,
  refreshBrand: async () => {},
});

function applyBrandColors(brand: BrandSettings) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', brand.primary_color);
  root.style.setProperty('--color-accent', brand.accent_color);
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<BrandSettings>(defaultBrand);

  const refreshBrand = useCallback(async () => {
    try {
      const data = await api.get<BrandSettings>('/brand');
      setBrand(data);
      applyBrandColors(data);
      document.title = data.company_name;
    } catch {
      // Use defaults
    }
  }, []);

  useEffect(() => {
    refreshBrand();
  }, [refreshBrand]);

  return (
    <BrandContext.Provider value={{ brand, refreshBrand }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandContextType {
  return useContext(BrandContext);
}
