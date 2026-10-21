/**
 * Gmail Integration Helper for Sage Paper Design
 * All email actions across the app reliably open Google Gmail web composer in a new tab.
 */

export const STUDIO_GMAIL = 'sagepaperdesign@gmail.com';

export interface GmailComposeOptions {
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

/**
 * Builds the direct Gmail web compose URL.
 * Works seamlessly in Chrome, Safari, Edge, Firefox on desktop and mobile.
 */
export function getGmailComposeUrl(options: GmailComposeOptions = {}): string {
  const { to = '', subject = '', body = '', cc = '', bcc = '' } = options;
  const params = new URLSearchParams();
  params.set('view', 'cm');
  params.set('fs', '1');
  params.set('tf', '1');

  if (to) params.set('to', to);
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  if (cc) params.set('cc', cc);
  if (bcc) params.set('bcc', bcc);

  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Opens Gmail compose in a new browser tab.
 * Uses an anchor element with target="_blank" and rel="noopener noreferrer"
 * to ensure maximum compatibility inside iframe environments.
 */
export function openGmail(options: GmailComposeOptions = {}): void {
  const url = getGmailComposeUrl(options);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
