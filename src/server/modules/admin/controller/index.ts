import type { Request, Response, NextFunction } from 'express';
import { adminService } from '../service/index.js';

function toNum(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getGrowthData(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await adminService.getGrowthData();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = toNum(req.query['page'], 1);
    const limit = Math.min(toNum(req.query['limit'], 20), 100);
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const role = typeof req.query['role'] === 'string' ? req.query['role'] : undefined;
    const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;

    const data = await adminService.listUsers({ page, limit, search, role, status });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: 'active' | 'suspended' };
    const data = await adminService.updateUserStatus(id, status);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { role } = req.body as { role: 'user' | 'admin' | 'business' };
    const data = await adminService.updateUserRole(id, role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export function getSystemInfo(_req: Request, res: Response, next: NextFunction): void {
  try {
    const data = adminService.getSystemInfo();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
