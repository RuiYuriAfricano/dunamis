import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { BadRequestException, Logger } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { nanoid } from 'nanoid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const logger = new Logger('PaymentProofStorage');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const paymentProofMulterOptions = {
  storage: memoryStorage(),
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

// Anchored to this file's location (apps/api/dist/participants/), not process.cwd(),
// so the local fallback resolves consistently regardless of the directory the
// process is started from.
const LOCAL_UPLOADS_DIR = join(
  __dirname,
  '..',
  '..',
  'uploads',
  'payment-proofs',
);

let supabaseClient: SupabaseClient | null | undefined;

/**
 * Returns a cached Supabase client if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * are configured, otherwise null. Storage falls back to local disk when null,
 * which is fine for local development but does not survive a redeploy on most
 * free hosts — configure these two env vars in production.
 */
function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    logger.warn(
      'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não definidos — comprovativos de pagamento vão ser guardados no disco local (não sobrevive a um redeploy em produção).',
    );
    supabaseClient = null;
    return null;
  }

  supabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return supabaseClient;
}

function saveToLocalDisk(filename: string, buffer: Buffer): string {
  if (!existsSync(LOCAL_UPLOADS_DIR)) {
    mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
  writeFileSync(join(LOCAL_UPLOADS_DIR, filename), buffer);
  return `payment-proofs/${filename}`;
}

/**
 * Stores an uploaded payment proof and returns a value that can later be
 * resolved to a URL: a full https:// URL when using Supabase Storage, or a
 * path relative to /uploads when using the local disk fallback.
 */
export async function storePaymentProof(
  file: Express.Multer.File,
): Promise<string> {
  const filename = `${nanoid(24)}${extname(file.originalname).toLowerCase()}`;
  const client = getSupabaseClient();

  if (!client) {
    return saveToLocalDisk(filename, file.buffer);
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'payment-proofs';
  const { error } = await client.storage
    .from(bucket)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    logger.error(
      `Falha ao carregar comprovativo para o Supabase: ${error.message}`,
    );
    throw new BadRequestException(
      'Não foi possível guardar o comprovativo. Tente novamente.',
    );
  }

  const { data } = client.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}
