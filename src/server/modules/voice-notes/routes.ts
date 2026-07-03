import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { voiceNoteController } from './controller/index.js';
import { audioUpload } from '../../uploads/multer.js';

const router = Router();
router.use(authenticate);

router.post('/upload', audioUpload.single('file'), voiceNoteController.upload.bind(voiceNoteController));
router.get('/:id', voiceNoteController.getVoiceNote.bind(voiceNoteController));

export default router;
