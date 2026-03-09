"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessageSquarePlus, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getPusherClient } from "@/lib/pusher-client";

type GroupPost = {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: {
    graduateId: string;
    fullName: string;
    registrationNo: string;
    image: string | null;
  };
  commentsCount: number;
  reactionsCount: number;
};

type GroupInfo = {
  id: string;
  name: string;
  type: string;
  description: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function GroupPostsClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const pusherChannelRef = useRef<any>(null);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`);
      const json = (await res.json()) as { error?: string; group?: GroupInfo; posts?: GroupPost[] };
      if (!res.ok || !json.group || !json.posts) {
        setError(json.error ?? "Failed to load posts.");
        return;
      }
      setGroup(json.group);
      setPosts(json.posts);
    } catch {
      setError("Unable to load group posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [groupId]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    if (pusherChannelRef.current) {
      pusherChannelRef.current.unbind_all();
      pusher.unsubscribe(pusherChannelRef.current.name);
    }
    const channel = pusher.subscribe(`private-group-${groupId}`);
    channel.bind("post:new", (payload: GroupPost) => {
      setPosts((prev) => (prev.some((p) => p.id === payload.id) ? prev : [payload, ...prev]));
    });
    pusherChannelRef.current = channel;
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channel.name);
    };
  }, [groupId]);

  const publishPost = async () => {
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await res.json()) as { error?: string; post?: GroupPost };
      if (!res.ok || !json.post) {
        setError(json.error ?? "Failed to publish post.");
        return;
      }
      setDraft("");
      setPosts((prev) => (prev.some((p) => p.id === json.post!.id) ? prev : [json.post!, ...prev]));
    } catch {
      setError("Unable to publish post.");
    } finally {
      setPosting(false);
    }
  };

  const openChat = async () => {
    const res = await fetch(`/api/groups/${groupId}/conversation`, { method: "POST" });
    const json = (await res.json()) as { conversationId?: string; error?: string };
    if (!res.ok || !json.conversationId) {
      setError(json.error ?? "Unable to open group chat.");
      return;
    }
    router.push(`/messages?conversationId=${json.conversationId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{group?.name ?? "Group"}</h1>
          <p className="text-sm text-muted-foreground">{group?.description ?? "Group posts and discussions"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/groups">
              <ArrowLeft className="mr-2 size-4" />
              Back to Groups
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void openChat()}>
            <MessageSquarePlus className="mr-2 size-4" />
            Open Group Chat
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share an update with your group..."
            className="min-h-24"
          />
          <Button onClick={() => void publishPost()} disabled={posting || !draft.trim()}>
            <Send className="mr-2 size-4" />
            {posting ? "Posting..." : "Post"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading posts...</CardContent></Card>
      ) : posts.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No posts yet in this group.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarImage src={post.author.image ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                      {initials(post.author.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{post.author.fullName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {post.isPinned ? <Badge>Pinned</Badge> : null}
                </div>
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                  <span>{post.commentsCount} comments</span>
                  <span>{post.reactionsCount} reactions</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
