import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { isStaff } from '../types';
import { Header } from '../components/layout/Header';
import { getInitials, formatRelative } from '../lib/utils';
import {
  Loader2, Search, Send, MessageSquare, Plus, X, CheckCheck, Check,
  ArrowLeft, User as UserIcon, Users, Settings, Trash2, LogOut, UserPlus,
  Ticket as TicketIcon, Briefcase, Pencil, ImagePlus, Phone, Video,
} from 'lucide-react';
import { useCall } from '../hooks/useCall';

/* ── Types ─────────────────────────────────────────────────────── */

interface OtherUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface GroupMember extends OtherUser {
  is_owner?: boolean;
  joined_at?: string;
}

interface ConvLink {
  type: 'ticket' | 'mission';
  id: string;
  label: string;
}

interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  last_message_at: string | null;
  created_at: string;
  other_user: OtherUser | null;
  members: GroupMember[];
  last_message: Message | null;
  unread_count: number;
  link: ConvLink | null;
  is_owner?: boolean;
  created_by?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  image_name: string | null;
  read_at: string | null;
  created_at: string;
}

/* ── Helpers ───────────────────────────────────────────────────── */

const convoTitle = (c: Conversation) =>
  c.is_group ? (c.name || 'Groupe') : (c.other_user?.full_name || c.other_user?.email || 'Conversation');

/** Short preview text for a message in the conversation list. */
const messagePreview = (m: Message | null): string => {
  if (!m) return '';
  if (m.content) return m.content;
  if (m.image_url) return '📷 Image';
  return '';
};

