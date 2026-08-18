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

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final filter = ref.watch(notificationFilterProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton.icon(
            onPressed: (notifications.valueOrNull?.unread ?? 0) == 0
                ? null
                : () async {
                    try {
                      final repository =
                          await ref.read(repositoryProvider.future);
                      await repository.markAllNotificationsRead();
                      ref.invalidate(notificationsProvider);
                      ref.read(sessionControllerProvider.notifier).refresh();
                      if (context.mounted) {
                        showAppSnack(context, 'All notifications marked read.');
                      }
                    } catch (error) {
                      if (context.mounted) {
                        showAppSnack(
                          context,
                          ApiException.from(error).message,
                          isError: true,
                        );
                      }
                    }
                  },
            icon: const Icon(Icons.done_all_rounded, size: 18),
            label: const Text('Mark all'),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 4),
          FilterChipsRow(
            options: const {
              'all': 'All',
              'unread': 'Unread',
              'read': 'Read',
            },
            selected: filter,
            onSelected: (value) =>
                ref.read(notificationFilterProvider.notifier).state = value,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(notificationsProvider);
                await ref.read(notificationsProvider.future);
                await ref.read(sessionControllerProvider.notifier).refresh();
              },
              child: AsyncView<NotificationsData>(
                value: notifications,
                onRetry: () => ref.invalidate(notificationsProvider),
                data: (data) {
                  if (data.notifications.isEmpty) {
                    return ListView(
                      children: [
                        EmptyState(
                          icon: Icons.notifications_none_rounded,
                          title: filter == 'unread'
                              ? 'You are all caught up'
                              : 'No notifications',
                          message: filter == 'unread'
                              ? 'No unread notifications right now.'
                              : 'Connection requests, mentorship updates and '
                                  'group activity will appear here.',
                        ),
                      ],
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                    itemCount: data.notifications.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) =>
                        _NotificationTile(item: data.notifications[index]),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({required this.item});

  final AppNotification item;

  static (IconData, Color) _visualFor(String type) {
    return switch (type.toUpperCase()) {
      'CONNECTION_REQUEST' || 'CONNECTION_ACCEPTED' => (
          Icons.person_add_alt_rounded,
          AppColors.navy600
        ),
      'MENTORSHIP_REQUEST' || 'MENTORSHIP_ACCEPTED' => (
          Icons.school_rounded,
          AppColors.gold600
        ),
      'JOB_POSTED' || 'JOB_APPLICATION' => (
          Icons.work_rounded,
          AppColors.teal600
        ),
      'EVENT_INVITE' || 'EVENT_REMINDER' => (
          Icons.event_rounded,
          Color(0xFF6D4AA8)
        ),
      'GROUP_POST' || 'GROUP_INVITE' => (
          Icons.forum_rounded,
          AppColors.navy500
        ),
      'MESSAGE' => (Icons.chat_bubble_rounded, AppColors.teal500),
      'ACHIEVEMENT_VERIFIED' => (
          Icons.military_tech_rounded,
          AppColors.gold500
        ),
      _ => (Icons.notifications_rounded, AppColors.ink500),
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final (icon, tone) = _visualFor(item.type);

    return GsuCard(
      padding: const EdgeInsets.all(14),
      accent: item.isRead ? null : tone,
      onTap: item.isRead
          ? null
          : () async {
              try {
                final repository = await ref.read(repositoryProvider.future);
                await repository.markNotificationRead(item.id);
                ref.invalidate(notificationsProvider);
                ref.read(sessionControllerProvider.notifier).refresh();
              } catch (error) {
                if (context.mounted) {
                  showAppSnack(
                    context,
                    ApiException.from(error).message,
                    isError: true,
                  );
                }
              }
            },
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBadge(icon, color: tone, size: 40, solid: !item.isRead),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight:
                              item.isRead ? FontWeight.w600 : FontWeight.w800,
                        ),
                      ),
                    ),
                    if (!item.isRead)
                      Container(
                        width: 8,
                        height: 8,
                        margin: const EdgeInsets.only(left: 8),
                        decoration: BoxDecoration(
                          color: tone,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.body,
                  style: theme.textTheme.bodySmall?.copyWith(height: 1.45),
                ),
                const SizedBox(height: 6),
                Text(
                  Fmt.relative(item.createdAt),
                  style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
