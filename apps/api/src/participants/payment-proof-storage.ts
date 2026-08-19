import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { nanoid } from 'nanoid';

// Anchored to this file's location (apps/api/dist/participants/), not process.cwd(),
// so uploads resolve consistently regardless of the directory the process is started from.
export const PAYMENT_PROOFS_DIR = join(
  __dirname,
  '..',
  '..',
  'uploads',
  'payment-proofs',
);

if (!existsSync(PAYMENT_PROOFS_DIR)) {
  mkdirSync(PAYMENT_PROOFS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const paymentProofMulterOptions = {
  storage: diskStorage({
    destination: PAYMENT_PROOFS_DIR,
    filename: (_req, file, callback) => {
      callback(
        null,
        `${nanoid(24)}${extname(file.originalname).toLowerCase()}`,
      );
    },
  }),
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException(
          'Comprovativo deve ser uma imagem (JPG/PNG/WEBP) ou PDF.',
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};
