import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DownloadActionItem {
  label: string;
  onClick: () => void;
  type?: 'excel' | 'pdf' | 'print';
}

interface DownloadContextType {
  downloadActions: DownloadActionItem[];
  setDownloadActions: (actions: DownloadActionItem[]) => void;
  clearDownloadActions: () => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [downloadActions, setDownloadActionsState] = useState<DownloadActionItem[]>([]);

  const setDownloadActions = (actions: DownloadActionItem[]) => {
    setDownloadActionsState(actions);
  };

  const clearDownloadActions = () => {
    setDownloadActionsState([]);
  };

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
