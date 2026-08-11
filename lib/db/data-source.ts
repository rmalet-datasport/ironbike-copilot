// SERVEUR UNIQUEMENT — helper partagé par participants.ts et prospects.ts. En local, chaque
// collègue garde sa copie des fichiers data/ (jamais commitée, voir CLAUDE.md §Données). En prod
// (Vercel), ces fichiers n'existent pas dans le déploiement : ils sont lus depuis un store Vercel
// Blob privé à la place. BLOB_READ_WRITE_TOKEN est fourni automatiquement par Vercel une fois le
// store lié au projet ; en local, le fichier existe déjà donc ce chemin n'est jamais pris.
import fs from 'fs';
import { get } from '@vercel/blob';

export async function readLocalOrBlob(localPath: string, blobPathname: string): Promise<Buffer | null> {
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const result = await get(blobPathname, { access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    console.error(`[data-source] Blob fallback failed for ${blobPathname}`, err);
    return null;
  }
}
