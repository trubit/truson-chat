import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useDeviceStore } from '@/store/deviceStore';
import type { DeviceResponse } from '@/types/auth';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const DEVICE_KEYS = {
  all: ['devices'] as const,
};

// ---------------------------------------------------------------------------
// Response wrappers
// ---------------------------------------------------------------------------

interface DevicesApiResponse {
  success: boolean;
  data: DeviceResponse[];
}

interface DeviceApiResponse {
  success: boolean;
  data: { device: DeviceResponse };
}

interface MessageApiResponse {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// List devices
// ---------------------------------------------------------------------------

export function useListDevices() {
  const setDevices = useDeviceStore((s) => s.setDevices);

  return useQuery({
    queryKey: DEVICE_KEYS.all,
    queryFn: async () => {
      const response = await apiService.get<DevicesApiResponse>('/devices');
      setDevices(response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Trust / untrust device
// ---------------------------------------------------------------------------

export function useTrustDevice() {
  const queryClient = useQueryClient();
  const updateDevice = useDeviceStore((s) => s.updateDevice);

  return useMutation({
    mutationFn: ({ id, trusted }: { id: string; trusted: boolean }) =>
      apiService.patch<DeviceApiResponse>(`/devices/${id}/trust`, { trusted }),
    onSuccess: (response) => {
      const device = response.data.device;
      updateDevice(device.id, device);
      queryClient.invalidateQueries({ queryKey: DEVICE_KEYS.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Remove device
// ---------------------------------------------------------------------------

export function useRemoveDevice() {
  const queryClient = useQueryClient();
  const removeDevice = useDeviceStore((s) => s.removeDevice);

  return useMutation({
    mutationFn: (deviceId: string) => apiService.del<MessageApiResponse>(`/devices/${deviceId}`),
    onSuccess: (_response, deviceId) => {
      removeDevice(deviceId);
      queryClient.invalidateQueries({ queryKey: DEVICE_KEYS.all });
    },
  });
}
