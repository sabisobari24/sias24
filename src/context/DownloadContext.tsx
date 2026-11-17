import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import type { ExportDateRange } from '../utils/exportDateFilter';

export interface DownloadActionItem {
  label: string;
  onClick?: (range?: ExportDateRange) => void;
  type?: 'excel' | 'pdf' | 'docx' | 'print';
  formats?: {
    docx?: (range?: ExportDateRange) => void;
    pdf?: (range?: ExportDateRange) => void;
    excel?: (range?: ExportDateRange) => void;
  };
}

interface DownloadContextType {
  downloadActions: DownloadActionItem[];
  setDownloadActions: (actions: DownloadActionItem[], ownerId?: string) => void;
  clearDownloadActions: (ownerId?: string) => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [downloadActions, setDownloadActionsState] = useState<DownloadActionItem[]>([]);
  const activeOwnerRef = useRef<string | undefined>(undefined);

  const setDownloadActions = useCallback((actions: DownloadActionItem[], ownerId?: string) => {
    if (ownerId) {
      activeOwnerRef.current = ownerId;
    }
    setDownloadActionsState(actions);
  }, []);

  const clearDownloadActions = useCallback((ownerId?: string) => {
    if (ownerId && activeOwnerRef.current && activeOwnerRef.current !== ownerId) {
      return;
    }
    if (!ownerId || activeOwnerRef.current === ownerId) {
      activeOwnerRef.current = undefined;
    }
    setDownloadActionsState([]);
  }, []);

  return (
    <DownloadContext.Provider value={{ downloadActions, setDownloadActions, clearDownloadActions }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = (): DownloadContextType => {
  const context = useContext(DownloadContext);
  if (!context) {
    return {
      downloadActions: [],
      setDownloadActions: () => {},
      clearDownloadActions: () => {},
    };
  }
  return context;
};
