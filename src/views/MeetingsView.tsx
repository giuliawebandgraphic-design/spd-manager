import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Building,
  Users,
  CheckCircle2,
  CalendarPlus,
  Plus,
  Search,
  Filter,
  FileText,
  BookmarkCheck,
  ListTodo,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Check,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { Meeting, MeetingStatus, Project } from '../types';
import { useStudio } from '../context/StudioContext';
import { formatDateIt, TODAY_ISO } from '../lib/plannerEngine';
import { createGoogleMeetingCalendarLink } from '../lib/googleCalendar';
import { MeetingModal } from '../components/MeetingModal';

interface MeetingsViewProps {
  onSelectProject?: (project: Project) => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({ onSelectProject }) => {
  const { meetings, projects, clients, updateMeeting, deleteMeeting, showToast } = useStudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MeetingStatus>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);

  // Compute key metrics
  const totalMeetings = meetings.length;
  const scheduledMeetings = meetings.filter((m) => m.status === 'scheduled');
  const completedMeetings = meetings.filter((m) => m.status === 'completed');

  // Filter meetings
  const filteredMeetings = meetings.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (projectFilter !== 'all' && m.projectId !== projectFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = m.title.toLowerCase().includes(q);
      const inNotes = (m.notes || '').toLowerCase().includes(q);
      const inDecisions = (m.decisions || '').toLowerCase().includes(q);
      const inAttendees = (m.attendees || '').toLowerCase().includes(q);
      const proj = projects.find((p) => p.id === m.projectId);
      const inProject = proj ? proj.name.toLowerCase().includes(q) : false;
      return inTitle || inNotes || inDecisions || inAttendees || inProject;
    }

