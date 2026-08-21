import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/branding/gsu_crest.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/models/dashboard.dart';
import '../../data/providers.dart';
import '../achievements/achievements_screen.dart';
import '../auth/session_controller.dart';
import '../../data/alumni_repository.dart';
import '../connections/connections_screen.dart';
import '../directory/directory_screen.dart';
import '../events/events_screen.dart';
import '../id_card/id_card_screen.dart';
import '../jobs/jobs_screen.dart';
import '../map/alumni_map_screen.dart';
import '../mentorship/mentorship_screen.dart';
import '../notifications/notifications_screen.dart';
import '../shared/navigation.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final identity = ref.watch(identityProvider);
    final badges = ref.watch(badgeCountsProvider);
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(dashboardProvider);
          await ref.read(sessionControllerProvider.notifier).refresh();
          await ref.read(dashboardProvider.future);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: GradientHeader(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 26),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const GsuWordmark(crestSize: 32, onDark: true),
                        const Spacer(),
                        _HeaderAction(
                          icon: Icons.badge_outlined,
                          tooltip: 'Digital ID card',
                          onTap: () =>
                              openScreen(context, const IdCardScreen()),
                        ),
                        const SizedBox(width: 8),
                        _HeaderAction(
                          icon: Icons.notifications_none_rounded,
                          tooltip: 'Notifications',
                          badge: badges.notifications,
                          onTap: () =>
                              openScreen(context, const NotificationsScreen()),
                        ),
                      ],
                    ),
                    const SizedBox(height: 26),
                    Row(
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
                                _greeting(),
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(
                                      color:
                                          Colors.white.withValues(alpha: 0.68),
                                    ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                identity?.fullName ?? 'Alumnus',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(color: Colors.white),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      identity?.registrationNo ?? '',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: AppColors.gold400,
                                            letterSpacing: 0.5,
                                          ),
                                    ),
                                  ),
                                  if (identity?.graduationYear != null) ...[
                                    Text(
                                      '  ·  Class of ${identity!.graduationYear}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: Colors.white
                                                .withValues(alpha: 0.6),
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
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: AsyncView<DashboardData>(
                value: dashboard,
                onRetry: () => ref.invalidate(dashboardProvider),
                loading: const _DashboardSkeleton(),
                data: (data) => _DashboardBody(data: data),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }
}

class _DashboardBody extends ConsumerWidget {
  const _DashboardBody({required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = data.stats;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _StatsLayout(
            children: [
              StatTile(
                compact: true,
                label: 'Connections',
                value: Fmt.number(stats.connections),
                icon: Icons.hub_rounded,
                tone: AppColors.navy600,
                caption: stats.pendingConnectionRequests > 0
                    ? '${stats.pendingConnectionRequests} pending'
                    : null,
                onTap: () => openScreen(context, const ConnectionsScreen()),
              ),
              StatTile(
                compact: true,
                label: 'Profile views',
                value: Fmt.compact(stats.profileViews),
                icon: Icons.visibility_outlined,
                tone: AppColors.teal600,
              ),
              StatTile(
                compact: true,
                label: 'Jobs applied',
                value: Fmt.number(stats.jobApplications),
                icon: Icons.work_outline_rounded,
                tone: AppColors.gold600,
                onTap: () => openScreen(context, const JobsScreen()),
              ),
              StatTile(
                compact: true,
                label: 'Groups joined',
                value: Fmt.number(stats.groupsJoined),
                icon: Icons.diversity_3_rounded,
                tone: const Color(0xFF6D4AA8),
              ),
            ],
          ).animate().fadeIn(duration: 320.ms).moveY(begin: 12, end: 0),
          const SizedBox(height: 22),
          if (data.completion.percent < 100) ...[
            _CompletionCard(completion: data.completion),
            const SizedBox(height: 22),
          ],
          const SectionHeader(
            title: 'Your network growth',
            subtitle: 'Accepted connections over the last six months',
            icon: Icons.trending_up_rounded,
          ),
          _NetworkGrowthChart(points: data.networkGrowth),
          const SizedBox(height: 22),
          SectionHeader(
            title: 'Alumni community',
            subtitle: '${Fmt.number(stats.networkSize)} verified alumni '
                'across the directory',
            icon: Icons.insights_rounded,
          ),
          _FacultyChart(items: data.facultyDistribution),
          const SizedBox(height: 22),
          const SectionHeader(
            title: 'Quick actions',
            icon: Icons.bolt_rounded,
          ),
          const _QuickActions(),
          if (data.connectionSuggestions.isNotEmpty) ...[
            const SizedBox(height: 22),
            SectionHeader(
              title: 'People you may know',
              subtitle: 'From your faculty and graduating set',
              actionLabel: 'Directory',
              icon: Icons.person_add_alt_1_outlined,
              onAction: () => openScreen(context, const DirectoryScreen()),
            ),
            GsuCard(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Column(
                children: [
                  for (var i = 0;
                      i < data.connectionSuggestions.length;
                      i++) ...[
                    if (i > 0) const Divider(height: 1),
                    _SuggestionRow(person: data.connectionSuggestions[i]),
                  ],
                ],
              ),
            ),
          ],
          if (data.upcomingEvents.isNotEmpty) ...[
            const SizedBox(height: 22),
            SectionHeader(
              title: 'Upcoming events',
              actionLabel: 'See all',
              icon: Icons.event_outlined,
              onAction: () => openScreen(context, const EventsScreen()),
            ),
            for (final event in data.upcomingEvents)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _EventTeaserCard(event: event),
              ),
          ],
          if (data.recentActivity.isNotEmpty) ...[
            const SizedBox(height: 12),
            const SectionHeader(
              title: 'Recent activity',
              icon: Icons.history_rounded,
            ),
            GsuCard(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Column(
                children: [
                  for (var i = 0; i < data.recentActivity.length; i++) ...[
                    if (i > 0) const Divider(height: 1),
                    _ActivityRow(item: data.recentActivity[i]),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HeaderAction extends StatelessWidget {
  const _HeaderAction({
    required this.icon,
    required this.onTap,
    required this.tooltip,
    this.badge = 0,
  });

  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(13),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(13),
          child: Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(13),
              border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
            ),
            child: badge > 0
                ? Badge(
                    label: Text(badge > 99 ? '99+' : '$badge'),
                    child: Icon(icon, color: Colors.white, size: 21),
                  )
                : Icon(icon, color: Colors.white, size: 21),
          ),
        ),
      ),
    );
  }
}

class _StatsLayout extends StatelessWidget {
  const _StatsLayout({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(child: children[i]),
          ],
        ],
      ),
    );
  }
}

