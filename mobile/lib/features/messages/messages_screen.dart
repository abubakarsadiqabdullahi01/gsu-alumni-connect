import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/models/messaging.dart';
import '../../data/providers.dart';
import '../auth/session_controller.dart';
import '../shared/navigation.dart';
import 'chat_screen.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final conversations = ref.watch(conversationsProvider);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Messages', style: theme.textTheme.headlineSmall),
                  const SizedBox(height: 2),
                  Text(
                    'Direct and group conversations',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 14),
                  GsuSearchField(
                    controller: _searchController,
                    hintText: 'Search conversations',
                    onChanged: (value) => setState(() => _query = value.trim()),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(conversationsProvider);
                  await ref.read(conversationsProvider.future);
                  await ref.read(sessionControllerProvider.notifier).refresh();
                },
                child: AsyncView<List<ConversationSummary>>(
                  value: conversations,
                  onRetry: () => ref.invalidate(conversationsProvider),
                  data: (all) {
                    final visible = _query.isEmpty
                        ? all
                        : all
                            .where((c) => c.title
                                .toLowerCase()
                                .contains(_query.toLowerCase()))
                            .toList();

                    if (visible.isEmpty) {
                      return ListView(
                        children: [
                          EmptyState(
                            icon: Icons.forum_outlined,
                            title: all.isEmpty
                                ? 'No conversations yet'
                                : 'No matches',
                            message: all.isEmpty
                                ? 'Open a chat from the directory once you are '
                                    'connected with someone.'
                                : 'No conversation matches "$_query".',
                          ),
                        ],
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                      itemCount: visible.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) =>
                          _ConversationTile(conversation: visible[index]),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ConversationTile extends ConsumerWidget {
  const _ConversationTile({required this.conversation});

  final ConversationSummary conversation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final unread = conversation.unreadCount > 0;

    return GsuCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      onTap: () async {
        await openScreen(
          context,
          ChatScreen(
            conversationId: conversation.id,
            title: conversation.title,
          ),
        );
        ref.invalidate(conversationsProvider);
        ref.read(sessionControllerProvider.notifier).refresh();
      },
      child: Row(
        children: [
          Stack(
            children: [
              conversation.isGroup
                  ? IconBadge(
                      Icons.groups_rounded,
                      size: 48,
                      color: AppColors.accentFor(conversation.title),
                      solid: true,
                    )
                  : GsuAvatar(
                      name: conversation.title,
                      imageUrl: conversation.peerImage,
                      radius: 24,
                    ),
              if (!conversation.isGroup && conversation.isPeerOnline)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 13,
                    height: 13,
                    decoration: BoxDecoration(
                      color: AppColors.teal500,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: theme.colorScheme.surface,
                        width: 2,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        conversation.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontSize: 15,
                          fontWeight:
                              unread ? FontWeight.w800 : FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      Fmt.relative(conversation.lastMessageAt),
                      style: theme.textTheme.labelSmall?.copyWith(
                        letterSpacing: 0,
                        color: unread
                            ? theme.colorScheme.primary
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        conversation.lastMessageBody ?? 'No messages yet',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight:
                              unread ? FontWeight.w700 : FontWeight.w400,
                          color: unread
                              ? theme.colorScheme.onSurface
                              : theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    if (unread) ...[
                      const SizedBox(width: 8),
                      Container(
                        constraints: const BoxConstraints(minWidth: 21),
                        height: 21,
                        alignment: Alignment.center,
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Text(
                          conversation.unreadCount > 99
                              ? '99+'
                              : '${conversation.unreadCount}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
