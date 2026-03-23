import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import {
    bidNotificationService,
    directMessageService,
    type BidNotificationItem,
} from '../services/api';
import type {
    DirectMessage,
    DirectMessageAttachment,
    DirectMessageParticipant,
    DirectMessageThread,
} from '../types';

interface SellerChatDialogProps {
    isOpen: boolean;
    onClose: () => void;
    preferredUserId?: number | null;
    preferredUserName?: string;
    onNavigateSellerStore: (sellerId: number, sellerName?: string) => void;
    onNavigateAuction: (auctionId: number) => void;
}

const buildFallbackParticipant = (
    userId: number | null | undefined,
    userName?: string,
): DirectMessageParticipant | null => {
    if (!userId) {
        return null;
    }

    return {
        id: userId,
        name: userName?.trim() || `User #${userId}`,
        email: '',
        seller_registration: null,
    };
};

export const SellerChatDialog: React.FC<SellerChatDialogProps> = ({
    isOpen,
    onClose,
    preferredUserId,
    preferredUserName,
    onNavigateSellerStore,
    onNavigateAuction,
}) => {
    const quickEmojis = [
        '😀',
        '😂',
        '😍',
        '🔥',
        '👏',
        '🎉',
        '👍',
        '🙏',
        '❤️',
        '😮',
    ];
    const { authUser } = useAuth();
    const [threads, setThreads] = useState<DirectMessageThread[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(
        preferredUserId ?? null,
    );
    const [selectedUser, setSelectedUser] =
        useState<DirectMessageParticipant | null>(
            buildFallbackParticipant(preferredUserId, preferredUserName),
        );
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [draft, setDraft] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [threadFilter, setThreadFilter] = useState<'all' | 'unread'>('all');
    const [activePane, setActivePane] = useState<'messages' | 'bids'>(
        'messages',
    );
    const [bidNotifications, setBidNotifications] = useState<
        BidNotificationItem[]
    >([]);
    const [bidNotificationsLoading, setBidNotificationsLoading] =
        useState(false);
    const [selectedBidNotificationKey, setSelectedBidNotificationKey] =
        useState<string | null>(null);
    const [openKebabUserId, setOpenKebabUserId] = useState<number | null>(null);
    const [kebabMenuPos, setKebabMenuPos] = useState<{
        top: number;
        right: number;
    } | null>(null);
    const [pinnedUserIds, setPinnedUserIds] = useState<Set<number>>(() => {
        try {
            const stored = localStorage.getItem('chat_pinned_threads');
            return stored
                ? new Set<number>(JSON.parse(stored) as number[])
                : new Set<number>();
        } catch {
            return new Set<number>();
        }
    });
    const [hiddenUserIds, setHiddenUserIds] = useState<Set<number>>(new Set());
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recordingStreamRef = useRef<MediaStream | null>(null);
    const hasLoadedThreadsRef = useRef(false);
    const threadsRequestInFlightRef = useRef(false);
    const seenBidNotificationStorageKey = authUser
        ? `seen_bid_notifications_${authUser.id}`
        : 'seen_bid_notifications_guest';
    const [seenBidNotificationKeys, setSeenBidNotificationKeys] = useState<
        Set<string>
    >(() => {
        try {
            const stored = localStorage.getItem(seenBidNotificationStorageKey);
            return stored
                ? new Set<string>(JSON.parse(stored) as string[])
                : new Set<string>();
        } catch {
            return new Set<string>();
        }
    });

    const selectedThread = useMemo(
        () =>
            threads.find((thread) => thread.user?.id === selectedUserId) ??
            null,
        [selectedUserId, threads],
    );

    const filteredThreads = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return threads
            .filter((thread) => {
                if (
                    thread.user?.id !== undefined &&
                    hiddenUserIds.has(thread.user.id)
                )
                    return false;
                const displayName = thread.user?.name?.toLowerCase() ?? '';
                const shopName =
                    thread.user?.seller_registration?.shop_name?.toLowerCase() ??
                    '';
                const matchesSearch =
                    normalizedSearch.length === 0 ||
                    displayName.includes(normalizedSearch) ||
                    shopName.includes(normalizedSearch);
                const matchesFilter =
                    threadFilter === 'all' || thread.unread_count > 0;
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => {
                const aPin =
                    a.user?.id !== undefined && pinnedUserIds.has(a.user.id);
                const bPin =
                    b.user?.id !== undefined && pinnedUserIds.has(b.user.id);
                if (aPin && !bPin) return -1;
                if (!aPin && bPin) return 1;
                return 0;
            });
    }, [searchTerm, threadFilter, threads, hiddenUserIds, pinnedUserIds]);

    const unseenBidNotificationsCount = useMemo(() => {
        return bidNotifications.filter(
            (item) => !seenBidNotificationKeys.has(item.key),
        ).length;
    }, [bidNotifications, seenBidNotificationKeys]);

    const selectedBidNotification = useMemo(() => {
        if (!selectedBidNotificationKey) {
            return null;
        }

        return (
            bidNotifications.find(
                (item) => item.key === selectedBidNotificationKey,
            ) ?? null
        );
    }, [bidNotifications, selectedBidNotificationKey]);

    const sortedBidNotifications = useMemo(() => {
        return [...bidNotifications].sort((left, right) => {
            const leftTime = left.created_at
                ? new Date(left.created_at).getTime()
                : 0;
            const rightTime = right.created_at
                ? new Date(right.created_at).getTime()
                : 0;
            return rightTime - leftTime;
        });
    }, [bidNotifications]);

    useEffect(() => {
        if (!isOpen) {
            setThreadsLoading(false);
            setMessagesLoading(false);
            setBidNotificationsLoading(false);
            return;
        }

        setSelectedUserId(preferredUserId ?? null);
        setSelectedUser(
            buildFallbackParticipant(preferredUserId, preferredUserName),
        );
        setDraft('');
        setSelectedFiles([]);
        setIsEmojiPickerOpen(false);
        setSearchTerm('');
        setThreadFilter('all');
        setActivePane('messages');
        setThreadsLoading(false);
        setMessagesLoading(false);
        setBidNotificationsLoading(false);
        hasLoadedThreadsRef.current = false;
        threadsRequestInFlightRef.current = false;
    }, [isOpen, preferredUserId, preferredUserName]);

    useEffect(() => {
        if (!isOpen || preferredUserId) {
            return;
        }

        if (activePane === 'messages' && unseenBidNotificationsCount > 0) {
            setActivePane('bids');
        }
    }, [activePane, isOpen, preferredUserId, unseenBidNotificationsCount]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(seenBidNotificationStorageKey);
            setSeenBidNotificationKeys(
                stored
                    ? new Set<string>(JSON.parse(stored) as string[])
                    : new Set<string>(),
            );
        } catch {
            setSeenBidNotificationKeys(new Set<string>());
        }
    }, [seenBidNotificationStorageKey]);

    const markBidNotificationsAsSeen = (keys: string[]) => {
        if (keys.length === 0) {
            return;
        }

        setSeenBidNotificationKeys((prev) => {
            const next = new Set(prev);
            keys.forEach((key) => next.add(key));
            try {
                localStorage.setItem(
                    seenBidNotificationStorageKey,
                    JSON.stringify([...next]),
                );
            } catch {
                // Ignore storage errors.
            }
            window.dispatchEvent(
                new CustomEvent('bid-notifications-seen-updated'),
            );
            return next;
        });
    };

    useEffect(() => {
        if (!isOpen || !authUser) {
            return;
        }

        let isActive = true;

        const loadBidNotifications = async (isSilent = false) => {
            if (!isSilent && isActive) {
                setBidNotificationsLoading(true);
            }

            try {
                const response =
                    await bidNotificationService.getMyNotifications();
                if (!isActive) {
                    return;
                }

                setBidNotifications(response.items ?? []);

                if (!selectedBidNotificationKey && response.items?.[0]?.key) {
                    setSelectedBidNotificationKey(response.items[0].key);
                    return;
                }

                if (
                    selectedBidNotificationKey &&
                    !(response.items ?? []).some(
                        (item) => item.key === selectedBidNotificationKey,
                    )
                ) {
                    setSelectedBidNotificationKey(
                        response.items?.[0]?.key ?? null,
                    );
                }
            } catch {
                if (isActive) {
                    if (!isSilent) {
                        toast.error('Unable to load bid alerts right now.');
                    }

                    setBidNotifications([]);
                    setSelectedBidNotificationKey(null);
                }
            } finally {
                if (!isSilent && isActive) {
                    setBidNotificationsLoading(false);
                }
            }
        };

        void loadBidNotifications();

        const interval = window.setInterval(() => {
            void loadBidNotifications(true);
        }, 15000);

        return () => {
            isActive = false;
            window.clearInterval(interval);
        };
    }, [authUser, isOpen]);

    useEffect(() => {
        if (activePane !== 'bids') {
            return;
        }

        markBidNotificationsAsSeen(bidNotifications.map((item) => item.key));
    }, [activePane, bidNotifications]);

    useEffect(() => {
        return () => {
            mediaRecorderRef.current?.stop();
            recordingStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());
        };
    }, []);

    useEffect(() => {
        if (!isOpen || !authUser) {
            return;
        }

        let isActive = true;

        const loadThreads = async (isSilent = false) => {
            if (threadsRequestInFlightRef.current) {
                if (!isSilent) {
                    setThreadsLoading(false);
                }
                return;
            }

            threadsRequestInFlightRef.current = true;

            if (isActive && !isSilent && !hasLoadedThreadsRef.current) {
                setThreadsLoading(true);
            }

            try {
                const data = await directMessageService.getThreads();
                if (!isActive) {
                    return;
                }

                setThreads(data.threads);
                hasLoadedThreadsRef.current = true;

                const selectedThread = selectedUserId
                    ? data.threads.find(
                          (thread) => thread.user?.id === selectedUserId,
                      )
                    : null;

                if (selectedThread?.user) {
                    setSelectedUser(selectedThread.user);
                }

                if (preferredUserId) {
                    const preferredThread = data.threads.find(
                        (thread) => thread.user?.id === preferredUserId,
                    );
                    if (preferredThread?.user) {
                        setSelectedUser(preferredThread.user);
                    }
                } else if (!selectedUserId && data.threads[0]?.user?.id) {
                    setSelectedUserId(data.threads[0].user.id);
                    setSelectedUser(data.threads[0].user);
                } else if (selectedUserId && !selectedThread) {
                    const fallbackUser = data.threads[0]?.user;
                    setSelectedUserId(fallbackUser?.id ?? null);
                    setSelectedUser(fallbackUser ?? null);
                    setMessages([]);
                }
            } catch (error) {
                if (isActive) {
                    const message =
                        typeof error === 'object' &&
                        error !== null &&
                        'message' in error &&
                        typeof (error as { message?: unknown }).message ===
                            'string'
                            ? (error as { message: string }).message
                            : 'Unable to load conversations right now.';
                    toast.error(message);
                }
            } finally {
                threadsRequestInFlightRef.current = false;

                if (!isSilent) {
                    setThreadsLoading(false);
                }
            }
        };

        void loadThreads();

        const interval = window.setInterval(() => {
            void loadThreads(true);
        }, 5000);

        return () => {
            isActive = false;
            window.clearInterval(interval);
        };
    }, [authUser, isOpen, preferredUserId]);

    useEffect(() => {
        if (!isOpen || !authUser || !selectedUserId) {
            setMessages([]);
            setMessagesLoading(false);
            return;
        }

        let isActive = true;

        const loadThread = async (isSilent = false) => {
            if (!isSilent && isActive) {
                setMessagesLoading(true);
            }

            try {
                const data =
                    await directMessageService.getThread(selectedUserId);
                if (!isActive) {
                    return;
                }

                setSelectedUser(
                    data.user ??
                        buildFallbackParticipant(
                            selectedUserId,
                            preferredUserName,
                        ),
                );
                setMessages(data.messages);
                setThreads((prev) =>
                    prev.map((thread) =>
                        thread.user?.id === selectedUserId
                            ? { ...thread, unread_count: 0 }
                            : thread,
                    ),
                );

                if (data.user?.id) {
                    const latest = data.messages[data.messages.length - 1];
                    const latestPreview = latest?.message?.trim()
                        ? latest.message.trim()
                        : latest?.attachments?.length === 1
                          ? 'Sent an attachment'
                          : latest?.attachments && latest.attachments.length > 1
                            ? `Sent ${latest.attachments.length} attachments`
                            : 'New message';

                    setThreads((prev) => {
                        if (
                            prev.some(
                                (thread) => thread.user?.id === data.user?.id,
                            )
                        ) {
                            return prev;
                        }

                        return [
                            {
                                user: data.user,
                                latest_message: latestPreview,
                                latest_message_at: latest?.created_at ?? null,
                                unread_count: 0,
                            },
                            ...prev,
                        ];
                    });
                }
            } catch (error) {
                if (isActive && !isSilent) {
                    const message =
                        typeof error === 'object' &&
                        error !== null &&
                        'message' in error &&
                        typeof (error as { message?: unknown }).message ===
                            'string'
                            ? (error as { message: string }).message
                            : 'Unable to load this conversation right now.';
                    toast.error(message);
                }
            } finally {
                if (isActive && !isSilent) {
                    setMessagesLoading(false);
                }
            }
        };

        void loadThread();

        const interval = window.setInterval(() => {
            void loadThread(true);
        }, 4000);

        return () => {
            isActive = false;
            window.clearInterval(interval);
            setMessagesLoading(false);
        };
    }, [authUser, isOpen, selectedUserId]);

    const formatDate = (value?: string | null) => {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    const formatFileSize = (size?: number | null) => {
        if (!size || size <= 0) {
            return '';
        }

        if (size >= 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }

        if (size >= 1024) {
            return `${Math.round(size / 1024)} KB`;
        }

        return `${size} B`;
    };

    const isImageAttachment = (attachment?: DirectMessageAttachment) => {
        return Boolean(attachment?.mime_type?.startsWith('image/'));
    };

    const isAudioAttachment = (attachment?: DirectMessageAttachment) => {
        return Boolean(attachment?.mime_type?.startsWith('audio/'));
    };

    const getParticipantLabel = (user?: DirectMessageParticipant | null) => {
        if (!user) {
            return 'Conversation';
        }

        return (
            user.seller_registration?.shop_name?.trim() ||
            user.name ||
            `User #${user.id}`
        );
    };

    const canOpenSellerStore = (user?: DirectMessageParticipant | null) => {
        return Boolean(
            user?.id && user?.seller_registration?.shop_name?.trim(),
        );
    };

    const handleOpenSellerStore = (user?: DirectMessageParticipant | null) => {
        if (!canOpenSellerStore(user) || !user?.id) {
            return;
        }

        onNavigateSellerStore(
            user.id,
            user.seller_registration?.shop_name?.trim() || user.name,
        );
        onClose();
    };

    const handleSelectThread = (thread: DirectMessageThread) => {
        if (!thread.user) {
            return;
        }

        if (selectedUserId === thread.user.id) {
            return;
        }

        setSelectedUserId(thread.user.id);
        setSelectedUser(thread.user);
        setMessages([]);
        setMessagesLoading(true);
    };

    const handlePinThread = (userId: number) => {
        setPinnedUserIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            try {
                localStorage.setItem(
                    'chat_pinned_threads',
                    JSON.stringify([...next]),
                );
            } catch {
                /* ignore */
            }
            return next;
        });
        setOpenKebabUserId(null);
    };

    const handleDeleteThread = async (userId: number) => {
        setOpenKebabUserId(null);
        setKebabMenuPos(null);
        setDeletingUserId(userId);
        try {
            await directMessageService.deleteThread(userId);
        } catch {
            // best-effort; hide locally regardless
        } finally {
            setDeletingUserId(null);
        }
        setThreads((prev) => prev.filter((t) => t.user?.id !== userId));
        if (selectedUserId === userId) {
            setSelectedUserId(null);
            setSelectedUser(null);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedUserId || (!draft.trim() && selectedFiles.length === 0)) {
            return;
        }

        setSending(true);

        try {
            const createdMessage = await directMessageService.sendMessage(
                selectedUserId,
                {
                    message: draft.trim(),
                    attachments: selectedFiles,
                },
            );
            setMessages((prev) => [...prev, createdMessage]);
            setDraft('');
            setSelectedFiles([]);
            setThreads((prev) => {
                const nextThread: DirectMessageThread = {
                    user: selectedUser,
                    latest_message:
                        createdMessage.message.trim() ||
                        (createdMessage.attachments?.length === 1
                            ? 'Sent an attachment'
                            : `Sent ${createdMessage.attachments?.length ?? 0} attachments`),
                    latest_message_at: createdMessage.created_at,
                    unread_count: 0,
                };
                const others = prev.filter(
                    (thread) => thread.user?.id !== selectedUserId,
                );
                return [nextThread, ...others];
            });
        } catch (error) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Unable to send your message right now.';
            toast.error(message);
        } finally {
            setSending(false);
        }
    };

    const handleFileSelection = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const files = Array.from(event.target.files ?? []);
        setSelectedFiles(files);
    };

    const handleRemoveSelectedFile = (fileName: string) => {
        setSelectedFiles((prev) =>
            prev.filter((file) => file.name !== fileName),
        );
    };

    const handleAddEmoji = (emoji: string) => {
        setDraft((prev) => `${prev}${emoji}`);
        setIsEmojiPickerOpen(false);
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            return;
        }

        if (
            !navigator.mediaDevices?.getUserMedia ||
            typeof MediaRecorder === 'undefined'
        ) {
            toast.error('Voice recording is not supported in this browser.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const mediaRecorder = new MediaRecorder(stream);

            recordedChunksRef.current = [];
            recordingStreamRef.current = stream;
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            });

            mediaRecorder.addEventListener('stop', () => {
                const blob = new Blob(recordedChunksRef.current, {
                    type: mediaRecorder.mimeType || 'audio/webm',
                });
                if (blob.size > 0) {
                    const extension = blob.type.includes('ogg')
                        ? 'ogg'
                        : blob.type.includes('mp4')
                          ? 'm4a'
                          : 'webm';
                    const voiceFile = new File(
                        [blob],
                        `voice-clip-${Date.now()}.${extension}`,
                        { type: blob.type || 'audio/webm' },
                    );
                    setSelectedFiles((prev) => [...prev, voiceFile]);
                }

                recordingStreamRef.current
                    ?.getTracks()
                    .forEach((track) => track.stop());
                recordingStreamRef.current = null;
                mediaRecorderRef.current = null;
                recordedChunksRef.current = [];
            });

            mediaRecorder.start();
            setIsRecording(true);
            setIsEmojiPickerOpen(false);
        } catch {
            toast.error('Microphone access was denied.');
        }
    };

    useEffect(() => {
        if (!openKebabUserId) return;
        const handleClickOutside = () => {
            setOpenKebabUserId(null);
            setKebabMenuPos(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [openKebabUserId]);

    if (!isOpen || !authUser) {
        return null;
    }

    return (
        <div
            className="seller-chat-dialog-backdrop"
            role="presentation"
            onClick={onClose}
        >
            <div
                className="seller-chat-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Seller chat"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Fixed-position kebab menu — rendered outside scroll container */}
                {openKebabUserId !== null &&
                    kebabMenuPos !== null &&
                    (() => {
                        const userId = openKebabUserId;
                        const isPinned = pinnedUserIds.has(userId);
                        return (
                            <div
                                className="seller-chat-thread-menu"
                                style={{
                                    position: 'fixed',
                                    top: kebabMenuPos.top,
                                    right: kebabMenuPos.right,
                                    zIndex: 9999,
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    className="seller-chat-thread-menu-item"
                                    onClick={() => handlePinThread(userId)}
                                >
                                    📌 {isPinned ? 'Unpin' : 'Pin'}
                                </button>
                                <button
                                    type="button"
                                    className="seller-chat-thread-menu-item seller-chat-thread-menu-item-danger"
                                    onClick={() => {
                                        void handleDeleteThread(userId);
                                    }}
                                >
                                    🗑️ Delete conversation
                                </button>
                            </div>
                        );
                    })()}
                <header className="seller-chat-dialog-header">
                    <h3>
                        {selectedUser
                            ? `Message ${getParticipantLabel(selectedUser)}`
                            : 'Chat'}
                    </h3>
                    <button
                        type="button"
                        className="seller-chat-close-btn"
                        onClick={onClose}
                        aria-label="Close chat dialog"
                    >
                        ×
                    </button>
                </header>

                <div
                    className={`seller-chat-dialog-content ${activePane === 'bids' ? 'seller-chat-dialog-content-bids' : ''}`}
                >
                    <aside className="seller-chat-left-panel">
                        <div
                            className="seller-chat-pane-tabs"
                            role="tablist"
                            aria-label="Chat panes"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activePane === 'messages'}
                                className={`seller-chat-pane-tab ${activePane === 'messages' ? 'active' : ''}`}
                                onClick={() => setActivePane('messages')}
                            >
                                Messages
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activePane === 'bids'}
                                className={`seller-chat-pane-tab ${activePane === 'bids' ? 'active' : ''}`}
                                onClick={() => setActivePane('bids')}
                            >
                                Bid Alerts
                                {unseenBidNotificationsCount > 0 && (
                                    <span className="seller-chat-pane-tab-badge">
                                        {unseenBidNotificationsCount > 99
                                            ? '99+'
                                            : unseenBidNotificationsCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {activePane === 'messages' && (
                            <>
                                <div className="seller-chat-tools">
                                    <input
                                        className="seller-chat-search"
                                        type="text"
                                        placeholder="Search name"
                                        value={searchTerm}
                                        onChange={(event) =>
                                            setSearchTerm(event.target.value)
                                        }
                                    />
                                    <select
                                        className="seller-chat-filter"
                                        value={threadFilter}
                                        onChange={(event) =>
                                            setThreadFilter(
                                                event.target.value as
                                                    | 'all'
                                                    | 'unread',
                                            )
                                        }
                                    >
                                        <option value="all">All</option>
                                        <option value="unread">Unread</option>
                                    </select>
                                </div>

                                <div className="seller-chat-thread-list">
                                    {threadsLoading &&
                                        filteredThreads.length === 0 && (
                                            <p className="seller-chat-thread-empty">
                                                Loading conversations...
                                            </p>
                                        )}
                                    {!threadsLoading &&
                                        filteredThreads.length === 0 && (
                                            <p className="seller-chat-thread-empty">
                                                No conversations yet.
                                            </p>
                                        )}

                                    {filteredThreads.map((thread) => (
                                        <div
                                            key={
                                                thread.user?.id ??
                                                thread.latest_message_at
                                            }
                                            className={`seller-chat-thread-wrap${thread.user?.id !== undefined && pinnedUserIds.has(thread.user.id) ? 'is-pinned' : ''}`}
                                        >
                                            <button
                                                type="button"
                                                className={`seller-chat-thread ${selectedUserId === thread.user?.id ? 'active' : ''}`}
                                                onClick={() =>
                                                    handleSelectThread(thread)
                                                }
                                            >
                                                <div
                                                    className="seller-chat-avatar"
                                                    aria-hidden="true"
                                                >
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        role="img"
                                                        focusable="false"
                                                    >
                                                        <path
                                                            fill="currentColor"
                                                            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
                                                        />
                                                    </svg>
                                                </div>
                                                <div className="seller-chat-thread-body">
                                                    <div className="seller-chat-thread-topline">
                                                        <p className="seller-chat-thread-name">
                                                            {thread.user?.id !==
                                                                undefined &&
                                                                pinnedUserIds.has(
                                                                    thread.user
                                                                        .id,
                                                                ) && (
                                                                    <span
                                                                        className="seller-chat-pin-icon"
                                                                        aria-label="Pinned"
                                                                    >
                                                                        📌
                                                                    </span>
                                                                )}
                                                            {getParticipantLabel(
                                                                thread.user,
                                                            )}
                                                        </p>
                                                        {thread.unread_count >
                                                            0 && (
                                                            <span className="seller-chat-thread-badge">
                                                                {
                                                                    thread.unread_count
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="seller-chat-thread-preview">
                                                        {thread.latest_message}
                                                    </p>
                                                    <p className="seller-chat-thread-time">
                                                        {formatDate(
                                                            thread.latest_message_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </button>
                                            <div
                                                className="seller-chat-thread-kebab-wrap"
                                                onMouseDown={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <button
                                                    type="button"
                                                    className="seller-chat-thread-kebab-btn"
                                                    aria-label="More options"
                                                    disabled={
                                                        deletingUserId ===
                                                        thread.user?.id
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const isOpen =
                                                            openKebabUserId ===
                                                            (thread.user?.id ??
                                                                null);
                                                        if (isOpen) {
                                                            setOpenKebabUserId(
                                                                null,
                                                            );
                                                            setKebabMenuPos(
                                                                null,
                                                            );
                                                        } else {
                                                            const rect =
                                                                e.currentTarget.getBoundingClientRect();
                                                            const menuHeight = 88;
                                                            const spaceBelow =
                                                                window.innerHeight -
                                                                rect.bottom;
                                                            const top =
                                                                spaceBelow >=
                                                                menuHeight
                                                                    ? rect.bottom +
                                                                      4
                                                                    : rect.top -
                                                                      menuHeight -
                                                                      4;
                                                            setKebabMenuPos({
                                                                top,
                                                                right:
                                                                    window.innerWidth -
                                                                    rect.right,
                                                            });
                                                            setOpenKebabUserId(
                                                                thread.user
                                                                    ?.id ??
                                                                    null,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {deletingUserId ===
                                                    thread.user?.id
                                                        ? '…'
                                                        : '⋮'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {activePane === 'bids' && (
                            <>
                                <div className="seller-chat-bid-list-head">
                                    <p className="seller-chat-bid-list-title">
                                        Your Alerts (
                                        {sortedBidNotifications.length})
                                    </p>
                                    <button
                                        type="button"
                                        className="seller-chat-mark-seen-btn"
                                        disabled={
                                            unseenBidNotificationsCount === 0
                                        }
                                        onClick={() => {
                                            markBidNotificationsAsSeen(
                                                sortedBidNotifications.map(
                                                    (item) => item.key,
                                                ),
                                            );
                                        }}
                                    >
                                        Mark all as seen
                                    </button>
                                </div>
                                <div className="seller-chat-thread-list seller-chat-bid-list">
                                    {bidNotificationsLoading &&
                                        sortedBidNotifications.length === 0 && (
                                            <p className="seller-chat-thread-empty">
                                                Loading bid alerts...
                                            </p>
                                        )}
                                    {!bidNotificationsLoading &&
                                        sortedBidNotifications.length === 0 && (
                                            <p className="seller-chat-thread-empty">
                                                No bid alerts yet.
                                            </p>
                                        )}

                                    {sortedBidNotifications.map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            className={`seller-chat-bid-item ${selectedBidNotificationKey === item.key ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedBidNotificationKey(
                                                    item.key,
                                                );
                                                markBidNotificationsAsSeen([
                                                    item.key,
                                                ]);
                                            }}
                                        >
                                            <div className="seller-chat-bid-item-topline">
                                                <p className="seller-chat-bid-item-title">
                                                    {item.auction_title}
                                                </p>
                                                {!seenBidNotificationKeys.has(
                                                    item.key,
                                                ) && (
                                                    <span className="seller-chat-thread-badge">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <p className="seller-chat-bid-item-message">
                                                {item.message}
                                            </p>
                                            <div className="seller-chat-bid-item-footer">
                                                <p className="seller-chat-thread-time">
                                                    {formatDate(
                                                        item.created_at,
                                                    )}
                                                </p>
                                                <span className="seller-chat-bid-item-cta">
                                                    Open
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </aside>

                    {activePane === 'messages' && selectedUserId ? (
                        <main className="seller-chat-main-pane">
                            <div className="seller-chat-conversation-header">
                                <div>
                                    {canOpenSellerStore(selectedUser) ? (
                                        <button
                                            type="button"
                                            className="seller-chat-conversation-name seller-chat-conversation-name-link"
                                            onClick={() =>
                                                handleOpenSellerStore(
                                                    selectedUser,
                                                )
                                            }
                                        >
                                            {getParticipantLabel(selectedUser)}
                                        </button>
                                    ) : (
                                        <p className="seller-chat-conversation-name">
                                            {getParticipantLabel(selectedUser)}
                                        </p>
                                    )}
                                    <p className="seller-chat-conversation-subtitle">
                                        {selectedUser?.name ||
                                            preferredUserName ||
                                            'Direct messages'}
                                    </p>
                                </div>
                            </div>

                            <div className="seller-chat-message-list">
                                {messagesLoading && messages.length === 0 && (
                                    <p className="seller-chat-message-empty">
                                        Loading conversation...
                                    </p>
                                )}
                                {!messagesLoading && messages.length === 0 && (
                                    <p className="seller-chat-message-empty">
                                        Start the conversation with this seller.
                                    </p>
                                )}

                                {messages.map((message) => {
                                    const isOwnMessage =
                                        message.sender_id === authUser.id;
                                    return (
                                        <article
                                            key={message.id}
                                            className={`seller-chat-message-bubble ${isOwnMessage ? 'is-own' : 'is-other'}`}
                                        >
                                            {message.message.trim() && (
                                                <p className="seller-chat-message-text">
                                                    {message.message}
                                                </p>
                                            )}
                                            {message.attachments &&
                                                message.attachments.length >
                                                    0 && (
                                                    <div className="seller-chat-attachment-list">
                                                        {message.attachments.map(
                                                            (attachment) => (
                                                                <a
                                                                    key={
                                                                        attachment.id
                                                                    }
                                                                    className={`seller-chat-attachment ${isImageAttachment(attachment) ? 'is-image' : 'is-file'}`}
                                                                    href={
                                                                        attachment.url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    {isImageAttachment(
                                                                        attachment,
                                                                    ) ? (
                                                                        <img
                                                                            className="seller-chat-attachment-image"
                                                                            src={
                                                                                attachment.url
                                                                            }
                                                                            alt={
                                                                                attachment.file_name
                                                                            }
                                                                        />
                                                                    ) : isAudioAttachment(
                                                                          attachment,
                                                                      ) ? (
                                                                        <audio
                                                                            className="seller-chat-attachment-audio"
                                                                            controls
                                                                            src={
                                                                                attachment.url
                                                                            }
                                                                        >
                                                                            Your
                                                                            browser
                                                                            does
                                                                            not
                                                                            support
                                                                            the
                                                                            audio
                                                                            element.
                                                                        </audio>
                                                                    ) : (
                                                                        <div className="seller-chat-attachment-file">
                                                                            <span className="seller-chat-attachment-file-name">
                                                                                {
                                                                                    attachment.file_name
                                                                                }
                                                                            </span>
                                                                            <span className="seller-chat-attachment-file-meta">
                                                                                {formatFileSize(
                                                                                    attachment.file_size,
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </a>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            <span className="seller-chat-message-time">
                                                {formatDate(message.created_at)}
                                            </span>
                                        </article>
                                    );
                                })}
                            </div>

                            <div className="seller-chat-compose">
                                <div className="seller-chat-compose-actions">
                                    <label
                                        className="seller-chat-icon-btn"
                                        aria-label="Attach files"
                                        title="Attach files"
                                    >
                                        <input
                                            className="seller-chat-attach-input"
                                            type="file"
                                            multiple
                                            onChange={handleFileSelection}
                                        />
                                        <svg
                                            viewBox="0 0 24 24"
                                            role="img"
                                            focusable="false"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M16.5 6.5v8.75a4.25 4.25 0 1 1-8.5 0V5.75a2.75 2.75 0 0 1 5.5 0V14a1.25 1.25 0 0 1-2.5 0V7h-1.5v7a2.75 2.75 0 0 0 5.5 0V5.75a4.25 4.25 0 1 0-8.5 0v9.5a5.75 5.75 0 1 0 11.5 0V6.5Z"
                                            />
                                        </svg>
                                    </label>
                                    <button
                                        type="button"
                                        className={`seller-chat-icon-btn ${isEmojiPickerOpen ? 'is-active' : ''}`}
                                        onClick={() =>
                                            setIsEmojiPickerOpen(
                                                (prev) => !prev,
                                            )
                                        }
                                        aria-label="Choose emoji"
                                        title="Choose emoji"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            role="img"
                                            focusable="false"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10Zm0-18.5A8.5 8.5 0 1 0 20.5 12 8.51 8.51 0 0 0 12 3.5Zm-3 6.25A1.25 1.25 0 1 1 10.25 8.5 1.25 1.25 0 0 1 9 9.75Zm6 0A1.25 1.25 0 1 1 16.25 8.5 1.25 1.25 0 0 1 15 9.75Zm-3 7a5.56 5.56 0 0 1-4.22-1.93l1.14-.97a4.05 4.05 0 0 0 6.16 0l1.14.97A5.56 5.56 0 0 1 12 16.75Z"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className={`seller-chat-icon-btn ${isRecording ? 'is-recording' : ''}`}
                                        onClick={() => {
                                            void handleToggleRecording();
                                        }}
                                        aria-label={
                                            isRecording
                                                ? 'Stop voice recording'
                                                : 'Record voice clip'
                                        }
                                        title={
                                            isRecording
                                                ? 'Stop voice recording'
                                                : 'Record voice clip'
                                        }
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            role="img"
                                            focusable="false"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M12 15.75A3.75 3.75 0 0 0 15.75 12V6a3.75 3.75 0 0 0-7.5 0v6A3.75 3.75 0 0 0 12 15.75Zm5-3.75a.75.75 0 0 1 1.5 0A6.51 6.51 0 0 1 12.75 18.44V21h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5v-2.56A6.51 6.51 0 0 1 5.5 12a.75.75 0 0 1 1.5 0 5 5 0 1 0 10 0Z"
                                            />
                                        </svg>
                                    </button>
                                    {isEmojiPickerOpen && (
                                        <div className="seller-chat-emoji-panel">
                                            {quickEmojis.map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    className="seller-chat-emoji-btn"
                                                    onClick={() =>
                                                        handleAddEmoji(emoji)
                                                    }
                                                    aria-label={`Insert ${emoji}`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {isRecording && (
                                        <div
                                            className="seller-chat-recording-indicator"
                                            aria-live="polite"
                                        >
                                            ●
                                        </div>
                                    )}
                                    {selectedFiles.length > 0 && (
                                        <div className="seller-chat-selected-files">
                                            {selectedFiles.map((file) => (
                                                <div
                                                    key={`${file.name}-${file.size}`}
                                                    className="seller-chat-selected-file-chip"
                                                >
                                                    <span>{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveSelectedFile(
                                                                file.name,
                                                            )
                                                        }
                                                        aria-label={`Remove ${file.name}`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <textarea
                                    className="seller-chat-compose-input"
                                    rows={3}
                                    placeholder={`Message ${getParticipantLabel(selectedUser)}...`}
                                    value={draft}
                                    onChange={(event) =>
                                        setDraft(event.target.value)
                                    }
                                />
                                <div className="seller-chat-compose-row">
                                    <p className="seller-chat-compose-note">
                                        Messages and attachments are sent
                                        directly to this seller.
                                    </p>
                                    <button
                                        type="button"
                                        className="seller-chat-send-btn"
                                        onClick={handleSendMessage}
                                        disabled={
                                            sending ||
                                            (!draft.trim() &&
                                                selectedFiles.length === 0)
                                        }
                                        aria-label="Send message"
                                        title="Send message"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            role="img"
                                            focusable="false"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M3.41 20.59a.75.75 0 0 1 .1-.93L18.12 5.05 4.57 10.13a.75.75 0 0 1-.52-1.4l15.75-5.91a.75.75 0 0 1 .97.97L14.86 19.54a.75.75 0 0 1-1.4-.52l5.08-13.55L4.34 20.08a.75.75 0 0 1-.93.1Z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </main>
                    ) : activePane === 'bids' && selectedBidNotification ? (
                        <main className="seller-chat-main-pane seller-chat-bid-pane">
                            <div className="seller-chat-conversation-header">
                                <div>
                                    <p className="seller-chat-conversation-name">
                                        Bid Alert
                                    </p>
                                    <p className="seller-chat-conversation-subtitle">
                                        Real-time updates for your bidded
                                        products
                                    </p>
                                </div>
                            </div>
                            <div className="seller-chat-bid-detail">
                                <div className="seller-chat-bid-detail-scroll">
                                    <h4>
                                        {selectedBidNotification.auction_title}
                                    </h4>
                                    <p>{selectedBidNotification.message}</p>
                                    <p className="seller-chat-thread-time">
                                        {formatDate(
                                            selectedBidNotification.created_at,
                                        )}
                                    </p>
                                    {selectedBidNotification.media_url ? (
                                        <img
                                            className="seller-chat-bid-detail-image"
                                            src={
                                                selectedBidNotification.media_url
                                            }
                                            alt={
                                                selectedBidNotification.auction_title
                                            }
                                        />
                                    ) : null}
                                </div>
                                <div className="seller-chat-bid-detail-actions">
                                    <button
                                        type="button"
                                        className="seller-chat-view-auction-btn"
                                        onClick={() => {
                                            onNavigateAuction(
                                                selectedBidNotification.auction_id,
                                            );
                                            onClose();
                                        }}
                                    >
                                        View Auction
                                    </button>
                                </div>
                            </div>
                        </main>
                    ) : (
                        <main className="seller-chat-empty-pane">
                            <div
                                className="seller-chat-empty-illustration"
                                aria-hidden="true"
                            >
                                💬
                            </div>
                            <p className="seller-chat-empty-title">
                                Welcome to Auctify Chat
                            </p>
                            <p className="seller-chat-empty-subtitle">
                                {activePane === 'bids'
                                    ? 'No bid alerts yet. Updates will appear when auction activity changes.'
                                    : 'Choose a conversation or message a seller to get started.'}
                            </p>
                        </main>
                    )}
                </div>
            </div>
        </div>
    );
};
