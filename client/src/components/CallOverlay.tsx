import { useEffect, useRef, useState } from 'react';
import { useCall } from '../hooks/useCall';
import {
  Phone, PhoneOff, PhoneCall, Mic, MicOff, Video, VideoOff, User as UserIcon,
} from 'lucide-react';
import { getInitials } from '../lib/utils';

/* Floating overlay that renders incoming-call prompts and the active
 * call window. Mounted once near the app root. */

export function CallOverlay() {
  const {
    status, peer, withVideo, muted, cameraOff,
    localStream, remoteStream, errorMsg,
    acceptCall, rejectCall, hangUp, toggleMute, toggleCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream, status]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream, status]);

  /* Call duration timer */
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (status !== 'connected') { setSeconds(0); return; }
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);
  const dur = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  if (status === 'idle') {
    return errorMsg ? <Toast message={errorMsg} /> : null;
  }

  const peerName = peer?.name || 'Correspondant';
  const isIncomingRinging = status === 'incoming';

  /* ── Incoming call prompt (compact card) ── */
  if (isIncomingRinging) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] w-80 max-w-[calc(100vw-2rem)]">
        <div className="glass-card p-4 shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold">
              {getInitials(peerName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{peerName}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                {withVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                Appel {withVideo ? 'vidéo' : 'audio'} entrant…
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={rejectCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
            >
              <PhoneOff className="w-4 h-4" /> Refuser
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium"
            >
              <Phone className="w-4 h-4" /> Accepter
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Active / connecting / outgoing call window ── */
  const showVideo = withVideo;
  const statusLabel =
    status === 'outgoing' ? 'Appel en cours…'
      : status === 'connecting' ? 'Connexion…'
        : dur;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl h-[80vh] max-h-[640px] rounded-2xl overflow-hidden bg-gray-900 shadow-2xl flex flex-col">

        {/* Remote video / avatar */}
        <div className="relative flex-1 bg-gray-950 flex items-center justify-center overflow-hidden">
          {showVideo && remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-3xl font-bold mb-4">
                {peerName ? getInitials(peerName) : <UserIcon className="w-10 h-10" />}
              </div>
              <p className="text-white text-lg font-semibold">{peerName}</p>
              <p className="text-white/60 text-sm mt-1 flex items-center justify-center gap-1.5">
                {status === 'connected' && !showVideo && <Phone className="w-3.5 h-3.5" />}
                {statusLabel}
              </p>
            </div>
          )}

          {/* Status pill (top) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium flex items-center gap-1.5">
            {showVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span>{peerName}</span>
            <span className="opacity-60">· {statusLabel}</span>
          </div>

          {/* Local preview (picture-in-picture) */}
          {showVideo && localStream && (
            <div className="absolute bottom-4 right-4 w-32 h-44 sm:w-40 sm:h-56 rounded-xl overflow-hidden border-2 border-white/20 bg-gray-800 shadow-lg">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {cameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <VideoOff className="w-6 h-6 text-white/60" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden audio sink (needed when video is off) */}
        <audio ref={remoteAudioRef} autoPlay className="hidden" />

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 py-5 bg-gray-900 border-t border-white/5">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              muted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={muted ? 'Réactiver le micro' : 'Couper le micro'}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {showVideo && (
            <button
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                cameraOff ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={cameraOff ? 'Activer la caméra' : 'Couper la caméra'}
            >
              {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={hangUp}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg"
            title="Raccrocher"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Outgoing animated indicator */}
        {status === 'outgoing' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 text-white/70 text-xs">
            <PhoneCall className="w-4 h-4 animate-pulse" /> Sonnerie…
          </div>
        )}
      </div>

      {errorMsg && <Toast message={errorMsg} />}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm shadow-lg flex items-center gap-2">
      <PhoneOff className="w-4 h-4 text-red-400" />
      {message}
    </div>
  );
}
