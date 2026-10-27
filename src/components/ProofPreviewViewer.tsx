import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Proof } from '../types';
import { isPdfUrl, getEmbeddablePdfUrl, isGoogleDriveLink } from '../lib/driveUtils';

interface ProofPreviewViewerProps {
  proof: Proof;
  allowFullScreen?: boolean;
}

export const ProofPreviewViewer: React.FC<ProofPreviewViewerProps> = ({
  proof,
  allowFullScreen = true,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const isPdf = isPdfUrl(proof.fileUrl, proof.fileName);
  const isDrive = isGoogleDriveLink(proof.fileUrl);
  const embedUrl = getEmbeddablePdfUrl(proof.fileUrl);

  const fallbackViewerUrl = isPdf && !isDrive
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(proof.fileUrl)}&embedded=true`
    : embedUrl;

  const renderContent = (inModal = false) => {
    if (isPdf) {
      return (
        <div className="w-full flex flex-col items-center">
          {/* PDF Viewer Container */}
          <div
            className={`w-full rounded-2xl overflow-hidden border border-[#d8e4d6] bg-white shadow-xs relative ${
              inModal ? 'h-[80vh]' : 'h-[540px]'
            }`}
          >
            {!iframeError ? (
              <iframe
                src={fallbackViewerUrl}
                title={proof.title}
                className="w-full h-full border-0 rounded-2xl"
                allow="autoplay"
                onError={() => setIframeError(true)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-[#fafbf9]">
                <FileText className="w-12 h-12 text-[#244d3b] mb-2" />
                <h4 className="text-sm font-bold text-[#21362d]">Anteprima PDF Protetta</h4>
                <p className="text-xs text-[#78867d] max-w-md mt-1 mb-4">
                  Il file PDF può essere visualizzato direttamente aprendolo in una nuova scheda o scaricandolo in alta risoluzione.
                </p>
                <div className="flex gap-2">
                  <a
                    href={proof.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-[#244d3b] text-white text-xs font-bold shadow-xs hover:bg-[#1b3d2e] flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" /> Apri PDF in nuova scheda
                  </a>
                  <a
                    href={proof.fileUrl}
                    download={proof.fileName || 'bozza.pdf'}
                    className="px-4 py-2 rounded-xl border border-[#ccd6ca] text-[#244d3b] text-xs font-semibold hover:bg-[#edf2eb] flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Scarica
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default image rendering
    return (
      <div className="w-full flex flex-col items-center justify-center">
        <div
          className={`relative w-full rounded-2xl overflow-hidden shadow-xs flex items-center justify-center bg-white border border-[#e5e9e3] ${
            inModal ? 'max-h-[82vh]' : 'max-h-[440px]'
          }`}
        >
          <img
            src={proof.fileUrl}
            alt={proof.title}
            className="w-full h-auto object-contain max-h-[440px]"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* File Top Bar info & Quick Controls */}
      <div className="p-3 bg-[#fafbf9] rounded-2xl border border-[#e5e9e3] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center shrink-0">
            {isPdf ? <FileText className="w-4 h-4 text-[#b74338]" /> : <Eye className="w-4 h-4 text-[#244d3b]" />}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[#68816e] uppercase tracking-wider block">
              {isPdf ? 'Documento Bozza PDF' : 'Immagine Bozza'} (v{proof.version})
            </span>
            <h4 className="text-xs font-semibold text-[#21362d] truncate">{proof.title}</h4>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          {allowFullScreen && (
            <button
              onClick={() => setIsFullScreen(true)}
              className="p-1.5 px-2.5 rounded-lg border border-[#ccd6ca] bg-white text-[#244d3b] hover:bg-[#edf2eb] text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
              title="Visualizza a schermo intero"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Schermo Intero</span>
            </button>
          )}

          <a
            href={proof.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 px-2.5 rounded-lg border border-[#ccd6ca] bg-white text-[#244d3b] hover:bg-[#edf2eb] text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
            title="Apri link originale in una nuova finestra"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Apri Link</span>
          </a>

          <a
            href={proof.fileUrl}
            download={proof.fileName || 'bozza'}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 px-2.5 rounded-lg bg-[#244d3b] text-white hover:bg-[#1b3d2e] text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
            title="Scarica file originale ad alta risoluzione"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Scarica</span>
          </a>
        </div>
      </div>

      {/* Main Preview */}
      {renderContent(false)}

      {/* Full Screen Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#dae6d8] flex flex-col max-h-[95vh]">
            <div className="p-4 bg-[#fafbf9] border-b border-[#e5e9e3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#244d3b]" />
                <span className="font-serif text-base font-normal text-[#21362d]">
                  {proof.title} (v{proof.version})
                </span>
                {isPdf && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fdf0ed] text-[#b74338] border border-[#f5c6cb]">
                    PDF
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={proof.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-[#ccd6ca] text-xs font-semibold text-[#244d3b] hover:bg-[#edf2eb] flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Apri originale
                </a>
                <button
                  onClick={() => setIsFullScreen(false)}
                  className="p-1.5 rounded-xl hover:bg-[#edf2eb] text-[#5d6e64]"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-[#f0f3ee]">
              {renderContent(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
