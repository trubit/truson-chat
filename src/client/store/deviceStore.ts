import { create } from 'zustand';
import type { DeviceResponse } from '@/types/auth';

interface DeviceState {
  devices: DeviceResponse[];
  isLoading: boolean;
}

interface DeviceActions {
  setDevices: (devices: DeviceResponse[]) => void;
  updateDevice: (id: string, changes: Partial<DeviceResponse>) => void;
  removeDevice: (id: string) => void;
  clearDevices: () => void;
  setLoading: (loading: boolean) => void;
}

type DeviceStore = DeviceState & DeviceActions;

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  isLoading: false,

  setDevices: (devices) => set({ devices }),

  updateDevice: (id, changes) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, ...changes } : d)),
    })),

  removeDevice: (id) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
    })),

  clearDevices: () => set({ devices: [] }),

  setLoading: (isLoading) => set({ isLoading }),
}));