function LinkBadge({ link }: { link: ConvLink }) {
  const Icon = link.type === 'ticket' ? TicketIcon : Briefcase;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 max-w-full truncate">
      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="truncate">{link.label}</span>
    </span>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function Messages() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canCreateGroup = isStaff(user?.role);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newMode, setNewMode] = useState<null | 'direct' | 'group'>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  /* Conversations */
  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then(r => r.data),
    refetchInterval: 30_000,
  });

  const activeConvo = conversations.find(c => c.id === activeId) ?? null;

  // If the active conversation disappears (left/deleted), close the panel.
  useEffect(() => {
    if (activeId && !convLoading && !activeConvo) setActiveId(null);
  }, [activeId, activeConvo, convLoading]);

  /* Realtime: invalidate when messages, memberships or groups change */
  useEffect(() => {
    if (!user) return;
    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    };
    const channel = supabase
      .channel('messaging-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, invalidateAll)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, invalidateAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  /* Count of unread conversations (for the filter badge) */
  const unreadConvoCount = useMemo(
    () => conversations.filter(c => c.unread_count > 0).length,
    [conversations],
  );

  /* Filter conversations by status tab + search */
  const filteredConvos = useMemo(() => {
    let list = conversations;
    if (filter === 'unread') list = list.filter(c => c.unread_count > 0);
    else if (filter === 'read') list = list.filter(c => c.unread_count === 0);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        convoTitle(c).toLowerCase().includes(q) ||
        (c.other_user?.email.toLowerCase().includes(q) ?? false) ||
        (c.last_message?.content?.toLowerCase().includes(q) ?? false) ||
        (c.link?.label.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [conversations, search, filter]);

  return (
    <div className="space-y-4">
      <Header title="Messagerie" subtitle="Échangez avec les membres de votre entreprise" />

      <div className="px-6 flex gap-4 h-[calc(100vh-160px)]">

        {/* ── Conversation list ── */}
        <div className={`w-80 flex-shrink-0 flex flex-col glass-card overflow-hidden ${activeId ? 'hidden md:flex' : ''}`}>

          <div className="p-3 border-b border-gray-100 dark:border-gray-800/60 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-9 w-full text-sm py-2"
                />
              </div>
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => (canCreateGroup ? setShowCreateMenu(v => !v) : setNewMode('direct'))}
                  className="btn-primary p-2"
                  title="Nouveau"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {showCreateMenu && canCreateGroup && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCreateMenu(false)} />
                    <div className="absolute right-0 mt-1 w-52 z-20 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                      <button
                        onClick={() => { setShowCreateMenu(false); setNewMode('direct'); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <MessageSquare className="w-4 h-4 text-brand-500" /> Nouvelle conversation
                      </button>
                      <button
                        onClick={() => { setShowCreateMenu(false); setNewMode('group'); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800"
                      >
                        <Users className="w-4 h-4 text-accent-500" /> Nouveau groupe
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800/50">
              {([
                { key: 'all', label: 'Toutes' },
                { key: 'unread', label: 'Non lus' },
                { key: 'read', label: 'Lus' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors
                    ${filter === tab.key
                      ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  {tab.label}
                  {tab.key === 'unread' && unreadConvoCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold">
                      {unreadConvoCount > 99 ? '99+' : unreadConvoCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
            ) : filteredConvos.length === 0 ? (
              <div className="text-center py-10 px-6 text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {filter === 'unread' ? 'Aucune conversation non lue.'
                    : filter === 'read' ? 'Aucune conversation lue.'
                    : 'Aucune conversation.'}
                </p>
                {filter === 'all'
                  ? (
                    <button onClick={() => setNewMode('direct')} className="mt-3 text-xs text-brand-500 hover:underline font-medium">
                      Démarrer une conversation
                    </button>
                  )
                  : (
                    <button onClick={() => setFilter('all')} className="mt-3 text-xs text-brand-500 hover:underline font-medium">
                      Voir toutes les conversations
                    </button>
                  )}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800/40">
                {filteredConvos.map(convo => {
                  const isActive = convo.id === activeId;
                  const isFromMe = convo.last_message?.sender_id === user?.id;
                  return (
                    <li key={convo.id}>
                      <button
                        onClick={() => setActiveId(convo.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          ${isActive ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                      >
                        <ConvoAvatar convo={convo} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                              {convo.is_group && <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                              {convoTitle(convo)}
                            </p>
                            {convo.last_message && (
                              <span className="text-[10px] text-gray-400 flex-shrink-0">
                                {formatRelative(convo.last_message.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`text-xs truncate ${convo.unread_count > 0 && !isFromMe ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
                              {isFromMe && convo.last_message ? <span className="text-gray-400">Vous : </span> : null}
                              {convo.last_message ? messagePreview(convo.last_message) : <em className="opacity-60">Pas encore de message</em>}
                            </p>
                            {convo.unread_count > 0 && !isFromMe && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex-shrink-0">
                                {convo.unread_count > 99 ? '99+' : convo.unread_count}
                              </span>
                            )}
                          </div>
                          {convo.link && (
                            <div className="mt-1"><LinkBadge link={convo.link} /></div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Chat panel ── */}
        <div className={`flex-1 flex flex-col glass-card overflow-hidden ${!activeId ? 'hidden md:flex' : ''}`}>
          {!activeConvo ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-brand-400" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-200">Sélectionnez une conversation</p>
              <p className="text-sm text-gray-400 mt-1">Choisissez une conversation à gauche ou démarrez-en une nouvelle.</p>
            </div>
          ) : (
            <ChatPanel convo={activeConvo} onBack={() => setActiveId(null)} />
          )}
        </div>
      </div>

      {newMode === 'direct' && (
        <NewConversationModal
          onClose={() => setNewMode(null)}
          onCreated={(id) => { setNewMode(null); setActiveId(id); }}
        />
      )}
      {newMode === 'group' && (
        <NewGroupModal
          onClose={() => setNewMode(null)}
          onCreated={(id) => { setNewMode(null); setActiveId(id); }}
        />
      )}
    </div>
  );
}

/* ── Avatars ───────────────────────────────────────────────────── */

function Avatar({ user, size = 36 }: { user: OtherUser; size?: number }) {
  const sizeClass = size === 36 ? 'w-9 h-9 text-xs' : size === 48 ? 'w-12 h-12 text-sm' : 'w-9 h-9 text-xs';
  return (
    <div className={`${sizeClass} flex-shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold overflow-hidden`}>
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        getInitials(user.full_name ?? user.email)
      )}
    </div>
  );
}

function GroupAvatar({ size = 36 }: { size?: number }) {
  const sizeClass = size === 36 ? 'w-9 h-9' : 'w-12 h-12';
  const iconClass = size === 36 ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className={`${sizeClass} flex-shrink-0 rounded-full bg-gradient-to-br from-accent-500 to-brand-500 flex items-center justify-center text-white`}>
      <Users className={iconClass} />
    </div>
  );
}

function ConvoAvatar({ convo, size = 36 }: { convo: Conversation; size?: number }) {
  if (convo.is_group) return <GroupAvatar size={size} />;
  if (convo.other_user) return <Avatar user={convo.other_user} size={size} />;
  return <GroupAvatar size={size} />;
}

/* ── Chat Panel ────────────────────────────────────────────────── */

function ChatPanel({ convo, onBack }: { convo: Conversation; onBack: () => void }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { startCall, status: callStatus } = useCall();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendError, setSendError] = useState('');

  /* Build/revoke an object URL for the pending image preview */
  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  const pickImage = (file: File | null) => {
    setSendError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { setSendError('Seules les images sont autorisées.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setSendError('L\'image dépasse 10 Mo.'); return; }
    setImageFile(file);
  };
  const clearImage = () => { setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['messages', convo.id],
    queryFn: () => api.get(`/messages/conversations/${convo.id}/messages`).then(r => r.data),
    refetchInterval: 15_000,
  });

  /* Map sender_id → member for group sender labels */
  const memberMap = useMemo(() => {
    const m: Record<string, GroupMember> = {};
    for (const mem of convo.members ?? []) m[mem.id] = mem;
    return m;
  }, [convo.members]);

  /* Mark as read every time we open or receive new messages */
  const readMutation = useMutation({
    mutationFn: () => api.patch(`/messages/conversations/${convo.id}/read`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  useEffect(() => {
    if (convo.unread_count > 0) readMutation.mutate();
  }, [convo.id, convo.unread_count]); // eslint-disable-line

  /* Auto-scroll on new messages */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: ({ content, image }: { content: string; image: File | null }) => {
      if (image) {
        const form = new FormData();
        if (content) form.append('content', content);
        form.append('image', image);
        return api.post(`/messages/conversations/${convo.id}/messages`, form, { timeout: 120000 }).then(r => r.data);
      }
      return api.post(`/messages/conversations/${convo.id}/messages`, { content }).then(r => r.data);
    },
    onSuccess: () => {
      setDraft('');
      clearImage();
      setSendError('');
      queryClient.invalidateQueries({ queryKey: ['messages', convo.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => setSendError(err.response?.data?.error || err.message || 'Échec de l\'envoi.'),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if ((!content && !imageFile) || sendMutation.isPending) return;
    sendMutation.mutate({ content, image: imageFile });
  };

  /* Index of the most recent message I sent that the other user has read (1:1 only). */
  const lastReadMineIdx = useMemo(() => {
    if (convo.is_group) return -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === user?.id && messages[i].read_at) return i;
    }
    return -1;
  }, [messages, user?.id, convo.is_group]);

  const senderLabel = (id: string) => {
    if (id === user?.id) return 'Vous';
    const m = memberMap[id];
    return m?.full_name || m?.email || 'Utilisateur';
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800/60">
        <button onClick={onBack} className="md:hidden p-1 text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <ConvoAvatar convo={convo} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1.5">
            {convo.is_group && <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
            {convoTitle(convo)}
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-xs text-gray-400 truncate">
              {convo.is_group
                ? `${convo.members?.length ?? 0} membre${(convo.members?.length ?? 0) > 1 ? 's' : ''}`
                : `${convo.other_user?.role} · ${convo.other_user?.email}`}
            </p>
            {convo.link && <LinkBadge link={convo.link} />}
          </div>
        </div>
        {!convo.is_group && convo.other_user && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => startCall(
                { id: convo.other_user!.id, name: convo.other_user!.full_name || convo.other_user!.email },
                false,
              )}
              disabled={callStatus !== 'idle'}
              className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Appel audio"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => startCall(
                { id: convo.other_user!.id, name: convo.other_user!.full_name || convo.other_user!.email },
                true,
              )}
              disabled={callStatus !== 'idle'}
              className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Appel vidéo"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        )}
        {convo.is_group && (
          <button
            onClick={() => setShowManage(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50"
            title="Gérer le groupe"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50/50 dark:bg-gray-900/20">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-sm">Aucun message. Envoyez le premier !</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMine = m.sender_id === user?.id;
            const prev = messages[idx - 1];
            const isFirstOfBlock = !prev || prev.sender_id !== m.sender_id || (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) > 5 * 60_000;
            const showSeen = !convo.is_group && isMine && !!m.read_at && idx === lastReadMineIdx;
            const showSenderName = convo.is_group && !isMine && isFirstOfBlock;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${isFirstOfBlock ? 'mt-3' : 'mt-0.5'}`}>
                {showSenderName && (
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5 px-1">
                    {senderLabel(m.sender_id)}
                  </span>
                )}
                <div className={`max-w-[75%] ${m.image_url ? 'p-1.5' : 'px-3.5 py-2'} rounded-2xl text-sm break-words whitespace-pre-wrap shadow-sm
                    ${isMine
                      ? 'bg-brand-500 text-white rounded-br-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700/60 rounded-bl-sm'
                    }`}
                >
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={m.image_url}
                        alt={m.image_name ?? 'image'}
                        className="rounded-xl max-h-64 w-auto object-cover cursor-zoom-in"
                        loading="lazy"
                      />
                    </a>
                  )}
                  {m.content && <div className={m.image_url ? 'px-2 pt-1.5' : ''}>{m.content}</div>}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${m.image_url ? 'px-2 pb-0.5' : ''} ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                    <span>{formatRelative(m.created_at)}</span>
                    {!convo.is_group && isMine && (m.read_at
                      ? <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                      : <Check className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
                {showSeen && (
                  <span className="flex items-center gap-1 mt-0.5 pr-1 text-[10px] font-medium text-sky-500 dark:text-sky-400">
                    <CheckCheck className="w-3 h-3" />
                    Vu {m.read_at ? formatRelative(m.read_at) : ''}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="border-t border-gray-100 dark:border-gray-800/60 p-3 space-y-2">
        {sendError && (
          <div className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <X className="w-3.5 h-3.5 flex-shrink-0" /> <span className="flex-1">{sendError}</span>
          </div>
        )}
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="aperçu" className="max-h-32 rounded-lg border border-gray-200 dark:border-gray-700" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center shadow hover:bg-gray-700"
              title="Retirer l'image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={e => pickImage(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 flex-shrink-0 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800/50"
            title="Joindre une image"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <textarea
            rows={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onPaste={e => {
              const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
              if (item) { const f = item.getAsFile(); if (f) { e.preventDefault(); pickImage(f); } }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
            }}
            placeholder="Écrire un message ou coller une capture d'écran..."
            className="input flex-1 resize-none max-h-32 py-2"
            maxLength={5000}
          />
          <button
            type="submit"
            disabled={(!draft.trim() && !imageFile) || sendMutation.isPending}
            className="btn-primary p-2.5 flex-shrink-0 disabled:opacity-40"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {showManage && convo.is_group && (
        <GroupManageModal convo={convo} onClose={() => setShowManage(false)} onLeftOrDeleted={() => { setShowManage(false); onBack(); }} />
      )}
    </>
  );
}

/* ── New conversation modal (1:1) ──────────────────────────────── */

function NewConversationModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: users = [], isLoading } = useQuery<OtherUser[]>({
    queryKey: ['messageable-users'],
    queryFn: () => api.get('/messages/users').then(r => r.data),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const startMutation = useMutation({
    mutationFn: (user_id: string) =>
      api.post('/messages/conversations', { user_id }).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onCreated(data.id);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Impossible de démarrer la conversation.');
      setPendingId(null);
    },
  });

  const handleStart = (userId: string) => {
    setError('');
    setPendingId(userId);
    startMutation.mutate(userId);
  };

  return (
    <ModalShell title="Nouvelle conversation" subtitle="Sélectionnez un membre de votre entreprise" onClose={onClose}>
      {error && <ErrorBanner message={error} />}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800/60">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou email..." autoFocus />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : filtered.length === 0 ? (
          <EmptyUsers />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/40">
            {filtered.map(u => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => handleStart(u.id)}
                  disabled={startMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Avatar user={u} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-gray-400 truncate">{u.role} · {u.email}</p>
                  </div>
                  {pendingId === u.id
                    ? <Loader2 className="w-4 h-4 animate-spin text-brand-500 flex-shrink-0" />
                    : <MessageSquare className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  }
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}

/* ── New group modal ───────────────────────────────────────────── */

interface LinkOptions {
  tickets: { id: string; title: string; status: string }[];
  missions: { id: string; name: string; status: string }[];
}

function NewGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [linkType, setLinkType] = useState<'none' | 'ticket' | 'mission'>('none');
  const [linkId, setLinkId] = useState('');
  const [error, setError] = useState('');

  const { data: users = [], isLoading } = useQuery<OtherUser[]>({
    queryKey: ['messageable-users'],
    queryFn: () => api.get('/messages/users').then(r => r.data),
  });
  const { data: linkOpts } = useQuery<LinkOptions>({
    queryKey: ['linkable'],
    queryFn: () => api.get('/messages/linkable').then(r => r.data),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const createMutation = useMutation({
    mutationFn: () => api.post('/messages/groups', {
      name: name.trim(),
      member_ids: [...selected],
      ticket_id: linkType === 'ticket' ? linkId || null : null,
      mission_id: linkType === 'mission' ? linkId || null : null,
    }).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onCreated(data.id);
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message || 'Impossible de créer le groupe.'),
  });

  const handleCreate = () => {
    setError('');
    if (!name.trim()) { setError('Le nom du groupe est requis.'); return; }
    createMutation.mutate();
  };

  return (
    <ModalShell title="Nouveau groupe" subtitle="Créez un espace de discussion d'équipe" onClose={onClose}>
      {error && <ErrorBanner message={error} />}

      <div className="p-3 space-y-3 border-b border-gray-100 dark:border-gray-800/60">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nom du groupe (ex : Équipe Support)"
          className="input w-full text-sm py-2"
          maxLength={120}
          autoFocus
        />

        {/* Optional link to a ticket / mission */}
        <div className="flex items-center gap-2">
          <select
            value={linkType}
            onChange={e => { setLinkType(e.target.value as any); setLinkId(''); }}
            className="input text-sm py-2 w-40"
          >
            <option value="none">Aucun lien</option>
            <option value="ticket">Lier un ticket</option>
            <option value="mission">Lier une mission</option>
          </select>
          {linkType !== 'none' && (
            <select value={linkId} onChange={e => setLinkId(e.target.value)} className="input text-sm py-2 flex-1">
              <option value="">— Sélectionner —</option>
              {linkType === 'ticket'
                ? (linkOpts?.tickets ?? []).map(t => <option key={t.id} value={t.id}>{t.title}</option>)
                : (linkOpts?.missions ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
        </div>

        <SearchInput value={search} onChange={setSearch} placeholder="Ajouter des membres..." />
        {selected.size > 0 && (
          <p className="text-xs text-gray-400">{selected.size} membre{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : filtered.length === 0 ? (
          <EmptyUsers />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/40">
            {filtered.map(u => {
              const checked = selected.has(u.id);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => toggle(u.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <Avatar user={u} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-gray-400 truncate">{u.role} · {u.email}</p>
                    </div>
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0
                      ${checked ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800/60 flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary text-sm">Annuler</button>
        <button onClick={handleCreate} disabled={createMutation.isPending || !name.trim()} className="btn-primary text-sm disabled:opacity-40">
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le groupe'}
        </button>
      </div>
    </ModalShell>
  );
}

/* ── Group manage modal ────────────────────────────────────────── */

function GroupManageModal({ convo, onClose, onLeftOrDeleted }: { convo: Conversation; onClose: () => void; onLeftOrDeleted: () => void }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canManage = isStaff(user?.role);
  const [name, setName] = useState(convo.name ?? '');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: members = [], isLoading } = useQuery<GroupMember[]>({
    queryKey: ['group-members', convo.id],
    queryFn: () => api.get(`/messages/groups/${convo.id}/members`).then(r => r.data),
  });
  const { data: users = [] } = useQuery<OtherUser[]>({
    queryKey: ['messageable-users'],
    queryFn: () => api.get('/messages/users').then(r => r.data),
    enabled: adding,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['group-members', convo.id] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };
  const wrapErr = (err: any) => setError(err.response?.data?.error || err.message || 'Erreur.');

  const renameMutation = useMutation({
    mutationFn: () => api.patch(`/messages/groups/${convo.id}`, { name: name.trim() }).then(r => r.data),
    onSuccess: invalidate, onError: wrapErr,
  });
  const addMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/messages/groups/${convo.id}/members`, { user_id: userId }).then(r => r.data),
    onSuccess: () => { invalidate(); setSearch(''); }, onError: wrapErr,
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/messages/groups/${convo.id}/members/${userId}`).then(r => r.data),
    onSuccess: invalidate, onError: wrapErr,
  });
  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/messages/groups/${convo.id}/leave`).then(r => r.data),
    onSuccess: () => { invalidate(); onLeftOrDeleted(); }, onError: wrapErr,
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/messages/groups/${convo.id}`).then(r => r.data),
    onSuccess: () => { invalidate(); onLeftOrDeleted(); }, onError: wrapErr,
  });

  const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members]);
  const addable = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => !memberIds.has(u.id) &&
      (!q || u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  }, [users, memberIds, search]);

  return (
    <ModalShell title="Gérer le groupe" subtitle={convo.name ?? undefined} onClose={onClose}>
      {error && <ErrorBanner message={error} />}

      <div className="flex-1 overflow-y-auto">
        {/* Rename */}
        {canManage && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800/60">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
              <Pencil className="w-3 h-3" /> Nom du groupe
            </label>
            <div className="flex items-center gap-2">
              <input value={name} onChange={e => setName(e.target.value)} maxLength={120} className="input flex-1 text-sm py-2" />
              <button
                onClick={() => renameMutation.mutate()}
                disabled={renameMutation.isPending || !name.trim() || name.trim() === convo.name}
                className="btn-primary text-sm px-3 disabled:opacity-40"
              >
                {renameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Membres ({members.length})
            </span>
            {canManage && (
              <button onClick={() => setAdding(v => !v)} className="text-xs text-brand-500 hover:underline font-medium flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> {adding ? 'Fermer' : 'Ajouter'}
              </button>
            )}
          </div>

          {adding && canManage && (
            <div className="mb-3 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un membre..." />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {addable.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Aucun membre à ajouter.</p>
                ) : addable.map(u => (
                  <button
                    key={u.id}
                    onClick={() => addMutation.mutate(u.id)}
                    disabled={addMutation.isPending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 disabled:opacity-50"
                  >
                    <Avatar user={u} size={36} />
                    <span className="flex-1 min-w-0 text-sm truncate">{u.full_name || u.email}</span>
                    <UserPlus className="w-3.5 h-3.5 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
          ) : (
            <ul className="space-y-1">
              {members.map(m => (
                <li key={m.id} className="flex items-center gap-2 py-1.5">
                  <Avatar user={m} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex items-center gap-1.5">
                      {m.full_name || m.email}
                      {m.id === user?.id && <span className="text-[10px] text-gray-400">(vous)</span>}
                      {m.is_owner && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-300 font-medium">Créateur</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{m.role}</p>
                  </div>
                  {canManage && !m.is_owner && m.id !== user?.id && (
                    <button
                      onClick={() => removeMutation.mutate(m.id)}
                      disabled={removeMutation.isPending}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="Retirer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between gap-2">
        <button
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-red-500 font-medium"
        >
          <LogOut className="w-4 h-4" /> Quitter
        </button>
        {(canManage || convo.is_owner) && (
          <button
            onClick={() => { if (confirm('Supprimer définitivement ce groupe et tous ses messages ?')) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending}
            className="text-sm flex items-center gap-1.5 text-red-500 hover:text-red-600 font-medium"
          >
            <Trash2 className="w-4 h-4" /> Supprimer le groupe
          </button>
        )}
      </div>
    </ModalShell>
  );
}

/* ── Shared UI bits ────────────────────────────────────────────── */

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/60">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
      <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input pl-9 w-full text-sm py-2"
        autoFocus={autoFocus}
      />
    </div>
  );
}

function EmptyUsers() {
  return (
    <div className="text-center py-10 text-gray-400">
      <UserIcon className="w-7 h-7 mx-auto mb-2 opacity-40" />
      <p className="text-sm">Aucun utilisateur trouvé.</p>
    </div>
  );
}
