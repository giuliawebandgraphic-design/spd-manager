/**
 * Utility functions for Google Drive URLs and PDF preview embeds
 */

export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  // Match /file/d/FILE_ID
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Match id=FILE_ID
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  return null;
}

export function isGoogleDriveLink(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com');
}

export function isPdfUrl(url: string, fileName?: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  if (clean.endsWith('.pdf')) return true;
  if (fileName && fileName.toLowerCase().endsWith('.pdf')) return true;
  if (url.startsWith('data:application/pdf')) return true;
  // Google Drive file links uploaded as proofs are typically PDFs
  if (url.includes('drive.google.com/file/d/')) return true;
  return false;
}

export function getEmbeddablePdfUrl(url: string): string {
  if (!url) return '';
  const driveId = extractGoogleDriveFileId(url);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }
  return url;
}

export function normalizeDriveFolderUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
