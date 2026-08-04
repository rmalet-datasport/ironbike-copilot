'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface CampaignAsset {
  channel: string;
  copy?: string;
  cta?: string;
  visualDirection?: string;
  editionNumber?: string;
  dataPoint?: string;
  sentence?: string;
  stickerLink?: string;
  subject?: string;
  preheader?: string;
  body?: string;
  personalizationFields?: string[];
  meta?: string;
}

export interface SavedAsset {
  id: string;
  gate: string;
  gateLabel: string;
  segmentId: string;
  segmentName: string;
  segmentColor: string;
  segmentColorBg: string;
  channel: string;
  asset: CampaignAsset;
  savedAt: number;
}

interface ContextValue {
  savedAssets: SavedAsset[];
  saveAsset: (a: Omit<SavedAsset, 'id' | 'savedAt'>) => void;
  removeAsset: (id: string) => void;
  updateAsset: (id: string, edited: CampaignAsset) => void;
}

const STORAGE_KEY = 'sparta_saved_assets';

function loadFromStorage(): SavedAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedAsset[];
  } catch {
    return [];
  }
}

const CampaignHistoryContext = createContext<ContextValue | null>(null);

export function CampaignHistoryProvider({ children }: { children: ReactNode }) {
  const [savedAssets, setSavedAssets] = useState<SavedAsset[]>([]);

  useEffect(() => {
    setSavedAssets(loadFromStorage());
  }, []);

  const saveAsset = (a: Omit<SavedAsset, 'id' | 'savedAt'>) => {
    setSavedAssets(prev => {
      const next = [
        { ...a, id: `asset_${prev.length}_${Math.random().toString(36).slice(2, 6)}`, savedAt: Date.now() },
        ...prev,
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeAsset = (id: string) => {
    setSavedAssets(prev => {
      const next = prev.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateAsset = (id: string, edited: CampaignAsset) => {
    setSavedAssets(prev => {
      const next = prev.map(a =>
        a.id === id ? { ...a, asset: edited } : a
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <CampaignHistoryContext.Provider value={{ savedAssets, saveAsset, removeAsset, updateAsset }}>
      {children}
    </CampaignHistoryContext.Provider>
  );
}

export function useCampaignHistory() {
  const ctx = useContext(CampaignHistoryContext);
  if (!ctx) throw new Error('useCampaignHistory must be inside CampaignHistoryProvider');
  return ctx;
}
