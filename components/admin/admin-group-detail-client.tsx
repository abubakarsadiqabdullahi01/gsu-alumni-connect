"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Mail,
  MoreHorizontal,
  Phone,
  Pin,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GroupDetailPayload = {
  group: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE" | "CUSTOM";
    isAuto: boolean;
    cohortYear: string | null;
    facultyCode: string | null;
    courseCode: string | null;
    stateCode: string | null;
    createdAt: string;
    updatedAt: string;
    memberCount: number;
    postCount: number;
    members: Array<{
      id: string;
      role: "ADMIN" | "MODERATOR" | "MEMBER";
      joinedAt: string;
      graduate: {
        id: string;
        fullName: string;
        registrationNo: string;
        facultyName: string | null;
        departmentName: string | null;
        user: {
          email: string | null;
          phone: string | null;
        };
      };
    }>;
    posts: Array<{
      id: string;
      content: string;
      imageUrl: string | null;
      isDeleted: boolean;
      isPinned: boolean;
      createdAt: string;
      author: {
        fullName: string;
        registrationNo: string;
      };
      _count: {
        comments: number;
        reactions: number;
      };
    }>;
  };
};

export function AdminGroupDetailClient({ groupId }: { groupId: string }) {
  const [payload, setPayload] = useState<GroupDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyPost, setBusyPost] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`);
      const json = (await res.json()) as GroupDetailPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load group detail.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Failed to load group detail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [groupId]);

  const moderatePost = async (postId: string, action: "delete" | "restore" | "pin" | "unpin") => {
    setBusyPost(postId);
    setError("");
    try {
      const res = await fetch(`/api/admin/groups/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to update post.");
        return;
      }
      await load();
    } catch {
      setError("Failed to update post.");
    } finally {
      setBusyPost(null);
    }
  };

  return (
    <>
      <DashboardHeader title="Admin Group Detail" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/groups">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Groups
          </Link>
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading group detail...</p> : null}

        {!loading && payload ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{payload.group.name}</CardTitle>
                  <Badge>{payload.group.type}</Badge>
                  <Badge variant="outline">{payload.group.isAuto ? "Auto" : "Custom"}</Badge>
                </div>
                <CardDescription>/{payload.group.slug}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {payload.group.description ? <p>{payload.group.description}</p> : <p className="text-muted-foreground">No description.</p>}
                <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-4">
                  <p>Members: <span className="font-semibold text-foreground">{payload.group.memberCount}</span></p>
                  <p>Posts: <span className="font-semibold text-foreground">{payload.group.postCount}</span></p>
                  <p>Created: <span className="font-semibold text-foreground">{new Date(payload.group.createdAt).toLocaleDateString()}</span></p>
                  <p>Updated: <span className="font-semibold text-foreground">{new Date(payload.group.updatedAt).toLocaleDateString()}</span></p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="size-4" /> Recent Members</CardTitle>
                <CardDescription>Last 50 joined members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {payload.group.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members found.</p>
                ) : (
                  payload.group.members.map((member) => (
                    <div key={member.id} className="rounded-lg border p-3">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">{member.graduate.fullName} ({member.graduate.registrationNo})</p>
                        <p className="text-xs text-muted-foreground">
                          {member.graduate.facultyName || "-"} • {member.graduate.departmentName || "-"} • {member.role}
                        </p>
                        <p className="text-xs text-muted-foreground">Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {member.graduate.user.email || "No email"}</span>
                          <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {member.graduate.user.phone || "No phone"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
                <CardDescription>Moderate pinned and deleted state for the latest 50 posts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {payload.group.posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No posts yet.</p>
                ) : (
                  payload.group.posts.map((post) => (
                    <div key={post.id} className="rounded-lg border p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{post.author.fullName}</p>
                            <Badge variant="outline">{post.author.registrationNo}</Badge>
                            {post.isPinned ? <Badge className="bg-blue-50 text-blue-700">Pinned</Badge> : null}
                            {post.isDeleted ? <Badge className="bg-red-50 text-red-700">Deleted</Badge> : null}
                          </div>
                          <p className="whitespace-pre-wrap text-sm">{post.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })} • {post._count.comments} comments • {post._count.reactions} reactions
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" disabled={busyPost === post.id}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {post.isPinned ? (
                              <DropdownMenuItem onClick={() => moderatePost(post.id, "unpin")}>
                                <Undo2 className="mr-2 size-4" />
                                Unpin Post
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => moderatePost(post.id, "pin")}>
                                <Pin className="mr-2 size-4" />
                                Pin Post
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {post.isDeleted ? (
                              <DropdownMenuItem onClick={() => moderatePost(post.id, "restore")}>
                                <Undo2 className="mr-2 size-4" />
                                Restore Post
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-destructive" onClick={() => moderatePost(post.id, "delete")}>
                                <Trash2 className="mr-2 size-4" />
                                Delete Post
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </>
  );
}
