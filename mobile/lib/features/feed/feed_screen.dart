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
import '../shared/navigation.dart';

class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(feedProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Activity Feed')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(feedProvider);
          await ref.read(feedProvider.future);
        },
        child: AsyncView<List<FeedItem>>(
          value: feed,
          onRetry: () => ref.invalidate(feedProvider),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                children: [
                  EmptyState(
                    icon: Icons.timeline_rounded,
                    title: 'No activity yet',
                    message:
                        'Post a milestone — a new role, a group you joined, or '
                        'a graduation anniversary.',
                    actionLabel: 'Post an update',
                    onAction: () =>
                        openSheet(context, const _PostUpdateSheet()),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) => _FeedCard(item: items[index]),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => openSheet(context, const _PostUpdateSheet()),
        icon: const Icon(Icons.edit_outlined),
        label: const Text('Post update'),
      ),
    );
  }
}

class _FeedCard extends StatelessWidget {
  const _FeedCard({required this.item});

  final FeedItem item;

  static (IconData, Color) _visual(String actionType) => switch (actionType) {
        'POSTED_JOB' || 'UPDATED_JOB' => (
            Icons.work_rounded,
            AppColors.teal600,
          ),
        'JOINED_GROUP' => (Icons.group_add_rounded, AppColors.navy600),
        'POSTED_IN_GROUP' => (Icons.forum_rounded, Color(0xFF6D4AA8)),
        'GRADUATION_ANNIVERSARY' => (
            Icons.celebration_rounded,
            AppColors.gold600,
          ),
        _ => (Icons.bolt_rounded, AppColors.ink500),
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, tone) = _visual(item.actionType);

    return GsuCard(
      accent: tone,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GsuAvatar(
                name: item.authorName,
                imageUrl: item.authorImage,
                radius: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.authorName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      [
                        item.authorDepartment,
                        Fmt.relative(item.createdAt),
                      ]
                          .whereType<String>()
                          .where((v) => v.isNotEmpty)
                          .join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelSmall
                          ?.copyWith(letterSpacing: 0),
                    ),
                  ],
                ),
              ),
              IconBadge(icon, color: tone, size: 34),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            item.headline,
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.55),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              StatusPill(Fmt.enumLabel(item.actionType), tone: tone),
              const SizedBox(width: 6),
              if (!item.isPublic)
                const StatusPill(
                  'Private',
                  icon: Icons.lock_outline_rounded,
                  tone: AppColors.ink500,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PostUpdateSheet extends ConsumerStatefulWidget {
  const _PostUpdateSheet();

  @override
  ConsumerState<_PostUpdateSheet> createState() => _PostUpdateSheetState();
}

class _PostUpdateSheetState extends ConsumerState<_PostUpdateSheet> {
  final _formKey = GlobalKey<FormState>();
  final _headline = TextEditingController();
  String _actionType = 'UPDATED_JOB';
  bool _isPublic = true;
  bool _busy = false;

  @override
  void dispose() {
    _headline.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.postActivity(
        headline: _headline.text.trim(),
        actionType: _actionType,
        isPublic: _isPublic,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      showAppSnack(context, 'Update posted.');
      ref.invalidate(feedProvider);
      ref.invalidate(dashboardProvider);
    } catch (error) {
      if (!mounted) return;
      showAppSnack(context, ApiException.from(error).message, isError: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Post an update', style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Share a milestone with the alumni network.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              initialValue: _actionType,
              decoration: const InputDecoration(labelText: 'Update type'),
              items: const [
                DropdownMenuItem(
                  value: 'UPDATED_JOB',
                  child: Text('New or updated role'),
                ),
                DropdownMenuItem(
                  value: 'POSTED_JOB',
                  child: Text('Shared a job opening'),
                ),
                DropdownMenuItem(
                  value: 'JOINED_GROUP',
                  child: Text('Joined a group'),
                ),
                DropdownMenuItem(
                  value: 'POSTED_IN_GROUP',
                  child: Text('Posted in a group'),
                ),
                DropdownMenuItem(
                  value: 'GRADUATION_ANNIVERSARY',
                  child: Text('Graduation anniversary'),
                ),
              ],
              onChanged: (value) =>
                  setState(() => _actionType = value ?? 'UPDATED_JOB'),
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _headline,
              minLines: 2,
              maxLines: 4,
              maxLength: 240,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Headline *',
                hintText: 'Joined Deloitte Nigeria as an audit associate',
                alignLabelWithHint: true,
              ),
              validator: (value) {
                final text = (value ?? '').trim();
                if (text.length < 8) {
                  return 'Write at least 8 characters';
                }
                return null;
              },
            ),
            SwitchListTile.adaptive(
              value: _isPublic,
              onChanged: (value) => setState(() => _isPublic = value),
              title: const Text('Visible to other alumni'),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 19,
                      width: 19,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Post update'),
            ),
          ],
        ),
      ),
    );
  }
}