class _CompletionCard extends StatelessWidget {
  const _CompletionCard({required this.completion});

  final ProfileCompletion completion;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final outstanding = completion.outstanding.take(3).toList();

    return GsuCard(
      accent: AppColors.gold500,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 62,
                height: 62,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: completion.percent / 100),
                      duration: const Duration(milliseconds: 900),
                      curve: Curves.easeOutCubic,
                      builder: (context, value, _) => SizedBox(
                        width: 62,
                        height: 62,
                        child: CircularProgressIndicator(
                          value: value,
                          strokeWidth: 6,
                          strokeCap: StrokeCap.round,
                          backgroundColor:
                              theme.colorScheme.surfaceContainerHighest,
                          valueColor:
                              const AlwaysStoppedAnimation(AppColors.gold500),
                        ),
                      ),
                    ),
                    Text(
                      '${completion.percent}%',
                      style: theme.textTheme.labelLarge?.copyWith(fontSize: 13),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Complete your profile',
                        style: theme.textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text(
                      'A complete profile appears higher in the directory and '
                      'unlocks the Profile Complete badge.',
                      style: theme.textTheme.bodySmall?.copyWith(height: 1.45),
                    ),
                  ],
                ),
              ),
            ],
          ),
          // The server picks the highest-weight outstanding section, so the
          // nudge is the same one the web app shows.
          if (completion.nextBestAction?.prompt != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.amber600.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.lightbulb_outline_rounded,
                    size: 16,
                    color: AppColors.amber600,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      completion.nextBestAction!.prompt!,
                      style: theme.textTheme.bodySmall?.copyWith(height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (outstanding.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in outstanding)
                  StatusPill(
                    item.label,
                    icon: Icons.add_rounded,
                    tone: AppColors.amber600,
                  ),
                if (completion.outstanding.length > 3)
                  StatusPill(
                    '+${completion.outstanding.length - 3} more',
                    tone: AppColors.ink500,
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _NetworkGrowthChart extends StatelessWidget {
  const _NetworkGrowthChart({required this.points});

  final List<GrowthPoint> points;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (points.isEmpty) {
      return GsuCard(
        child: SizedBox(
          height: 120,
          child: Center(
            child: Text(
              'Growth data appears once you start connecting.',
              style: theme.textTheme.bodySmall,
            ),
          ),
        ),
      );
    }

    final maxY = points
        .map((p) => p.total)
        .fold<int>(0, (a, b) => a > b ? a : b)
        .toDouble();
    final added = points.fold<int>(0, (sum, p) => sum + p.added);

    return GsuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                Fmt.number(points.last.total),
                style: theme.textTheme.displaySmall,
              ),
              const SizedBox(width: 10),
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: StatusPill(
                  added > 0 ? '+$added in 6 months' : 'No change',
                  tone: added > 0 ? AppColors.teal600 : AppColors.ink500,
                  icon: added > 0 ? Icons.arrow_upward_rounded : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('Total connections', style: theme.textTheme.bodySmall),
          const SizedBox(height: 20),
          SizedBox(
            height: 158,
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: maxY <= 0 ? 4 : maxY * 1.25,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxY <= 0 ? 1 : (maxY * 1.25) / 3,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: theme.colorScheme.outline.withValues(alpha: 0.5),
                    strokeWidth: 1,
                    dashArray: const [5, 6],
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(),
                  rightTitles: const AxisTitles(),
                  leftTitles: const AxisTitles(),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 26,
                      interval: 1,
                      getTitlesWidget: (value, meta) {
                        final index = value.round();
                        if (index < 0 || index >= points.length) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            points[index].label,
                            style: theme.textTheme.labelSmall
                                ?.copyWith(letterSpacing: 0, fontSize: 10.5),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (_) => AppColors.navy800,
                    getTooltipItems: (spots) => spots.map((spot) {
                      final point = points[spot.x.round()];
                      return LineTooltipItem(
                        '${point.label}\n${point.total} total',
                        const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      );
                    }).toList(),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    isCurved: true,
                    curveSmoothness: 0.3,
                    barWidth: 3,
                    color: AppColors.teal500,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
                        radius: 3.6,
                        color: Colors.white,
                        strokeWidth: 2.4,
                        strokeColor: AppColors.teal500,
                      ),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors.teal500.withValues(alpha: 0.28),
                          AppColors.teal500.withValues(alpha: 0.01),
                        ],
                      ),
                    ),
                    spots: [
                      for (var i = 0; i < points.length; i++)
                        FlSpot(i.toDouble(), points[i].total.toDouble()),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FacultyChart extends StatelessWidget {
  const _FacultyChart({required this.items});

  final List<CategoryCount> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (items.isEmpty) {
      return GsuCard(
        child: SizedBox(
          height: 76,
          child: Center(
            child: Text(
              'Faculty distribution is not available yet.',
              style: theme.textTheme.bodySmall,
            ),
          ),
        ),
      );
    }

    final maxCount =
        items.map((e) => e.count).fold<int>(1, (a, b) => a > b ? a : b);

    return GsuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('By faculty', style: theme.textTheme.titleMedium),
          const SizedBox(height: 16),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 13),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                      ),
                      Text(
                        Fmt.number(item.count),
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.accentFor(item.label),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: item.count / maxCount),
                    duration: const Duration(milliseconds: 800),
                    curve: Curves.easeOutCubic,
                    builder: (context, value, _) => ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: value,
                        minHeight: 7,
                        backgroundColor:
                            theme.colorScheme.surfaceContainerHighest,
                        valueColor: AlwaysStoppedAnimation(
                          AppColors.accentFor(item.label),
                        ),
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

class _QuickActions extends ConsumerWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final features = ref.watch(featuresProvider);

    final actions = <_QuickAction>[
      _QuickAction(
        'Digital ID',
        Icons.badge_outlined,
        AppColors.gold600,
        () => openScreen(context, const IdCardScreen()),
      ),
      _QuickAction(
        'Connections',
        Icons.hub_outlined,
        AppColors.navy600,
        () => openScreen(context, const ConnectionsScreen()),
      ),
      if (features.jobBoard)
        _QuickAction(
          'Job board',
          Icons.work_outline_rounded,
          AppColors.teal600,
          () => openScreen(context, const JobsScreen()),
        ),
      _QuickAction(
        'Events',
        Icons.event_outlined,
        const Color(0xFF6D4AA8),
        () => openScreen(context, const EventsScreen()),
      ),
      if (features.mentorship)
        _QuickAction(
          'Mentorship',
          Icons.school_outlined,
          const Color(0xFFB4530E),
          () => openScreen(context, const MentorshipScreen()),
        ),
      if (features.map)
        _QuickAction(
          'Alumni map',
          Icons.public_rounded,
          AppColors.teal500,
          () => openScreen(context, const AlumniMapScreen()),
        ),
      _QuickAction(
        'Achievements',
        Icons.military_tech_outlined,
        AppColors.gold500,
        () => openScreen(context, const AchievementsScreen()),
      ),
    ];

    // Wrap of content-sized pills, not a fixed-column grid. There are seven
    // actions and seven is prime, so every column count left an empty cell in
    // the last row; and a square cell around one small icon is mostly dead
    // space. Pills size to their label, flow to fill each row, and leave a
    // short ragged edge that reads as deliberate rather than as a hole.
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final action in actions)
          GsuCard(
            onTap: action.onTap,
            padding: const EdgeInsets.fromLTRB(8, 8, 14, 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconBadge(
                  action.icon,
                  color: action.color,
                  size: 30,
                  iconSize: 15,
                ),
                const SizedBox(width: 10),
                Text(
                  action.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontSize: 12,
                        height: 1.1,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _QuickAction {
  const _QuickAction(this.label, this.icon, this.color, this.onTap);

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
}

class _EventTeaserCard extends StatelessWidget {
  const _EventTeaserCard({required this.event});

  final EventTeaser event;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final date = event.startsAt;

    return GsuCard(
      onTap: () => openScreen(context, const EventsScreen()),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 58,
            decoration: BoxDecoration(
              gradient: AppColors.brandGradient,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  date == null ? '--' : '${date.day}',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    height: 1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  date == null
                      ? ''
                      : Fmt.date(date).split(' ')[1].toUpperCase(),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.gold400,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  '${Fmt.time(date)} · ${event.location}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: 7),
                Row(
                  children: [
                    StatusPill(Fmt.enumLabel(event.type)),
                    const SizedBox(width: 6),
                    StatusPill(
                      '${event.attendeesCount} going',
                      tone: AppColors.teal600,
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

/// One suggested connection, with the request sent inline.
///
/// Mirrors PersonCard's request handling rather than reusing it: PersonCard
/// needs a full [Person], and the dashboard deliberately receives only the few
/// fields a suggestion is allowed to carry.
class _SuggestionRow extends ConsumerStatefulWidget {
  const _SuggestionRow({required this.person});

  final SuggestedConnection person;

  @override
  ConsumerState<_SuggestionRow> createState() => _SuggestionRowState();
}

class _SuggestionRowState extends ConsumerState<_SuggestionRow> {
  bool _busy = false;
  bool _sent = false;

  Future<void> _connect() async {
    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.requestConnection(widget.person.id);
      if (!mounted) return;
      setState(() => _sent = true);
      showAppSnack(context, 'Connection request sent.');
      ref.invalidate(connectionsProvider);
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
    final person = widget.person;
    final detail = [person.departmentName, person.graduationYear]
        .whereType<String>()
        .join(' · ');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          GsuAvatar(
            name: person.fullName,
            imageUrl: person.avatarUrl,
            radius: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  person.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (detail.isNotEmpty)
                  Text(
                    detail,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (_sent)
            Text(
              'Requested',
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            )
          else
            TextButton(
              onPressed: _busy ? null : _connect,
              child: _busy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Connect'),
            ),
        ],
      ),
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.item});

  final ActivityItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final icon = switch (item.actionType) {
      'POSTED_JOB' || 'UPDATED_JOB' => Icons.work_outline_rounded,
      'JOINED_GROUP' => Icons.group_add_outlined,
      'POSTED_IN_GROUP' => Icons.forum_outlined,
      'GRADUATION_ANNIVERSARY' => Icons.celebration_outlined,
      _ => Icons.bolt_rounded,
    };

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBadge(icon,
              size: 34, color: AppColors.accentFor(item.actionType)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.headline,
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(fontWeight: FontWeight.w600, height: 1.4),
                ),
                const SizedBox(height: 3),
                Text(Fmt.relative(item.createdAt),
                    style:
                        theme.textTheme.labelSmall?.copyWith(letterSpacing: 0)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.28,
            children: List.generate(
              4,
              (_) => const GsuCard(
                padding: EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Skeleton(width: 34, height: 34, radius: 11),
                    Spacer(),
                    Skeleton(width: 54, height: 24),
                    SizedBox(height: 8),
                    Skeleton(width: 80, height: 11),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 22),
          const GsuCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Skeleton(width: 110, height: 28),
                SizedBox(height: 12),
                Skeleton(width: 150, height: 11),
                SizedBox(height: 22),
                Skeleton(height: 140, radius: 14),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
