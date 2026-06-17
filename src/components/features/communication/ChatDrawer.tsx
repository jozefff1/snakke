'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIconLabels } from '@/hooks/useIconLabels';

interface Icon {
  id: string;
  name: string;
  imageUrl?: string;
  symbol?: string;
}

interface MessageContent {
  type: 'text' | 'icons';
  text?: string;
  icons?: Icon[];
  sentence?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string | null;
  content: MessageContent;
  createdAt: string;
}

interface PairedUser {
  id: string;
  name: string | null;
  role: string;
  pairingRole: 'supervisor' | 'supervised';
  relationship?: string;
  isOnline?: boolean;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  lastActiveAt?: string | null;
}

interface Props {
  currentUserId: string;
  onClose: () => void;
}

const POLL_INTERVAL = 3000; // 3 seconds

export default function ChatDrawer({ currentUserId, onClose }: Props) {
  const { language, t, tIcon } = useLanguage();
  const { labels } = useIconLabels(language);

  // Current sentence from Redux store
  const sentence = useAppSelector((state) => state.communication.sentence) as Icon[];

  const [pairedUsers, setPairedUsers] = useState<PairedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PairedUser | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingPaired, setLoadingPaired] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestTimestampRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  // Load paired users on mount
  useEffect(() => {
    fetch('/api/messages/room')
      .then((r) => r.json())
      .then((data) => {
        const list: PairedUser[] = (data.rooms ?? []).map((room: {
          userId: string;
          name: string;
          role: string;
          pairingRole: 'supervisor' | 'supervised';
          relationship?: string;
          isOnline?: boolean;
          lastMessage?: string | null;
          lastMessageAt?: string | null;
          lastActiveAt?: string | null;
        }) => ({
          id: room.userId,
          name: room.name,
          role: room.role,
          pairingRole: room.pairingRole,
          relationship: room.relationship,
          isOnline: room.isOnline,
          lastMessage: room.lastMessage,
          lastMessageAt: room.lastMessageAt,
          lastActiveAt: room.lastActiveAt,
        }));
        setPairedUsers(list);
        if (list.length > 0) setSelectedUser(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingPaired(false));
  }, []);

  const formatLastActive = (iso?: string | null) => {
    if (!iso) return t('chat.offline');
    const deltaMs = Date.now() - new Date(iso).getTime();
    const mins = Math.max(1, Math.round(deltaMs / 60000));
    if (mins < 60) return `${mins}m ${t('chat.ago')}`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ${t('chat.ago')}`;
    return `${Math.round(hours / 24)}d ${t('chat.ago')}`;
  };

  const getPreviewWithTime = (message?: string | null, timestamp?: string | null) => {
    const preview = message || t('chat.noMessages');
    if (!timestamp) return preview;
    return `${preview} · ${formatLastActive(timestamp)}`;
  };

  // Fetch full history when selected user changes
  const fetchHistory = useCallback(async (userId: string) => {
    const res = await fetch(`/api/messages?withUserId=${userId}&limit=50`);
    if (!res.ok) return;
    const data = await res.json();
    const loaded: ChatMessage[] = data.messages ?? [];
    setMsgs(loaded);
    if (loaded.length > 0) {
      latestTimestampRef.current = loaded[loaded.length - 1].createdAt;
    }
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    setMsgs([]);
    latestTimestampRef.current = null;
    fetchHistory(selectedUser.id);
  }, [selectedUser, fetchHistory]);

  // Poll for new messages
  useEffect(() => {
    if (!selectedUser) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const since = latestTimestampRef.current;
      const url = since
        ? `/api/messages?withUserId=${selectedUser.id}&since=${encodeURIComponent(since)}&limit=20`
        : `/api/messages?withUserId=${selectedUser.id}&limit=20`;
      const res = await fetch(url).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      const incoming: ChatMessage[] = data.messages ?? [];
      if (incoming.length === 0) return;
      setMsgs((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newOnes = incoming.filter((m) => !existingIds.has(m.id));
        if (newOnes.length === 0) return prev;
        latestTimestampRef.current = newOnes[newOnes.length - 1].createdAt;
        return [...prev, ...newOnes];
      });
    }, POLL_INTERVAL);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedUser]);

  // Keep the drawer thread anchored at the latest message after refresh/new data.
  useEffect(() => {
    scrollToBottom();
    const rafId = window.requestAnimationFrame(scrollToBottom);
    const timeoutId = window.setTimeout(scrollToBottom, 120);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [msgs, scrollToBottom]);

  const getIconLabel = (icon: Icon) => {
    if (labels[icon.id]) return labels[icon.id];
    const translated = tIcon(icon.id);
    return translated !== icon.id ? translated : icon.name;
  };

  const sendMessage = async (content: MessageContent) => {
    if (!selectedUser) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selectedUser.id, content }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const newMsg: ChatMessage = {
        ...data.message,
        senderName: null, // own message — we know who it is
      };
      setMsgs((prev) => [...prev, newMsg]);
      latestTimestampRef.current = newMsg.createdAt;
    } finally {
      setSending(false);
    }
  };

  const handleSendIcons = async () => {
    if (sentence.length === 0 || !selectedUser) return;
    const sentenceText = sentence.map(getIconLabel).join(' ');
    await sendMessage({
      type: 'icons',
      icons: sentence.map((ic) => ({ id: ic.id, name: ic.name, imageUrl: ic.imageUrl, symbol: ic.symbol })),
      sentence: sentenceText,
    });
  };

  const handleSendText = async () => {
    const text = replyText.trim();
    if (!text || !selectedUser) return;
    await sendMessage({ type: 'text', text });
    setReplyText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // ── Render ──────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 w-full md:w-80 lg:w-96">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="font-semibold text-sm">{t('chat.title')}</span>
          {selectedUser && (
            <span className="text-xs text-gray-500 dark:text-gray-400">· {selectedUser.name}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 text-sm"
        >
          ✕
        </button>
      </div>

      {/* User picker (if multiple paired users) */}
      {pairedUsers.length > 1 && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700 shrink-0">
          {pairedUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors min-w-36 ${
                selectedUser?.id === u.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary/10'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 mt-0.5 rounded-full bg-white/20 flex items-center justify-center font-bold shrink-0">
                  {u.name?.[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${u.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <span className="truncate">{u.name}</span>
                  </div>
                  <div className={`truncate text-[10px] ${selectedUser?.id === u.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                    {getPreviewWithTime(u.lastMessage, u.lastMessageAt)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No paired users */}
      {!loadingPaired && pairedUsers.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <div className="text-4xl">🔗</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('chat.noPairedUsers')} {t('chat.goTo')}{' '}
            <Link href="/dashboard/patients" className="text-primary hover:underline">
              {t('chat.patients')}
            </Link>{' '}
            {t('chat.toSendInvite')}
          </p>
        </div>
      )}

      {/* Select a user prompt */}
      {!loadingPaired && pairedUsers.length > 1 && !selectedUser && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-sm text-gray-400">{t('chat.selectPerson')}</p>
        </div>
      )}

      {/* Message thread */}
      {selectedUser && (
        <>
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-xs flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedUser.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
              {selectedUser.isOnline ? t('chat.online') : `${t('chat.lastActive')} ${formatLastActive(selectedUser.lastActiveAt)}`}
            </span>
            {selectedUser.relationship && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 capitalize">
                {selectedUser.relationship}
              </span>
            )}
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0"
          >
            {msgs.length === 0 && (
              <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-6">
                {t('chat.noMessagesYet')} {t('chat.sendFirstSentence')}
              </div>
            )}

            {msgs.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              const localizedSentence = (msg.content.icons ?? []).map((icon) => getIconLabel(icon)).join(' ').trim();
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {/* Sender label for received messages */}
                    {!isMine && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                        {msg.senderName ?? selectedUser.name}
                      </span>
                    )}

                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        isMine
                          ? 'bg-primary text-white rounded-tr-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                      }`}
                    >
                      {msg.content.type === 'text' && (
                        <span>{msg.content.text}</span>
                      )}

                      {msg.content.type === 'icons' && (
                        <div className="flex flex-col gap-1.5">
                          {/* Icon row */}
                          <div className="flex flex-wrap gap-1.5">
                            {(msg.content.icons ?? []).map((icon, i) => (
                              <div key={`${icon.id}-${i}`} className="flex flex-col items-center gap-0.5">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-white dark:bg-gray-700'}`}>
                                  {icon.imageUrl ? (
                                    <Image
                                      src={icon.imageUrl}
                                      alt={icon.name}
                                      width={36}
                                      height={36}
                                      className="object-contain"
                                    />
                                  ) : (
                                    <span className="text-xl">{icon.symbol}</span>
                                  )}
                                </div>
                                <span className={`text-[9px] text-center leading-tight max-w-10 truncate ${isMine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {getIconLabel(icon)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* Sentence text below icons */}
                          {(localizedSentence || msg.content.sentence) && (
                            <p className={`text-xs italic ${isMine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
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

          {/* Input area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2 shrink-0">
            {/* Send current sentence as icons */}
            {sentence.length > 0 && (
              <button
                onClick={handleSendIcons}
                disabled={sending}
                className="w-full rounded-xl bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 text-primary text-sm font-medium px-3 py-2 transition-colors disabled:opacity-50 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span>📤</span>
                  <span className="truncate">
                    {t('chat.sendLabel')}: &ldquo;{sentence.map(getIconLabel).join(' ')}&rdquo;
                  </span>
                </span>
                <span className="shrink-0 text-xs bg-primary text-white rounded-lg px-2 py-0.5">
                  {sending ? '…' : t('chat.send')}
                </span>
              </button>
            )}

            {/* Text reply */}
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.typeReply')}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSendText}
                disabled={!replyText.trim() || sending}
                className="rounded-xl bg-primary text-white px-3 py-2 text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
              >
                ↑
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
