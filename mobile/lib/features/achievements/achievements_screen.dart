import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
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

class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final achievements = ref.watch(achievementsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Achievements & Badges')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(achievementsProvider);
          await ref.read(achievementsProvider.future);
        },
        child: AsyncView<AchievementsData>(
          value: achievements,
          onRetry: () => ref.invalidate(achievementsProvider),
          data: (data) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Row(
                children: [
                  Expanded(
                    child: StatTile(
                      label: 'Achievements',
                      value: '${data.totalAchievements}',
                      icon: Icons.emoji_events_outlined,
                      tone: AppColors.gold600,
                      caption: '${data.verifiedAchievements} verified',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatTile(
                      label: 'Badges earned',
                      value: '${data.earnedBadges}',
                      icon: Icons.workspace_premium_outlined,
                      tone: AppColors.teal600,
                      caption: 'of ${data.badges.length} available',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const SectionHeader(
                title: 'Badges',
                subtitle: 'Earned automatically as you use the network',
                icon: Icons.shield_outlined,
              ),
              GridView.count(
                crossAxisCount: MediaQuery.sizeOf(context).width >= 600 ? 4 : 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.82,
                children: [
                  for (final badge in data.badges) _BadgeTile(badge: badge),
                ],
              ),
              const SizedBox(height: 26),
              SectionHeader(
                title: 'Your achievements',
                subtitle: 'Submitted for verification by the alumni office',
                icon: Icons.military_tech_outlined,
                actionLabel: 'Add',
                onAction: () =>
                    openSheet(context, const _AddAchievementSheet()),
              ),
              if (data.achievements.isEmpty)
                EmptyState(
                  icon: Icons.emoji_events_outlined,
                  title: 'No achievements yet',
                  message:
                      'Add awards, certifications and professional milestones. '
                      'The alumni office verifies each entry.',
                  actionLabel: 'Add achievement',
                  onAction: () =>
                      openSheet(context, const _AddAchievementSheet()),
                )
              else
                for (final achievement in data.achievements)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _AchievementCard(achievement: achievement),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({required this.badge});

  final ProfileBadge badge;

  /// The API sends Lucide icon names; map them onto the Material set.
  static IconData _icon(String name) => switch (name) {
        'shield-check' => Icons.verified_user_rounded,
        'rocket' => Icons.rocket_launch_rounded,
        'award' => Icons.emoji_events_rounded,
        'graduation-cap' => Icons.school_rounded,
        'briefcase' => Icons.work_rounded,
        'users' => Icons.groups_rounded,
        'badge-check' => Icons.verified_rounded,
        _ => Icons.military_tech_rounded,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final locked = badge.locked;

    final tile = GsuCard(
      padding: const EdgeInsets.all(11),
      onTap: () => showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: Icon(
            _icon(badge.icon),
            size: 34,
            color: locked ? AppColors.ink500 : AppColors.gold600,
          ),
          title: Text(badge.label, textAlign: TextAlign.center),
          content: Text(
            locked
                ? '${badge.description}\n\nNot earned yet.'
                : '${badge.description}\n\nAwarded ${Fmt.date(badge.awardedAt)}.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(height: 1.5),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              gradient: locked ? null : AppColors.goldGradient,
              color: locked ? theme.colorScheme.surfaceContainerHighest : null,
              shape: BoxShape.circle,
            ),
            child: Icon(
              locked ? Icons.lock_outline_rounded : _icon(badge.icon),
              size: 23,
              color: locked ? theme.colorScheme.onSurfaceVariant : Colors.white,
            ),
          ),
          const SizedBox(height: 9),
          Text(
            badge.label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelSmall?.copyWith(
              letterSpacing: 0,
              fontSize: 11,
              color: locked
                  ? theme.colorScheme.onSurfaceVariant
                  : theme.colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );

    if (locked) return Opacity(opacity: 0.62, child: tile);
    return tile.animate().fadeIn(duration: 300.ms).scale(
          begin: const Offset(0.94, 0.94),
          curve: Curves.easeOut,
        );
  }
}

class _AchievementCard extends ConsumerWidget {
  const _AchievementCard({required this.achievement});

  final Achievement achievement;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return GsuCard(
      accent: achievement.verified ? AppColors.teal500 : AppColors.amber600,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBadge(
            achievement.verified
                ? Icons.verified_rounded
                : Icons.hourglass_empty_rounded,
            color:
                achievement.verified ? AppColors.teal600 : AppColors.amber600,
            size: 40,
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
                        achievement.title,
                        style:
                            theme.textTheme.titleMedium?.copyWith(fontSize: 15),
                      ),
                    ),
                    if (achievement.year != null)
                      StatusPill('${achievement.year}'),
                  ],
                ),
                if (achievement.description != null &&
                    achievement.description!.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(
                    achievement.description!,
                    style: theme.textTheme.bodySmall?.copyWith(height: 1.5),
                  ),
                ],
                const SizedBox(height: 9),
                Row(
                  children: [
                    StatusPill(
                      achievement.verified
                          ? 'Verified'
                          : 'Awaiting verification',
                      tone: achievement.verified
                          ? AppColors.teal600
                          : AppColors.amber600,
                    ),
                    const Spacer(),
                    IconButton(
                      tooltip: 'Delete',
                      visualDensity: VisualDensity.compact,
                      onPressed: () async {
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Delete achievement?'),
                            content: Text(
                              'This removes "${achievement.title}" from your '
                              'profile permanently.',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () =>
                                    Navigator.of(context).pop(false),
                                child: const Text('Cancel'),
                              ),
                              FilledButton(
                                onPressed: () =>
                                    Navigator.of(context).pop(true),
                                child: const Text('Delete'),
                              ),
                            ],
                          ),
                        );
                        if (confirmed != true) return;

                        try {
                          final repository =
                              await ref.read(repositoryProvider.future);
                          await repository.deleteAchievement(achievement.id);
                          ref.invalidate(achievementsProvider);
                          if (context.mounted) {
                            showAppSnack(context, 'Achievement deleted.');
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
                      icon: Icon(
                        Icons.delete_outline_rounded,
                        size: 19,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
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

class _AddAchievementSheet extends ConsumerStatefulWidget {
  const _AddAchievementSheet();

  @override
  ConsumerState<_AddAchievementSheet> createState() =>
      _AddAchievementSheetState();
}

class _AddAchievementSheetState extends ConsumerState<_AddAchievementSheet> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _year = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _year.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.createAchievement(
        title: _title.text.trim(),
        description:
            _description.text.trim().isEmpty ? null : _description.text.trim(),
        year: int.tryParse(_year.text.trim()),
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      showAppSnack(context, 'Achievement submitted for verification.');
      ref.invalidate(achievementsProvider);
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
            Text('Add an achievement', style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Awards, certifications and professional milestones.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Title *'),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Title is required' : null,
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _year,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Year',
                hintText: '2025',
              ),
              validator: (value) {
                final text = (value ?? '').trim();
                if (text.isEmpty) return null;
                final year = int.tryParse(text);
                if (year == null || year < 1980 || year > 2100) {
                  return 'Enter a year between 1980 and 2100';
                }
                return null;
              },
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _description,
              minLines: 3,
              maxLines: 6,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Description',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 22),
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
                  : const Text('Submit achievement'),
            ),
          ],
        ),
      ),
    );
  }
}
