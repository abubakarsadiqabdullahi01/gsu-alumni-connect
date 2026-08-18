import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/alumni_repository.dart';
import '../../data/models/community.dart';
import '../../data/providers.dart';
import '../auth/session_controller.dart';
import '../messages/chat_screen.dart';
import '../shared/navigation.dart';

class GroupDetailScreen extends ConsumerStatefulWidget {
  const GroupDetailScreen({
    super.key,
    required this.groupId,
    required this.groupName,
  });

  final String groupId;
  final String groupName;

  @override
  ConsumerState<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends ConsumerState<GroupDetailScreen> {
  final _composerController = TextEditingController();
  bool _posting = false;

  @override
  void dispose() {
    _composerController.dispose();
    super.dispose();
  }

  Future<void> _post() async {
    final content = _composerController.text.trim();
    if (content.isEmpty) return;

    setState(() => _posting = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.createGroupPost(widget.groupId, content);
      _composerController.clear();
      ref.invalidate(groupFeedProvider(widget.groupId));
      if (mounted) {
        FocusScope.of(context).unfocus();
        showAppSnack(context, 'Posted to ${widget.groupName}.');
      }
    } catch (error) {
      if (!mounted) return;
      showAppSnack(context, ApiException.from(error).message, isError: true);
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _openGroupChat() async {
    try {
      final repository = await ref.read(repositoryProvider.future);
      final conversationId = await repository.groupConversation(widget.groupId);
      if (!mounted || conversationId.isEmpty) return;
      openScreen(
        context,
        ChatScreen(
          conversationId: conversationId,
          title: widget.groupName,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      showAppSnack(context, ApiException.from(error).message, isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final feed = ref.watch(groupFeedProvider(widget.groupId));
    final messagingEnabled = ref.watch(featuresProvider).messaging;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.groupName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          if (messagingEnabled)
            IconButton(
              onPressed: _openGroupChat,
              icon: const Icon(Icons.chat_bubble_outline_rounded),
              tooltip: 'Group chat',
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(groupFeedProvider(widget.groupId));
                await ref.read(groupFeedProvider(widget.groupId).future);
              },
              child: AsyncView<GroupFeed>(
                value: feed,
                onRetry: () =>
                    ref.invalidate(groupFeedProvider(widget.groupId)),
                data: (data) {
                  if (data.posts.isEmpty) {
                    return ListView(
                      children: const [
                        EmptyState(
                          icon: Icons.edit_note_rounded,
                          title: 'No posts yet',
                          message:
                              'Be the first to share an update with this group.',
                        ),
                      ],
                    );
                  }

                  final pinned = data.posts.where((p) => p.isPinned).toList();
                  final regular = data.posts.where((p) => !p.isPinned).toList();

                  return ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                    children: [
                      if (pinned.isNotEmpty) ...[
                        const SectionHeader(
                          title: 'Pinned',
                          icon: Icons.push_pin_outlined,
                        ),
                        for (final post in pinned)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _PostCard(post: post, pinned: true),
                          ),
                        const SizedBox(height: 8),
                      ],
                      for (final post in regular)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _PostCard(post: post),
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
          _Composer(
            controller: _composerController,
            busy: _posting,
            onSend: _post,
          ),
        ],
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post, this.pinned = false});

  final GroupPost post;
  final bool pinned;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GsuCard(
      accent: pinned ? AppColors.gold500 : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GsuAvatar(
                name: post.authorName,
                imageUrl: post.authorImage,
                radius: 19,
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.authorName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      Fmt.relative(post.createdAt),
                      style: theme.textTheme.labelSmall
                          ?.copyWith(letterSpacing: 0),
                    ),
                  ],
                ),
              ),
              if (pinned)
                const StatusPill(
                  'Pinned',
                  tone: AppColors.gold600,
                  icon: Icons.push_pin_rounded,
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            post.content,
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.55),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(
                Icons.favorite_border_rounded,
                size: 15,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 5),
              Text('${post.reactionsCount}', style: theme.textTheme.labelSmall),
              const SizedBox(width: 16),
              Icon(
                Icons.mode_comment_outlined,
                size: 15,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 5),
              Text('${post.commentsCount}', style: theme.textTheme.labelSmall),
            ],
          ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.busy,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool busy;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: theme.colorScheme.outline),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 5,
                  maxLength: 2000,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    hintText: 'Share an update with the group',
                    counterText: '',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 9),
              SizedBox(
                width: 48,
                height: 48,
                child: FilledButton(
                  onPressed: busy ? null : onSend,
                  style: FilledButton.styleFrom(
                    padding: EdgeInsets.zero,
                    shape: const CircleBorder(),
                  ),
                  child: busy
                      ? const SizedBox(
                          height: 17,
                          width: 17,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded, size: 19),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
