import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/branding/gsu_crest.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ui_kit.dart';
import '../achievements/achievements_screen.dart';
import '../auth/session_controller.dart';
import '../connections/connections_screen.dart';
import '../events/events_screen.dart';
import '../feed/feed_screen.dart';
import '../id_card/id_card_screen.dart';
import '../jobs/jobs_screen.dart';
import '../map/alumni_map_screen.dart';
import '../mentorship/mentorship_screen.dart';
import '../notifications/notifications_screen.dart';
import '../profile/profile_screen.dart';
import '../settings/settings_screen.dart';
import '../shared/navigation.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final identity = ref.watch(identityProvider);
    final features = ref.watch(featuresProvider);
    final badges = ref.watch(badgeCountsProvider);

    final entries = <_MoreEntry>[
      _MoreEntry(
        'My profile',
        'Bio, contact details and experience',
        Icons.person_outline_rounded,
        AppColors.navy600,
        () => openScreen(context, const ProfileScreen()),
      ),
      _MoreEntry(
        'Digital ID card',
        'Signed, verifiable alumni identity',
        Icons.badge_outlined,
        AppColors.gold600,
        () => openScreen(context, const IdCardScreen()),
      ),
      _MoreEntry(
        'My network',
        'Requests, connections and suggestions',
        Icons.hub_outlined,
        AppColors.teal600,
        () => openScreen(context, const ConnectionsScreen()),
        badge: badges.connectionRequests,
      ),
      _MoreEntry(
        'Notifications',
        'Everything that needs your attention',
        Icons.notifications_none_rounded,
        const Color(0xFF6D4AA8),
        () => openScreen(context, const NotificationsScreen()),
        badge: badges.notifications,
      ),
      if (features.jobBoard)
        _MoreEntry(
          'Job board',
          'Openings shared by fellow alumni',
          Icons.work_outline_rounded,
          AppColors.teal500,
          () => openScreen(context, const JobsScreen()),
        ),
      _MoreEntry(
        'Events',
        'Reunions, meetups and webinars',
        Icons.event_outlined,
        const Color(0xFFB4530E),
        () => openScreen(context, const EventsScreen()),
      ),
      if (features.mentorship)
        _MoreEntry(
          'Mentorship',
          'Find a mentor or guide a mentee',
          Icons.school_outlined,
          AppColors.gold500,
          () => openScreen(context, const MentorshipScreen()),
        ),
      _MoreEntry(
        'Achievements',
        'Awards, milestones and badges',
        Icons.military_tech_outlined,
        AppColors.gold600,
        () => openScreen(context, const AchievementsScreen()),
      ),
      if (features.map)
        _MoreEntry(
          'Alumni map',
          'Where graduates are across Nigeria',
          Icons.public_rounded,
          AppColors.teal600,
          () => openScreen(context, const AlumniMapScreen()),
        ),
      _MoreEntry(
        'Activity feed',
        'Your recent milestones',
        Icons.timeline_rounded,
        AppColors.navy500,
        () => openScreen(context, const FeedScreen()),
      ),
      _MoreEntry(
        'Settings',
        'Privacy, visibility and account',
        Icons.settings_outlined,
        AppColors.ink500,
        () => openScreen(context, const SettingsScreen()),
      ),
    ];

    return Scaffold(
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          GradientHeaderLite(
            child: Row(
              children: [
                GsuAvatar(
                  name: identity?.fullName ?? 'Alumnus',
                  imageUrl: identity?.avatarUrl,
                  radius: 27,
                  showRing: true,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        identity?.fullName ?? 'Alumnus',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleLarge
                            ?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        [
                          identity?.registrationNo,
                          identity?.departmentName,
                        ].whereType<String>().join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.72),
                        ),
                      ),
                    ],
                  ),
                ),
                const GsuCrest(size: 34, showRibbon: false),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
            child: Column(
              children: [
                for (final entry in entries)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: GsuCard(
                      padding: const EdgeInsets.all(13),
                      onTap: entry.onTap,
                      child: Row(
                        children: [
                          IconBadge(entry.icon, color: entry.tone, size: 44),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  entry.title,
                                  style: theme.textTheme.titleMedium
                                      ?.copyWith(fontSize: 14.5),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  entry.subtitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          if (entry.badge > 0) ...[
                            StatusPill(
                              '${entry.badge}',
                              tone: entry.tone,
                              filled: true,
                            ),
                            const SizedBox(width: 8),
                          ],
                          Icon(
                            Icons.chevron_right_rounded,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Shorter hero for secondary tabs.
class GradientHeaderLite extends StatelessWidget {
  const GradientHeaderLite({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: isDark ? AppColors.nightGradient : AppColors.brandGradient,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(26)),
      ),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: child,
        ),
      ),
    );
  }
}

class _MoreEntry {
  const _MoreEntry(
    this.title,
    this.subtitle,
    this.icon,
    this.tone,
    this.onTap, {
    this.badge = 0,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color tone;
  final VoidCallback onTap;
  final int badge;
}
