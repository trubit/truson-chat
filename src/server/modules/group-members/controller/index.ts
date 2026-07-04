import type { Request, Response, NextFunction } from 'express';
import { groupMemberService } from '../service/index.js';

export class GroupMemberController {

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '50', role } = req.query as { page?: string; limit?: string; role?: string };
      const data = await groupMemberService.getMembers(req.user!.id, String(req.params.id), {
        page: Number(page), limit: Number(limit), role,
      });
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupMemberService.addMember(req.user!.id, String(req.params.id), String(req.params.userId));
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.body as { role: string };
      const data = await groupMemberService.updateRole(
        req.user!.id, String(req.params.id), String(req.params.userId), role as import('../../../../shared/types/group.js').GroupMemberRole,
      );
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async kickMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupMemberService.kickMember(req.user!.id, String(req.params.id), String(req.params.userId));
      res.status(200).json({ success: true, data: null });
    } catch (err) { next(err); }
  }

  async banMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason, expiresAt } = req.body as { reason?: string; expiresAt?: string };
      await groupMemberService.banMember(req.user!.id, String(req.params.id), String(req.params.userId), { reason, expiresAt });
      res.status(200).json({ success: true, data: null });
    } catch (err) { next(err); }
  }

  async liftBan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupMemberService.liftBan(req.user!.id, String(req.params.id), String(req.params.userId));
      res.status(200).json({ success: true, data: null });
    } catch (err) { next(err); }
  }

  async muteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { expiresAt } = req.body as { expiresAt?: string };
      await groupMemberService.muteMember(req.user!.id, String(req.params.id), String(req.params.userId), { expiresAt });
      res.status(200).json({ success: true, data: null });
    } catch (err) { next(err); }
  }

  async unmuteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupMemberService.unmuteMember(req.user!.id, String(req.params.id), String(req.params.userId));
      res.status(200).json({ success: true, data: null });
    } catch (err) { next(err); }
  }

  async getBannedMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupMemberService.getBannedMembers(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const groupMemberController = new GroupMemberController();
