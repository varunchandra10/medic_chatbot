import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function NetworkStatusBadge({ isOnline }) {
  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Wifi className="w-3.5 h-3.5" />
        <span>Live Sync</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <WifiOff className="w-3.5 h-3.5 text-amber-600" />
      <span>Offline Mode (Local Knowledge Base)</span>
    </div>
  );
}

