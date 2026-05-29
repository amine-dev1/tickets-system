import {
  createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

/* ────────────────────────────────────────────────────────────────
 * Homemade 1:1 WebRTC calling (audio + video) using Supabase
 * Realtime *broadcast* as the signaling channel. No server changes.
 *
 * Each user listens on their personal channel `calls:user:<myId>`.
 * To reach someone we open (and cache) a channel to their personal
 * channel and broadcast signaling events on it.
 *
 * Signaling events: invite, accept, reject, busy, ice, hangup, cancel
 * ──────────────────────────────────────────────────────────────── */

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected';

export interface CallPeer {
  id: string;
  name: string;
}

interface CallContextValue {
  status: CallStatus;
  peer: CallPeer | null;
  withVideo: boolean;
  muted: boolean;
  cameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  errorMsg: string | null;
  /** Start an outgoing 1:1 call. */
  startCall: (peer: CallPeer, video: boolean) => void;
  /** Accept the currently-ringing incoming call. */
  acceptCall: () => void;
  /** Reject an incoming call. */
  rejectCall: () => void;
  /** Hang up / cancel the active or ringing call. */
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within <CallProvider>');
  return ctx;
}

/* ICE servers — STUN is enough on the same network; a TURN server is
 * required for reliable calls across NATs / the public internet. */
function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(',').map(s => s.trim()),
      username: import.meta.env.VITE_TURN_USERNAME as string | undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined,
    });
  }
  return servers;
}

interface SignalPayload {
  callId: string;
  from: string;
  fromName?: string;
  video?: boolean;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const myId = user?.id ?? null;
  const myName = user?.full_name || user?.email || 'Utilisateur';

