import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { mediaController } from './controller/index.js';
import {
  imageUpload,
  videoUpload,
  audioUpload,
  documentUpload,
  mediaUpload,
} from '../../uploads/multer.js';

const router = Router();
router.use(authenticate);

router.post(
  '/upload',
  mediaUpload.single('file'),
  mediaController.uploadSingle.bind(mediaController),
);
router.post(
  '/upload/batch',
  mediaUpload.array('files', 10),
  mediaController.uploadMultiple.bind(mediaController),
);
router.post(
  '/upload/image',
  imageUpload.single('file'),
  mediaController.uploadSingle.bind(mediaController),
);
router.post(
  '/upload/video',
  videoUpload.single('file'),
  mediaController.uploadSingle.bind(mediaController),
);
router.post(
  '/upload/audio',
  audioUpload.single('file'),
  mediaController.uploadSingle.bind(mediaController),
);
router.post(
  '/upload/document',
  documentUpload.single('file'),
  mediaController.uploadSingle.bind(mediaController),
);

router.get('/', mediaController.getConversationMedia.bind(mediaController));
router.get('/:id', mediaController.getMedia.bind(mediaController));
router.delete('/:id', mediaController.deleteMedia.bind(mediaController));

export default router;
