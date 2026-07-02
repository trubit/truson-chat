import type { Request, Response, NextFunction } from 'express';
import type { ContactsService } from '../service/index.js';
import type { ContactListQuery, CreateContactDto, UpdateContactDto } from '../types/index.js';

export class ContactController {
  constructor(private readonly service: ContactsService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ContactListQuery;
      const result = await this.service.getContacts(req.user!.id, query);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateContactDto;
      const result = await this.service.addContact(req.user!.id, dto);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contactId } = req.params as { contactId: string };
      const result = await this.service.getContact(req.user!.id, contactId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contactId } = req.params as { contactId: string };
      const dto = req.body as UpdateContactDto;
      const result = await this.service.updateContact(req.user!.id, contactId, dto);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contactId } = req.params as { contactId: string };
      await this.service.removeContact(req.user!.id, contactId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  toggleFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contactId } = req.params as { contactId: string };
      const result = await this.service.toggleFavorite(req.user!.id, contactId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q } = req.query as { q: string };
      const result = await this.service.searchContacts(req.user!.id, q);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  export = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.exportContacts(req.user!.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  importPrep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userIds } = req.body as { userIds: string[] };
      const result = await this.service.prepareImport(req.user!.id, userIds);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}
