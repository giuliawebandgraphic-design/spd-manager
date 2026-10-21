import { Project, ProjectPlan } from '../types';
import { generateICalendarData, addDays } from './plannerEngine';

export interface GoogleCalendarEvent {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
}

// Google Calendar OAuth Scopes required for Calendar scheduling
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

export function downloadICalendarFile(projects: Project[], plans: Record<string, ProjectPlan>) {
  const icsData = generateICalendarData(projects, plans);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `sage_paper_studio_planning_${new Date().toISOString().slice(0, 10)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createGoogleCalendarEventLink(
  title: string,
  details: string,
  startDateIso: string,
  endDateIso?: string
): string {
  const sDate = startDateIso.replace(/-/g, '');
  const eDate = (endDateIso ? addDays(endDateIso, 1) : addDays(startDateIso, 1)).replace(/-/g, '');
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', title);
  url.searchParams.set('details', details);
  url.searchParams.set('dates', `${sDate}/${eDate}`);
  return url.toString();
}

/**
 * Client-side OAuth 2.0 flow for Google Calendar API
 */
export async function requestGoogleCalendarToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if google token client is loaded or open popup
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available'));
    }

    const redirectUri = window.location.origin;
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(GOOGLE_CALENDAR_SCOPES.join(' '))}&` +
      `include_granted_scopes=true&` +
      `state=sage_gcal_sync`;

    // Inform user if popup blocked
    const popup = window.open(authUrl, 'google_oauth_popup', 'width=550,height=650');
    if (!popup) {
      reject(new Error('Popup bloccato dal browser. Abilita i popup per autorizzare Google Calendar.'));
      return;
    }

    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('Finestra di autorizzazione chiusa.'));
          return;
        }

        const href = popup.location.href;
        if (href && href.includes('access_token=')) {
          clearInterval(timer);
          const params = new URLSearchParams(popup.location.hash.slice(1));
          const token = params.get('access_token');
          popup.close();
          if (token) resolve(token);
          else reject(new Error('Nessun access token ricevuto.'));
        }
      } catch {
        // Cross-origin access pending
      }
    }, 500);
  });
}

/**
 * Push an event to Google Calendar API via user OAuth Bearer token
 */
export async function pushEventToGoogleCalendar(
  accessToken: string,
  event: GoogleCalendarEvent,
  calendarId: string = 'primary'
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { date: event.start.date },
          end: { date: event.end.date },
        }),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error?.message || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Errore di rete durante la sincronizzazione.' };
  }
}
