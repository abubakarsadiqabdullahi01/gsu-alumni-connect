"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Layers3, MessageCircle, Search, Send, UserRound, UsersRound } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPusherClient } from "@/lib/pusher-client";

type ConversationListItem = {
  id: string;
  isGroup: boolean;
  title: string;
  avatar: string | null;
  participants: Array<{
    graduateId: string;
    fullName: string;
    registrationNo: string;
    image: string | null;
    lastSeenAt: string | null;
  }>;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderName: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

type MessageItem = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    graduateId: string;
    fullName: string;
    registrationNo: string;
    image: string | null;
  };
};

type ConversationDetail = {
  id: string;
  isGroup: boolean;
  groupName: string | null;
  participants: Array<{
    graduateId: string;
    fullName: string;
    registrationNo: string;
    image: string | null;
    lastSeenAt: string | null;
  }>;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function MessagesClient() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [conversationTab, setConversationTab] = useState<"all" | "friends" | "groups">("all");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selfGraduateId, setSelfGraduateId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pusherRef = useRef<ReturnType<typeof getPusherClient>>(null);
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const [onlineGraduateIds, setOnlineGraduateIds] = useState<Set<string>>(new Set());
  const ONLINE_WINDOW_MS = 2 * 60 * 1000;

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byQuery = !q
      ? conversations
      : conversations.filter((c) => c.title.toLowerCase().includes(q));

    if (conversationTab === "friends") return byQuery.filter((c) => !c.isGroup);
    if (conversationTab === "groups") return byQuery.filter((c) => c.isGroup);
    return byQuery;
  }, [conversations, query, conversationTab]);

  const directCount = useMemo(
    () => conversations.filter((c) => !c.isGroup).length,
    [conversations]
  );
  const groupCount = useMemo(
    () => conversations.filter((c) => c.isGroup).length,
    [conversations]
  );
  const activeDirectPeer = useMemo(() => {
    if (!activeConversation || activeConversation.isGroup || !selfGraduateId) return null;
    return activeConversation.participants.find((p) => p.graduateId !== selfGraduateId) ?? null;
  }, [activeConversation, selfGraduateId]);

  const isActivePeerOnline = activeDirectPeer
    ? onlineGraduateIds.has(activeDirectPeer.graduateId)
    : false;

  const loadConversations = async () => {
    setError("");
    setLoadingList(true);
    try {
      const res = await fetch("/api/messages/conversations");
      const json = (await res.json()) as {
        error?: string;
        conversations?: ConversationListItem[];
        selfGraduateId?: string;
      };
      if (!res.ok || !json.conversations) {
        setError(json.error ?? "Failed to load conversations.");
        return;
      }
      setConversations(json.conversations);
      setSelfGraduateId(json.selfGraduateId ?? null);
      if (!activeConversationId && json.conversations.length) {
        setActiveConversationId(json.conversations[0].id);
      }
    } catch {
      setError("Unable to load conversations.");
    } finally {
      setLoadingList(false);
    }
  };

  const looksRecentlyOnline = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return false;
    const ts = new Date(lastSeenAt).getTime();
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts <= ONLINE_WINDOW_MS;
  };

  const loadMessages = async (conversationId: string) => {
    setError("");
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}`);
      const json = (await res.json()) as {
        error?: string;
        conversation?: ConversationDetail;
        messages?: MessageItem[];
      };
      if (!res.ok || !json.conversation || !json.messages) {
        setError(json.error ?? "Failed to load messages.");
        return;
      }
      setActiveConversation(json.conversation);
      setMessages(json.messages);
      await fetch(`/api/messages/conversations/${conversationId}/read`, { method: "POST" });
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      setError("Unable to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadConversations();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const graduateId = searchParams.get("graduateId");
    const conversationId = searchParams.get("conversationId");
    if (conversationId) {
      setActiveConversationId(conversationId);
      return;
    }
    if (!graduateId) return;
    (async () => {
      const res = await fetch("/api/messages/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graduateId }),
      });
      const json = (await res.json()) as { conversationId?: string };
      if (res.ok && json.conversationId) {
        await loadConversations();
        setActiveConversationId(json.conversationId);
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    if (!activeConversationId) return;
    void loadMessages(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (!pusherRef.current) {
      pusherRef.current = getPusherClient();
    }
    const pusher = pusherRef.current;
    if (!pusher) return;

    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
    }

    const channel = pusher.subscribe(`private-conversation-${activeConversationId}`);
    channel.bind("message:new", (message: MessageItem) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                lastMessage: {
                  id: message.id,
                  body: message.body,
                  createdAt: message.createdAt,
                  senderName: message.sender.fullName,
                },
                updatedAt: message.createdAt,
              }
            : c
        )
      );
    });

    channelRef.current = channel;
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channel.name);
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId || !selfGraduateId) return;
    if (!pusherRef.current) {
      pusherRef.current = getPusherClient();
    }
    const pusher = pusherRef.current;
    if (!pusher) return;

    if (presenceChannelRef.current) {
      presenceChannelRef.current.unbind_all();
      pusher.unsubscribe(presenceChannelRef.current.name);
    }

    const presenceChannel = pusher.subscribe(`presence-conversation-${activeConversationId}`);
    presenceChannel.bind("pusher:subscription_succeeded", (members: any) => {
      const next = new Set<string>();
      if (members && typeof members.each === "function") {
        members.each((member: any) => {
          if (member?.id) next.add(String(member.id));
        });
      }
      setOnlineGraduateIds(next);
    });
    presenceChannel.bind("pusher:member_added", (member: any) => {
      if (!member?.id) return;
      setOnlineGraduateIds((prev) => {
        const next = new Set(prev);
        next.add(String(member.id));
        return next;
      });
    });
    presenceChannel.bind("pusher:member_removed", (member: any) => {
      if (!member?.id) return;
      setOnlineGraduateIds((prev) => {
        const next = new Set(prev);
        next.delete(String(member.id));
        return next;
      });
    });
    presenceChannel.bind("pusher:subscription_error", () => {
      // Keep graceful fallback via lastSeenAt when presence subscription fails.
    });

    presenceChannelRef.current = presenceChannel;
    return () => {
      presenceChannel.unbind_all();
      pusher.unsubscribe(presenceChannel.name);
      setOnlineGraduateIds(new Set());
    };
  }, [activeConversationId, selfGraduateId]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length]);

  const sendMessage = async () => {
    if (!activeConversationId) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = (await res.json()) as { error?: string; message?: MessageItem };
      if (!res.ok || !json.message) {
        setError(json.error ?? "Failed to send message.");
        return;
      }
      setDraft("");
      setMessages((prev) => (prev.some((m) => m.id === json.message!.id) ? prev : [...prev, json.message!]));
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const onlineLabel = (lastSeenAt: string | null, isOnline: boolean) => {
    if (isOnline) return "Active now";
    if (!lastSeenAt) return "Offline";
    return `Active ${formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}`;
  };

  return (
    <>
      <DashboardHeader title="Messages" />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-full border-r md:w-96">
          <div className="space-y-3 border-b p-4">
            <div>
              <h2 className="text-base font-bold">Conversations</h2>
              <p className="text-xs text-muted-foreground">
                {conversations.length} total
              </p>
            </div>
            <Tabs
              value={conversationTab}
              onValueChange={(v) => setConversationTab(v as "all" | "friends" | "groups")}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1">
                <TabsTrigger
                  value="all"
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
                >
                  <Layers3 className="size-3.5" />
                  <span>All</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    {conversations.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="friends"
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
                >
                  <UserRound className="size-3.5" />
                  <span>Friends</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    {directCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="groups"
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
                >
                  <UsersRound className="size-3.5" />
                  <span>Groups</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    {groupCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search conversations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="h-[calc(100vh-220px)] overflow-y-auto">
            {loadingList ? (
              <div className="p-4 text-sm text-muted-foreground">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                    activeConversationId === conv.id ? "bg-muted/60" : ""
                  }`}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarImage src={conv.avatar ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {initials(conv.title)}
                      </AvatarFallback>
                    </Avatar>
                    {!conv.isGroup && conv.participants[0] && onlineGraduateIds.has(conv.participants[0].graduateId) ? (
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    ) : null}
                    {!conv.isGroup &&
                    conv.participants[0] &&
                    !onlineGraduateIds.has(conv.participants[0].graduateId) &&
                    looksRecentlyOnline(conv.participants[0].lastSeenAt) ? (
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{conv.title}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.lastMessage ? conv.lastMessage.body : "No messages yet"}
                    </p>
                    {!conv.isGroup && conv.participants[0] ? (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {onlineLabel(
                          conv.participants[0].lastSeenAt,
                          onlineGraduateIds.has(conv.participants[0].graduateId) ||
                            looksRecentlyOnline(conv.participants[0].lastSeenAt)
                        )}
                      </p>
                    ) : null}
                  </div>
                  {conv.unreadCount > 0 ? (
                    <Badge className="rounded-full px-1.5 text-[10px]">{conv.unreadCount}</Badge>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="hidden flex-1 flex-col md:flex">
          {!activeConversationId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto size-12 text-muted-foreground/30" />
                <h3 className="mt-3 text-sm font-semibold">Select a conversation</h3>
                <p className="text-xs text-muted-foreground">
                  Open a conversation from the left panel.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b p-4">
                <h3 className="text-sm font-semibold">{activeConversation?.groupName ?? activeConversation?.participants[0]?.fullName ?? "Conversation"}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeConversation?.isGroup
                    ? "Group conversation"
                    : onlineLabel(
                        activeDirectPeer?.lastSeenAt ?? null,
                        isActivePeerOnline || looksRecentlyOnline(activeDirectPeer?.lastSeenAt ?? null)
                      )}
                </p>
              </div>

              {error ? (
                <div className="p-4">
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              ) : null}

              <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                {loadingMessages ? (
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender.graduateId === selfGraduateId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${
                          msg.sender.graduateId === selfGraduateId
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border bg-background text-foreground"
                        }`}
                      >
                        {msg.sender.graduateId !== selfGraduateId ? (
                          <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                            {msg.sender.fullName}
                          </p>
                        ) : null}
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            msg.sender.graduateId === selfGraduateId
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <Button onClick={() => void sendMessage()} disabled={sending || !draft.trim()}>
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
