'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ThreadIcon {
  id: string;
  name: string;
  imageUrl?: string;
  symbol?: string;
}

export interface ThreadMessage {
  id: string;
  senderId: string;
  senderName: string | null;
  content: {
    type: 'text' | 'icons';
    text?: string;
    icons?: ThreadIcon[];
    sentence?: string;
  };
  createdAt: string;
}

interface RoomUser {
  userId: string;
  name: string;
  role: string;
  relationship?: string;
  isOnline?: boolean;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  lastActiveAt?: string | null;
}

function getPreviewWithTime(
  message: string | null | undefined,
  timestamp: string | null | undefined,
  emptyLabel: string,
  formatRelativeTime: (iso?: string | null) => string
) {
  const preview = message || emptyLabel;
  if (!timestamp) return preview;
  return `${preview} · ${formatRelativeTime(timestamp)}`;
}

interface Props {
  currentUserId: string;
  iconLabels: Record<string, string>;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onRoomLoaded?: (rooms: RoomUser[]) => void;
  onNewMessage?: () => void;
}

const POLL_MS = 3000;

/** Plays a soft 2-note chime via Web Audio API. No files needed. */
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const makeNote = (freq: number, startAt: number, vol: number, dur: number) => {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(vol, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);
      osc.connect(gain);
      osc.start(startAt);
      osc.stop(startAt + dur);
    };

    makeNote(880,  ctx.currentTime,        0.18, 0.45); // A5
    makeNote(1109, ctx.currentTime + 0.13, 0.13, 0.5);  // C#6

    setTimeout(() => ctx.close(), 800);
  } catch {
    // Web Audio unavailable — skip silently
  }
}