    return true;
  });

  // Sort by date: scheduled closest first, completed latest first
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    if (a.status === 'scheduled' && b.status === 'scheduled') {
      return a.date.localeCompare(b.date);
    }
    return b.date.localeCompare(a.date);
  });

  const handleOpenGCal = (meeting: Meeting) => {
    const proj = projects.find((p) => p.id === meeting.projectId);
    const client = clients.find((c) => c.id === meeting.clientId);
    const url = createGoogleMeetingCalendarLink({
      title: meeting.title,
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      locationType: meeting.locationType,
      locationDetails: meeting.locationDetails,
      attendees: meeting.attendees,
      notes: meeting.notes,
      decisions: meeting.decisions,
      actionItems: meeting.actionItems,
      clientName: client?.name,
      projectName: proj?.name,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyNotes = (m: Meeting) => {
    const proj = projects.find((p) => p.id === m.projectId);
    const lines = [
      `📋 RESOCONTO INCONTRO SPOSI · SAGE PAPER STUDIO`,
      `📅 Data: ${m.date} ore ${m.startTime || '10:00'}`,
      `💒 Incontro: ${m.title}`,
      proj ? `💍 Progetto: ${proj.name}` : '',
      m.attendees ? `👥 Partecipanti: ${m.attendees}` : '',
      m.locationDetails ? `📍 Luogo: ${m.locationDetails}` : '',
      '',
      m.notes ? `📝 APPUNTI & NOTE:\n${m.notes}\n` : '',
      m.decisions ? `✨ SCELTE & DECISIONI CONCORDATE:\n${m.decisions}\n` : '',
      m.actionItems ? `📌 PROSSIMI PASSI (TO-DO):\n${m.actionItems}\n` : '',
      `Sage Paper Studio Manager - sagepaperdesign@gmail.com`,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMeetingId(m.id);
    showToast('✓ Resoconto e appunti copiati negli appunti!');
    setTimeout(() => setCopiedMeetingId(null), 3000);
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <Video className="w-3.5 h-3.5 text-blue-600" />;
      case 'location':
        return <MapPin className="w-3.5 h-3.5 text-amber-600" />;
      case 'phone':
        return <Phone className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Building className="w-3.5 h-3.5 text-[#244d3b]" />;
    }
  };

  const getLocationLabel = (type: string) => {
    switch (type) {
      case 'online':
        return 'Videochiamata Google Meet';
      case 'location':
        return 'Sopralluogo Location';
      case 'phone':
        return 'Chiamata Telefonica';
      default:
        return 'Atelier Sage Paper';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#244d3b]" />
            <span className="text-[11px] font-bold tracking-widest text-[#68816e] uppercase">
              Consulenze & Matrimoni
            </span>
          </div>
          <h1 className="font-serif text-2xl lg:text-3xl font-semibold text-[#263a32] mt-1">
            Meeting & Incontri con gli Sposi
          </h1>
          <p className="text-xs text-[#78867d] mt-1 max-w-2xl leading-relaxed">
            Gestisci appuntamenti, prendi appunti dettagliati durante la consulenza, annota le scelte di
            stationery e sincronizza istantaneamente gli eventi con Google Calendar.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="https://calendar.google.com/calendar/r"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-[#d6ddd3] bg-white hover:bg-[#fafbf9] text-xs font-semibold text-[#55695d] flex items-center gap-2 shadow-xs transition-colors"
            title="Apri Google Calendar in una nuova scheda"
          >
            <CalendarDays className="w-4 h-4 text-[#244d3b]" />
            <span>Apri Google Calendar</span>
            <ExternalLink className="w-3 h-3 text-[#87968b]" />
          </a>

          <button
            onClick={() => {
              setEditingMeeting(null);
              setMeetingModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Incontro Sposi</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#e5e9e3] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#78867d] uppercase tracking-wider">
              In Programma
            </span>
            <div className="font-serif text-2xl font-bold text-[#244d3b] mt-1">
              {scheduledMeetings.length}
            </div>
            <p className="text-[10px] text-[#87968b] mt-0.5">Incontri futuri fissati</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#e5e9e3] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#78867d] uppercase tracking-wider">
              Completati
            </span>
            <div className="font-serif text-2xl font-bold text-[#263a32] mt-1">
              {completedMeetings.length}
            </div>
            <p className="text-[10px] text-[#87968b] mt-0.5">Consulenze effettuate</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#f0f4ed] text-[#4a6d54] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#e5e9e3] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#78867d] uppercase tracking-wider">
              Totale Incontri
            </span>
            <div className="font-serif text-2xl font-bold text-[#263a32] mt-1">
              {totalMeetings}
            </div>
            <p className="text-[10px] text-[#87968b] mt-0.5">Archivio appunti studio</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#f7f8f5] text-[#55695d] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e5e9e3] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#87968b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome sposi, titolo incontro o parole chiave negli appunti..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] outline-none text-xs text-[#263a32] placeholder-[#8f9e94]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex bg-[#f2f5f0] p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-[#244d3b] shadow-xs font-bold'
                  : 'text-[#68816e] hover:text-[#263a32]'
              }`}
            >
              Tutti ({meetings.length})
            </button>
            <button
              onClick={() => setStatusFilter('scheduled')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'scheduled'
                  ? 'bg-white text-[#244d3b] shadow-xs font-bold'
                  : 'text-[#68816e] hover:text-[#263a32]'
              }`}
            >
              In programma ({scheduledMeetings.length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'completed'
                  ? 'bg-white text-[#244d3b] shadow-xs font-bold'
                  : 'text-[#68816e] hover:text-[#263a32]'
              }`}
            >
              Completati ({completedMeetings.length})
            </button>
          </div>

          {/* Project dropdown filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#d6ddd3] focus:border-[#244d3b] outline-none bg-white text-xs font-medium text-[#263a32]"
          >
            <option value="all">Tutti i progetti nozze</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Meetings List */}
      {sortedMeetings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5e9e3] p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#263a32]">
            Nessun incontro trovato
          </h3>
          <p className="text-xs text-[#78867d] max-w-md mx-auto mt-1 mb-5">
            {searchQuery || statusFilter !== 'all' || projectFilter !== 'all'
              ? 'Nessun appuntamento corrisponde ai filtri selezionati. Prova a rimuovere i filtri.'
              : 'Pianifica il tuo primo incontro con gli sposi per prendere appunti di consulenza e sincronizzarlo su Google Calendar.'}
          </p>
          <button
            onClick={() => {
              setEditingMeeting(null);
              setMeetingModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#244d3b] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 hover:bg-[#1e3f30]"
          >
            <Plus className="w-4 h-4" />
            <span>Pianifica Incontro con gli Sposi</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMeetings.map((meeting) => {
            const project = projects.find((p) => p.id === meeting.projectId);
            const isCompleted = meeting.status === 'completed';
            const isCancelled = meeting.status === 'cancelled';
            const isToday = meeting.date === TODAY_ISO();

            return (
              <div
                key={meeting.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isToday
                    ? 'border-[#244d3b] ring-1 ring-[#244d3b]/20'
                    : isCompleted
                    ? 'border-[#e2e7df] opacity-90'
                    : 'border-[#e5e9e3] hover:border-[#ccd5c9]'
                }`}
              >
                {/* Meeting Card Header */}
                <div className="p-5 border-b border-[#f0f3ee] bg-[#fafbf9] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Date Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                          isToday
                            ? 'bg-[#244d3b] text-white'
                            : 'bg-[#edf2eb] text-[#244d3b]'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateIt(meeting.date)}</span>
                        {isToday && <span className="uppercase text-[9px] bg-white/20 px-1 rounded font-bold">Oggi</span>}
                      </span>

                      {/* Time */}
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#e2e7df] text-xs font-medium text-[#55695d] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#87968b]" />
                        <span>
                          {meeting.startTime}
                          {meeting.endTime ? ` - ${meeting.endTime}` : ''}
                        </span>
                      </span>

                      {/* Status */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isCompleted ? '✓ Completato' : isCancelled ? 'Annullato' : '● In programma'}
                      </span>

                      {/* Location Badge */}
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#e2e7df] text-[11px] font-medium text-[#55695d] flex items-center gap-1">
                        {getLocationIcon(meeting.locationType)}
                        <span>{getLocationLabel(meeting.locationType)}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-lg font-bold text-[#263a32] pt-1">
                      {meeting.title}
                    </h3>

                    {/* Project and attendees */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#68816e]">
                      {project && (
                        <button
                          type="button"
                          onClick={() => onSelectProject && onSelectProject(project)}
                          className="font-medium text-[#244d3b] hover:underline flex items-center gap-1"
                          title="Apri scheda di questo progetto"
                        >
                          <span>💍 Progetto: {project.name}</span>
                          <ExternalLink className="w-3 h-3 text-[#244d3b]" />
                        </button>
                      )}

                      {meeting.attendees && (
                        <span className="flex items-center gap-1 text-[#6b7b70]">
                          <Users className="w-3.5 h-3.5 text-[#87968b]" />
                          <span>{meeting.attendees}</span>
                        </span>
                      )}

                      {meeting.locationDetails && (
                        <span className="text-[#78867d] italic">
                          ({meeting.locationDetails})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                    {/* Add to Google Calendar button */}
                    <button
                      type="button"
                      onClick={() => handleOpenGCal(meeting)}
                      className="px-3 py-1.5 rounded-xl border border-[#244d3b]/30 bg-white hover:bg-[#edf2eb] text-[#244d3b] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      title="Aggiungi / Apri questo incontro su Google Calendar con tutti gli appunti e dettagli"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-[#244d3b]" />
                      <span>Google Calendar</span>
                    </button>

                    {/* Copy notes for couple / WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleCopyNotes(meeting)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#e2e7df] bg-white hover:bg-[#edf2eb] text-xs font-medium text-[#55695d] flex items-center gap-1 transition-colors"
                      title="Copia appunti e decisioni formattati per inviarli agli sposi via WhatsApp o Email"
                    >
                      {copiedMeetingId === meeting.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#68816e]" />
                          <span>Copia per Sposi</span>
                        </>
                      )}
                    </button>

                    {/* Status toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        updateMeeting(meeting.id, {
                          status: isCompleted ? 'scheduled' : 'completed',
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                        isCompleted
                          ? 'border-gray-200 text-gray-500 hover:bg-gray-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title={isCompleted ? 'Riporta a in programma' : 'Segna come completato'}
                    >
                      {isCompleted ? 'Riapri' : '✓ Fatto'}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMeeting(meeting);
                        setMeetingModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#e2e7df] text-[#55695d] hover:bg-[#edf2eb] hover:text-[#244d3b] transition-colors"
                      title="Modifica appunti o data incontro"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Eliminare l'incontro "${meeting.title}"?`)) {
                          deleteMeeting(meeting.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-transparent text-[#9ea9a2] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Elimina incontro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meeting Notes Content */}
                <div className="p-5 space-y-4 text-xs">
                  {/* Notes / Minutes */}
                  {meeting.notes ? (
                    <div className="bg-[#fcfdfa] border border-[#eef2ea] rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-[#244d3b] mb-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#244d3b]" />
                        <span>Appunti & Note dell'Incontro:</span>
                      </div>
                      <p className="text-[#38483f] whitespace-pre-line leading-relaxed">
                        {meeting.notes}
                      </p>
                    </div>
                  ) : (
                    <div className="text-[#8a968c] italic bg-[#fafbf9] border border-dashed border-[#e5e9e3] rounded-xl p-3 text-center">
                      Nessun appunto registrato per questo incontro.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMeeting(meeting);
                          setMeetingModalOpen(true);
                        }}
                        className="text-[#244d3b] font-semibold underline not-italic hover:text-[#1e3f30]"
                      >
                        Aggiungi appunti ora
                      </button>
                    </div>
                  )}

                  {/* Decisions & To-Do grid */}
                  {(meeting.decisions || meeting.actionItems) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      {meeting.decisions && (
                        <div className="bg-[#f7f9f6] border border-[#e5ece2] rounded-xl p-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-[#263a32] mb-1">
                            <BookmarkCheck className="w-3.5 h-3.5 text-[#244d3b]" />
                            <span>Decisioni & Scelte Concordate:</span>
                          </div>
                          <p className="text-[#45574c] whitespace-pre-line leading-relaxed">
                            {meeting.decisions}
                          </p>
                        </div>
                      )}

                      {meeting.actionItems && (
                        <div className="bg-[#fffcf7] border border-[#f0e8d5] rounded-xl p-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-[#8c6523] mb-1">
                            <ListTodo className="w-3.5 h-3.5 text-[#8c6523]" />
                            <span>Prossimi Passi (To-Do List):</span>
                          </div>
                          <p className="text-[#594723] whitespace-pre-line leading-relaxed">
                            {meeting.actionItems}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Meeting Modal */}
      <MeetingModal
        isOpen={meetingModalOpen}
        onClose={() => {
          setMeetingModalOpen(false);
          setEditingMeeting(null);
        }}
        meeting={editingMeeting}
      />
    </div>
  );
};
