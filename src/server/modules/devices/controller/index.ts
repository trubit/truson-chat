import type { RequestHandler } from 'express';
import { devicesService } from '../service/index.js';
import type { ApiResponse } from '../../../../shared/types/api.js';
import type { DeviceResponse, RegisterDeviceInput, TrustDeviceInput } from '../types/index.js';

export class DevicesController {
  listDevices: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const currentSessionId = req.user!.sessionId;

      const devices = await devicesService.listDevices(userId, currentSessionId);

      const response: ApiResponse<DeviceResponse[]> = {
        success: true,
        data: devices,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  getDevice: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params as { id: string };

      const device = await devicesService.getDevice(userId, id);

      const response: ApiResponse<DeviceResponse> = {
        success: true,
        data: device,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  registerDevice: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const ip = req.ip ?? req.socket.remoteAddress ?? '';
      const ua = req.headers['user-agent'] ?? '';
      const input = req.body as RegisterDeviceInput;

      const device = await devicesService.registerDevice(userId, input, ip, ua);

      const response: ApiResponse<DeviceResponse> = {
        success: true,
        data: device,
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  };

  trustDevice: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params as { id: string };
      const ip = req.ip ?? req.socket.remoteAddress ?? '';
      const ua = req.headers['user-agent'] ?? '';
      const { trusted } = req.body as TrustDeviceInput;

      const device = await devicesService.trustDevice(userId, id, trusted, ip, ua);

      const response: ApiResponse<DeviceResponse> = {
        success: true,
        data: device,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  removeDevice: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params as { id: string };
      const ip = req.ip ?? req.socket.remoteAddress ?? '';
      const ua = req.headers['user-agent'] ?? '';

      await devicesService.removeDevice(userId, id, ip, ua);

      const response: ApiResponse = {
        success: true,
        message: 'Device removed successfully',
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };
}

export const devicesController = new DevicesController();
