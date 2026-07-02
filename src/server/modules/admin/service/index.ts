import { UserModel } from '../../../database/models/index.js';
import { AppError } from '../../../middlewares/errorHandler.js';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export class AdminService {
  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [
      total,
      active,
      suspended,
      pendingVerification,
      deleted,
      admins,
      business,
      newToday,
      newThisWeek,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ status: 'active' }),
      UserModel.countDocuments({ status: 'suspended' }),
      UserModel.countDocuments({ status: 'pending_verification' }),
      UserModel.countDocuments({ status: 'deleted' }),
      UserModel.countDocuments({ role: 'admin' }),
      UserModel.countDocuments({ role: 'business' }),
      UserModel.countDocuments({ createdAt: { $gte: startOfToday } }),
      UserModel.countDocuments({ createdAt: { $gte: startOfWeek } }),
    ]);

    return {
      users: {
        total,
        active,
        suspended,
        pendingVerification,
        deleted,
        admins,
        business,
        newToday,
        newThisWeek,
      },
    };
  }

  async getGrowthData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const raw = await UserModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return raw.map((d) => ({ date: d._id, users: d.count }));
  }

  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const { page, limit, search, role, status } = params;
    const filter: Record<string, unknown> = {};

    if (search) {
      filter['$or'] = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) filter['role'] = role;
    if (status) filter['status'] = status;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select('-passwordHash -twoFactorSecret')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended') {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { status },
      { new: true, select: '-passwordHash -twoFactorSecret' },
    ).lean();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
  }

  async updateUserRole(userId: string, role: 'user' | 'admin' | 'business') {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { role },
      { new: true, select: '-passwordHash -twoFactorSecret' },
    ).lean();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
  }

  getSystemInfo() {
    const uptimeSeconds = process.uptime();
    const mem = process.memoryUsage();
    return {
      uptime: uptimeSeconds,
      uptimeHuman: formatUptime(uptimeSeconds),
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env['NODE_ENV'] ?? 'unknown',
    };
  }
}

export const adminService = new AdminService();
