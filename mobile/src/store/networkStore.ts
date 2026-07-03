import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
}

interface NetworkActions {
  setOnline: (v: boolean) => void;
}

export const useNetworkStore = create<NetworkState & NetworkActions>((set) => ({
  isOnline: true,
  setOnline: (v) => set({ isOnline: v }),
}));