export default function CommunicateThread({ currentUserId, iconLabels, collapsed = false, onToggleCollapse, onRoomLoaded, onNewMessage }: Props) {
  const { t, tIcon } = useLanguage();
  const [rooms, setRooms] = useState<RoomUser[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomUser | null>(null);
  const [msgs, setMsgs] = useState<ThreadMessage[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const latestTsRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRoomLoadedRef = useRef(onRoomLoaded);
  const onNewMessageRef = useRef(onNewMessage);
  const collapsedRef = useRef(collapsed);
  const currentUserIdRef = useRef(currentUserId);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  const getLabel = useCallback((icon: ThreadIcon) => {
    if (iconLabels[icon.id]) return iconLabels[icon.id];
    const translated = tIcon(icon.id);
    return translated !== icon.id ? translated : icon.name;
  }, [iconLabels, tIcon]);

  useEffect(() => {
    onRoomLoadedRef.current = onRoomLoaded;
  }, [onRoomLoaded]);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const formatLastActive = useCallback((iso?: string | null) => {
    if (!iso) return t('chat.offline');
    const deltaMs = Date.now() - new Date(iso).getTime();
    const mins = Math.max(1, Math.round(deltaMs / 60000));
    if (mins < 60) return `${mins}m ${t('chat.ago')}`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ${t('chat.ago')}`;
    return `${Math.round(hours / 24)}d ${t('chat.ago')}`;
  }, [t]);

  // Load paired rooms
  useEffect(() => {
    fetch('/api/messages/room')
      .then((r) => r.json())
      .then((data) => {
        const list: RoomUser[] = data.rooms ?? [];
        setRooms(list);
        setActiveRoom((prev) => {
          if (!prev) return list[0] ?? null;
          return list.find((room) => room.userId === prev.userId) ?? (list[0] ?? null);
        });
        onRoomLoadedRef.current?.(list);
      })
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    let cancelled = false;

    latestTsRef.current = null;

    const run = async () => {
      const res = await fetch(`/api/messages/room?roomUserId=${activeRoom.userId}&limit=100`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const loaded: ThreadMessage[] = data.messages ?? [];
      if (cancelled) return;
      setMsgs(loaded);
      latestTsRef.current = loaded.length > 0 ? loaded[loaded.length - 1].createdAt : null;
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeRoom]);

  // Poll for new messages
  useEffect(() => {
    if (!activeRoom) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const since = latestTsRef.current;
      const url = since
        ? `/api/messages/room?roomUserId=${activeRoom.userId}&since=${encodeURIComponent(since)}&limit=20`
        : `/api/messages/room?roomUserId=${activeRoom.userId}&limit=20`;

      const res = await fetch(url).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      const incoming: ThreadMessage[] = data.messages ?? [];
      if (!incoming.length) return;

      setMsgs((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = incoming.filter((m) => !existingIds.has(m.id));
        if (!fresh.length) return prev;
        latestTsRef.current = fresh[fresh.length - 1].createdAt;
        // Track unread when panel is collapsed
        const fromOthers = fresh.filter((m) => m.senderId !== currentUserIdRef.current);
        if (fromOthers.length > 0 && collapsedRef.current) {
          setUnreadCount((n) => n + fromOthers.length);
          onNewMessageRef.current?.();
        }
        // Play chime for messages from others (collapsed or not)
        if (fromOthers.length > 0) {
          playChime();
        }
        // Mark fresh messages for slide-in animation
        const freshIds = new Set(fresh.map((m) => m.id));
        setNewMsgIds(freshIds);
        setTimeout(() => setNewMsgIds(new Set()), 600);
        return [...prev, ...fresh];
      });
    }, POLL_MS);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeRoom]);

  // Keep the thread anchored at the latest message after refresh/new data.
  useEffect(() => {
    scrollToBottom();
    const rafId = window.requestAnimationFrame(scrollToBottom);
    const timeoutId = window.setTimeout(scrollToBottom, 120);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [msgs, scrollToBottom]);

  // ── Exposed via ref so parent can push new messages locally ──
  // (optimistic update — parent calls addMessage after a successful POST)
  const addMessage = useCallback((msg: ThreadMessage) => {
    setMsgs((prev) => [...prev, msg]);
    latestTsRef.current = msg.createdAt;
    // Animate the sent message
    setNewMsgIds(new Set([msg.id]));
    setTimeout(() => setNewMsgIds(new Set()), 600);
    setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]);

  // Expose addMessage + activeRoom via a stable callback so the parent page can call it
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__snakkeThread = { addMessage, getActiveRoom: () => activeRoom };
  }, [addMessage, activeRoom]);

  // ── Empty state ──
  if (!loadingRooms && rooms.length === 0) {
    return null; // Hidden when no pairs — page handles empty state
  }

  // ── Collapsed header bar ──
  if (collapsed) {
    return (
      <button
        onClick={() => {
          setUnreadCount(0);
          onToggleCollapse?.();
        }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left${unreadCount > 0 ? ' snakke-bar-pulse' : ''}`}
      >
        <span className="text-base">💬</span>
        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {activeRoom ? `${t('chat.you')} ↔ ${activeRoom.name}` : t('chat.title')}
          {msgs.length > 0 && (
            <span className="ml-1.5 text-xs text-gray-400 font-normal">
              · {msgs.length} {msgs.length !== 1 ? t('chat.messages') : t('chat.message')}
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <span
            key={unreadCount}
            className="snakke-badge-bounce shrink-0 bg-primary text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-4.5 text-center"
          >
            {unreadCount}
          </span>
        )}
        <span className="shrink-0 text-gray-400 text-xs">▼ {t('chat.open')}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Room tabs — if paired with multiple users */}
      {rooms.length > 1 && (
        <div className="flex gap-1 px-3 pt-2 pb-0 overflow-x-auto shrink-0">
          {rooms.map((r) => (
            <button
              key={r.userId}
              onClick={() => setActiveRoom(r)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors min-w-36 ${
                activeRoom?.userId === r.userId
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary/10'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 rounded-full bg-white/30 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {r.name[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${r.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <span className="truncate">{r.name}</span>
                  </div>
                  <div className={`truncate text-[10px] ${activeRoom?.userId === r.userId ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                    {getPreviewWithTime(r.lastMessage, r.lastMessageAt, t('chat.noMessages'), formatLastActive)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Participants bar + close button */}
      {activeRoom && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('chat.you')}</span>
          <span>↔</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{activeRoom.name}</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${activeRoom.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              {activeRoom.isOnline ? t('chat.online') : `${t('chat.lastActive')} ${formatLastActive(activeRoom.lastActiveAt)}`}
            </span>
            {activeRoom.relationship && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 capitalize">
                {activeRoom.relationship}
              </span>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Collapse chat"
              >
                ▲ {t('chat.close')}
              </button>
            )}
          </span>
        </div>
      )}

      {/* Message thread */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0"
      >
        {msgs.length === 0 && !loadingRooms && activeRoom && (
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-8">
            {t('chat.noMessages')} — {t('chat.buildSentence')} <strong>{t('chat.send')}</strong> {t('chat.toStart')}
          </div>
        )}

        {msgs.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          const isNew = newMsgIds.has(msg.id);
          const localizedSentence = (msg.content.icons ?? []).map((icon) => getLabel(icon)).join(' ').trim();
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}${isNew ? (isMine ? ' snakke-msg-in-right' : ' snakke-msg-in-left') : ''}`}
            >
              <div className={`flex flex-col gap-1 max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Sender name for received messages */}
                {!isMine && (
                  <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 px-1">
                    {msg.senderName ?? activeRoom?.name ?? t('chat.unknown')}
                  </span>
                )}

                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isMine
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {/* Text message */}
                  {msg.content.type === 'text' && (
                    <p className="text-sm leading-relaxed">{msg.content.text}</p>
                  )}

                  {/* Icon / pictogram message */}
                  {msg.content.type === 'icons' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        {(msg.content.icons ?? []).map((icon, i) => (
                          <div key={`${icon.id}-${i}`} className="flex flex-col items-center gap-0.5">
                            <div
                              className={`w-14 h-14 rounded-xl flex items-center justify-center p-1 ${
                                isMine ? 'bg-white/20' : 'bg-gray-50 dark:bg-gray-700'
                              }`}
                            >
                              {icon.imageUrl ? (
                                <Image
                                  src={icon.imageUrl}
                                  alt={getLabel(icon)}
                                  width={48}
                                  height={48}
                                  className="object-contain"
                                />
                              ) : (
                                <span className="text-3xl leading-none">{icon.symbol}</span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] text-center max-w-14 truncate leading-tight ${
                                isMine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {getLabel(icon)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {(localizedSentence || msg.content.sentence) && (
                        <p
                          className={`text-xs italic leading-relaxed ${
                            isMine ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          &ldquo;{localizedSentence || msg.content.sentence}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