  const [status, setStatus] = useState<CallStatus>('idle');
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [withVideo, setWithVideo] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* Mutable session data (avoids stale closures) */
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const ringtoneRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);

  /* Cache of channels used to *send* to a given user. */
  const sendChannelsRef = useRef<Map<string, any>>(new Map());

  const getSendChannel = useCallback((toUserId: string) => {
    const existing = sendChannelsRef.current.get(toUserId);
    if (existing) return existing;
    const ch = supabase.channel(`calls:user:${toUserId}`, { config: { broadcast: { ack: false } } });
    ch.subscribe();
    sendChannelsRef.current.set(toUserId, ch);
    return ch;
  }, []);

  const sendSignal = useCallback((toUserId: string, event: string, extra: Partial<SignalPayload> = {}) => {
    if (!myId) return;
    const ch = getSendChannel(toUserId);
    ch.send({
      type: 'broadcast',
      event,
      payload: { callId: callIdRef.current, from: myId, fromName: myName, ...extra },
    });
  }, [myId, myName, getSendChannel]);

  /* ── Ringtone (Web Audio, no asset needed) ── */
  const startRingtone = useCallback(() => {
    if (ringtoneRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.value = 0.0001;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      // pulse the gain to mimic a ring
      const pulse = () => {
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
        gain.gain.linearRampToValueAtTime(0.0001, t + 0.5);
      };
      pulse();
      const interval = setInterval(pulse, 1500);
      ringtoneRef.current = { ctx, osc, gain };
      (ringtoneRef.current as any).interval = interval;
    } catch { /* audio not available — ignore */ }
  }, []);

  const stopRingtone = useCallback(() => {
    const r = ringtoneRef.current;
    if (!r) return;
    try {
      clearInterval((r as any).interval);
      r.osc.stop();
      r.ctx.close();
    } catch { /* ignore */ }
    ringtoneRef.current = null;
  }, []);

  /* ── Teardown ── */
  const cleanup = useCallback(() => {
    stopRingtone();
    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch { /* ignore */ }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    iceQueueRef.current = [];
    callIdRef.current = null;
    peerIdRef.current = null;
    pendingOfferRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setPeer(null);
    setMuted(false);
    setCameraOff(false);
    setStatus('idle');
  }, [stopRingtone]);

  /* ── Build the RTCPeerConnection ── */
  const buildPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(peerId, 'ice', { candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0] ?? null);
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') { stopRingtone(); setStatus('connected'); }
      if (st === 'failed' || st === 'disconnected' || st === 'closed') {
        // give a brief grace period for transient drops
        if (st === 'failed' || st === 'closed') cleanup();
      }
    };
    pcRef.current = pc;
    return pc;
  }, [sendSignal, cleanup, stopRingtone]);

  const drainIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queued = iceQueueRef.current;
    iceQueueRef.current = [];
    for (const c of queued) {
      try { await pc.addIceCandidate(c); } catch { /* ignore */ }
    }
  }, []);

  /* ── Outgoing call ── */
  const startCall = useCallback(async (target: CallPeer, video: boolean) => {
    if (!myId || status !== 'idle') return;
    setErrorMsg(null);
    const callId = crypto.randomUUID();
    callIdRef.current = callId;
    peerIdRef.current = target.id;
    setPeer(target);
    setWithVideo(video);
    setStatus('outgoing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const pc = buildPeerConnection(target.id);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(target.id, 'invite', { video, sdp: offer });
      startRingtone();
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? "Accès au micro / à la caméra refusé."
          : "Impossible d'accéder au micro / à la caméra.",
      );
      cleanup();
    }
  }, [myId, status, buildPeerConnection, sendSignal, startRingtone, cleanup]);

  /* ── Accept an incoming call ── */
  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    const peerId = peerIdRef.current;
    if (!offer || !peerId) return;
    setErrorMsg(null);
    setStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const pc = buildPeerConnection(peerId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(offer);
      await drainIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal(peerId, 'accept', { sdp: answer });
      stopRingtone();
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? "Accès au micro / à la caméra refusé."
          : "Impossible d'accéder au micro / à la caméra.",
      );
      sendSignal(peerId, 'reject');
      cleanup();
    }
  }, [withVideo, buildPeerConnection, drainIce, sendSignal, stopRingtone, cleanup]);

  const rejectCall = useCallback(() => {
    const peerId = peerIdRef.current;
    if (peerId) sendSignal(peerId, 'reject');
    cleanup();
  }, [sendSignal, cleanup]);

  const hangUp = useCallback(() => {
    const peerId = peerIdRef.current;
    if (peerId) sendSignal(peerId, status === 'outgoing' ? 'cancel' : 'hangup');
    cleanup();
  }, [sendSignal, cleanup, status]);

  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    const next = !muted;
    s.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    const next = !cameraOff;
    s.getVideoTracks().forEach(t => { t.enabled = !next; });
    setCameraOff(next);
  }, [cameraOff]);

  /* ── Incoming signaling: listen on my personal channel ── */
  useEffect(() => {
    if (!myId) return;
    const channel = supabase.channel(`calls:user:${myId}`, { config: { broadcast: { ack: false } } });

    const onInvite = ({ payload }: { payload: SignalPayload }) => {
      // Busy: already in another call
      if (status !== 'idle' || pcRef.current || callIdRef.current) {
        sendSignalTo(payload.from, 'busy', payload.callId);
        return;
      }
      callIdRef.current = payload.callId;
      peerIdRef.current = payload.from;
      pendingOfferRef.current = payload.sdp ?? null;
      setPeer({ id: payload.from, name: payload.fromName || 'Appel entrant' });
      setWithVideo(!!payload.video);
      setStatus('incoming');
      startRingtone();
    };

    const onAccept = async ({ payload }: { payload: SignalPayload }) => {
      if (payload.callId !== callIdRef.current) return;
      const pc = pcRef.current;
      if (pc && payload.sdp) {
        try {
          await pc.setRemoteDescription(payload.sdp);
          await drainIce();
          stopRingtone();
          setStatus('connecting');
        } catch { /* ignore */ }
      }
    };

    const onIce = async ({ payload }: { payload: SignalPayload }) => {
      if (payload.callId !== callIdRef.current || !payload.candidate) return;
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(payload.candidate); } catch { /* ignore */ }
      } else {
        iceQueueRef.current.push(payload.candidate);
      }
    };

    const onReject = ({ payload }: { payload: SignalPayload }) => {
      if (payload.callId !== callIdRef.current) return;
      setErrorMsg('Appel refusé.');
      cleanup();
    };
    const onBusy = ({ payload }: { payload: SignalPayload }) => {
      if (payload.callId !== callIdRef.current) return;
      setErrorMsg('Correspondant occupé.');
      cleanup();
    };
    const onHangup = ({ payload }: { payload: SignalPayload }) => {
      if (payload.callId !== callIdRef.current) return;
      cleanup();
    };
    const onCancel = ({ payload }: { payload: SignalPayload }) => {
      if (payload.callId !== callIdRef.current) return;
      setErrorMsg('Appel manqué.');
      cleanup();
    };

    // helper for the busy case (peer not yet stored in refs)
    function sendSignalTo(to: string, event: string, callId: string) {
      const ch = getSendChannel(to);
      ch.send({ type: 'broadcast', event, payload: { callId, from: myId, fromName: myName } });
    }

    channel
      .on('broadcast', { event: 'invite' }, onInvite)
      .on('broadcast', { event: 'accept' }, onAccept)
      .on('broadcast', { event: 'ice' }, onIce)
      .on('broadcast', { event: 'reject' }, onReject)
      .on('broadcast', { event: 'busy' }, onBusy)
      .on('broadcast', { event: 'hangup' }, onHangup)
      .on('broadcast', { event: 'cancel' }, onCancel)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, status, myName, getSendChannel, drainIce, cleanup, startRingtone, stopRingtone]);

  /* Clean up cached send-channels + media on unmount */
  useEffect(() => {
    return () => {
      sendChannelsRef.current.forEach(ch => { try { supabase.removeChannel(ch); } catch { /* ignore */ } });
      sendChannelsRef.current.clear();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      stopRingtone();
    };
  }, [stopRingtone]);

  /* Auto-clear transient error banners */
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const value: CallContextValue = {
    status, peer, withVideo, muted, cameraOff,
    localStream, remoteStream, errorMsg,
    startCall, acceptCall, rejectCall, hangUp, toggleMute, toggleCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
