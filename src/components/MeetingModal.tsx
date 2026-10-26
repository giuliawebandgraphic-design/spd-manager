import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Building,
  Users,
  CheckCircle2,
  CalendarPlus,
  Sparkles,
  FileText,
  BookmarkCheck,
  ListTodo,
} from 'lucide-react';
import { Meeting, MeetingLocationType, MeetingStatus } from '../types';
import { useStudio } from '../context/StudioContext';
import { TODAY_ISO } from '../lib/plannerEngine';
import { createGoogleMeetingCalendarLink } from '../lib/googleCalendar';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting?: Meeting | null;
  defaultProjectId?: string;
  defaultClientId?: string;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({
  isOpen,
  onClose,
  meeting,
  defaultProjectId,
  defaultClientId,
}) => {
  const { projects, clients, createMeeting, updateMeeting } = useStudio();

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [date, setDate] = useState(TODAY_ISO());
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:00');
  const [locationType, setLocationType] = useState<MeetingLocationType>('studio');
  const [locationDetails, setLocationDetails] = useState('');
  const [status, setStatus] = useState<MeetingStatus>('scheduled');
  const [attendees, setAttendees] = useState('');
  const [notes, setNotes] = useState('');
  const [decisions, setDecisions] = useState('');
  const [actionItems, setActionItems] = useState('');

  // Sync state when opening or changing meeting
  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || '');
      setProjectId(meeting.projectId || '');
      setClientId(meeting.clientId || '');
      setDate(meeting.date || TODAY_ISO());
      setStartTime(meeting.startTime || '15:00');
      setEndTime(meeting.endTime || '16:00');
      setLocationType(meeting.locationType || 'studio');
      setLocationDetails(meeting.locationDetails || '');
      setStatus(meeting.status || 'scheduled');
      setAttendees(meeting.attendees || '');
      setNotes(meeting.notes || '');
      setDecisions(meeting.decisions || '');
      setActionItems(meeting.actionItems || '');
    } else {
      const initialProjId = defaultProjectId || '';
      const proj = projects.find((p) => p.id === initialProjId);
      const initialClientId = defaultClientId || proj?.clientId || '';
      const client = clients.find((c) => c.id === initialClientId);

      setTitle(proj ? `Consulenza Sposi · ${proj.name}` : 'Consulenza Iniziale & Moodboard Sposi');
      setProjectId(initialProjId);
      setClientId(initialClientId);
      setDate(TODAY_ISO());
      setStartTime('15:00');
      setEndTime('16:00');
      setLocationType('studio');
      setLocationDetails('Atelier Sage Paper Studio · Via Roma 12');
      setStatus('scheduled');
      setAttendees(client ? `${client.name} (Sposi), Giulia` : 'Sposi, Giulia');
      setNotes('');
      setDecisions('');
      setActionItems('');
    }
  }, [meeting, defaultProjectId, defaultClientId, isOpen, projects, clients]);

  // When project changes, auto-set client and attendees if not set
  const handleProjectChange = (selectedProjId: string) => {
    setProjectId(selectedProjId);
    const proj = projects.find((p) => p.id === selectedProjId);
    if (proj && proj.clientId) {
      setClientId(proj.clientId);
      const client = clients.find((c) => c.id === proj.clientId);
      if (client && !attendees) {
        setAttendees(`${client.name} (Sposi), Giulia`);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (openGoogleCalendar: boolean = false) => {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      projectId: projectId || undefined,
      clientId: clientId || undefined,
      date,
      startTime: startTime || '10:00',
      endTime: endTime || '11:00',
      locationType,
      locationDetails: locationDetails.trim() || undefined,
      status,
      attendees: attendees.trim() || undefined,
      notes: notes.trim() || undefined,
      decisions: decisions.trim() || undefined,
      actionItems: actionItems.trim() || undefined,
    };

    let savedMeeting: Meeting;
    if (meeting) {
      updateMeeting(meeting.id, payload);
      savedMeeting = { ...meeting, ...payload, updatedAt: TODAY_ISO() };
    } else {
      savedMeeting = createMeeting(payload);
    }

    if (openGoogleCalendar) {
      const relatedProject = projects.find((p) => p.id === projectId);
      const relatedClient = clients.find((c) => c.id === clientId);
      const gcalUrl = createGoogleMeetingCalendarLink({
        title: savedMeeting.title,
        date: savedMeeting.date,
        startTime: savedMeeting.startTime,
        endTime: savedMeeting.endTime,
        locationType: savedMeeting.locationType,
        locationDetails: savedMeeting.locationDetails,
        attendees: savedMeeting.attendees,
        notes: savedMeeting.notes,
        decisions: savedMeeting.decisions,
        actionItems: savedMeeting.actionItems,
        clientName: relatedClient?.name,
        projectName: relatedProject?.name,
      });

      window.open(gcalUrl, '_blank', 'noopener,noreferrer');
    }

    onClose();
  };

  // Quick preset templates
  const presets = [
    'Consulenza Iniziale & Moodboard Sposi',
    'Presentazione 2 Proposte Grafiche Partecipazioni',
    'Revisione Bozze e Scelta Carta & Palette',
    'Verifica Coordinati Banchetto & Tableau',
    'Visione Campione Finale e Consegna',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e382e]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e5e9e3] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#eef2ec] flex items-center justify-between bg-[#fafbf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#263a32]">
                {meeting ? 'Modifica Incontro Sposi & Appunti' : 'Pianifica Incontro con gli Sposi'}
              </h2>
              <p className="text-xs text-[#78867d]">
                Prendi appunti di consulenza e sincronizza l'evento su Google Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#78867d] hover:bg-[#edf2eb] hover:text-[#263a32] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#263a32]">
          {/* Quick presets buttons */}
          {!meeting && (
            <div>
              <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1.5">
                Modelli Frequenti di Incontro
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTitle(preset)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                      title === preset
                        ? 'bg-[#244d3b] text-white border-[#244d3b] font-medium'
                        : 'bg-[#fafbf9] border-[#e2e7df] text-[#55695d] hover:border-[#244d3b] hover:text-[#244d3b]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title input */}
          <div>
            <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1">
              Oggetto / Titolo Incontro *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Consulenza Iniziale & Scelta Palette Sposi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] outline-none font-medium text-xs text-[#263a32]"
            />
          </div>

          {/* Project & Client selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1">
                Progetto Nozze Collegato
              </label>
              <select
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none bg-white text-xs font-medium text-[#263a32]"
              >
                <option value="">-- Nessun progetto specifico --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.eventDate ? `(${p.eventDate})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1">
                Coppia / Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none bg-white text-xs font-medium text-[#263a32]"
              >
                <option value="">-- Seleziona cliente / sposi --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1">
                Data Incontro *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1">
                Ora Inizio *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1">
                Ora Fine
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none text-xs font-medium"
              />
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1">
                Modalità & Luogo
              </label>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationType('studio');
                    setLocationDetails('Atelier Sage Paper Studio · Via Roma 12');
                  }}
                  className={`py-1.5 px-1 rounded-lg border text-center flex flex-col items-center gap-1 transition-all ${
                    locationType === 'studio'
                      ? 'bg-[#edf2eb] border-[#244d3b] text-[#244d3b] font-bold'
                      : 'border-[#e2e7df] text-[#55695d] hover:bg-gray-50'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationType('online');
                    setLocationDetails('Google Meet (link generato su Calendar)');
                  }}
                  className={`py-1.5 px-1 rounded-lg border text-center flex flex-col items-center gap-1 transition-all ${
                    locationType === 'online'
                      ? 'bg-[#edf2eb] border-[#244d3b] text-[#244d3b] font-bold'
                      : 'border-[#e2e7df] text-[#55695d] hover:bg-gray-50'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Meet</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationType('location');
                    setLocationDetails('Location Matrimonio / Sopralluogo');
                  }}
                  className={`py-1.5 px-1 rounded-lg border text-center flex flex-col items-center gap-1 transition-all ${
                    locationType === 'location'
                      ? 'bg-[#edf2eb] border-[#244d3b] text-[#244d3b] font-bold'
                      : 'border-[#e2e7df] text-[#55695d] hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Location</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationType('phone');
                    setLocationDetails('Chiamata Telefonica');
                  }}
                  className={`py-1.5 px-1 rounded-lg border text-center flex flex-col items-center gap-1 transition-all ${
                    locationType === 'phone'
                      ? 'bg-[#edf2eb] border-[#244d3b] text-[#244d3b] font-bold'
                      : 'border-[#e2e7df] text-[#55695d] hover:bg-gray-50'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Telefono</span>
                </button>
              </div>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="Indirizzo studio o link videochiamata"
                className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#68816e] uppercase tracking-wider mb-1">
                Stato & Partecipanti
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MeetingStatus)}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none bg-white text-xs font-semibold"
                >
                  <option value="scheduled">In programma</option>
                  <option value="completed">Completato</option>
                  <option value="cancelled">Annullato</option>
                </select>
              </div>
              <input
                type="text"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="es. Sofia & Marco (Sposi), Giulia"
                className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none text-xs font-medium"
              />
            </div>
          </div>

          {/* Section: Notes / Minutes taking */}
          <div className="border-t border-[#edf2ea] pt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#244d3b]">
                  <FileText className="w-3.5 h-3.5 text-[#244d3b]" />
                  <span>Appunti & Note dell'Incontro con gli Sposi</span>
                </label>
                <span className="text-[10px] text-[#78867d]">
                  Richieste sposi, stile desiderato, impressioni campionari
                </span>
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scrivi qui gli appunti presi prima, durante o dopo la consulenza... (es. Desiderano partecipazioni eleganti con carta cotone Amalfi, busta foderata verde salvia, nastri in chiffon e ceralacca personalizzata. Budget orientativo 450€)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] outline-none text-xs text-[#263a32] placeholder-[#8f9e94] leading-relaxed resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#263a32] mb-1">
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#244d3b]" />
                  <span>Decisioni & Scelte Concordate</span>
                </label>
                <textarea
                  rows={3}
                  value={decisions}
                  onChange={(e) => setDecisions(e.target.value)}
                  placeholder="es. Palette: Verde Salvia e dettagli oro; Carta: Amalfi 300g; Quantità: 85 pz..."
                  className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none text-xs text-[#263a32] leading-relaxed resize-y"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#263a32] mb-1">
                  <ListTodo className="w-3.5 h-3.5 text-[#244d3b]" />
                  <span>Prossimi Passi (To-Do List)</span>
                </label>
                <textarea
                  rows={3}
                  value={actionItems}
                  onChange={(e) => setActionItems(e.target.value)}
                  placeholder="es. 1. Giulia prepara 2 bozze digitali entro venerdì; 2. Sposi inviano testi definitivi..."
                  className="w-full px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none text-xs text-[#263a32] leading-relaxed resize-y"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#eef2ec] bg-[#fafbf9] flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5d6e64] hover:bg-[#edf2eb] transition-colors"
          >
            Annulla
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="px-3.5 py-2 rounded-xl border border-[#244d3b]/30 bg-white hover:bg-[#edf2eb] text-[#244d3b] text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              title="Salva e apri direttamente la pagina di aggiunta evento in Google Calendar con tutti i dati pre-compilati"
            >
              <CalendarPlus className="w-4 h-4 text-[#244d3b]" />
              <span>Salva e Aggiungi a Google Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="px-5 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {meeting ? 'Aggiorna Incontro' : 'Salva Incontro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
