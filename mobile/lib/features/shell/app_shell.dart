import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/bootstrap.dart';
import '../auth/session_controller.dart';
import '../dashboard/dashboard_screen.dart';
import '../directory/directory_screen.dart';
import '../groups/groups_screen.dart';
import '../messages/messages_screen.dart';
import 'more_screen.dart';

/// Bottom-navigation destination, gated on an admin feature flag.
class _Destination {
  const _Destination({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.builder,
    this.badge = 0,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final WidgetBuilder builder;
  final int badge;
}

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  int _index = 0;

  List<_Destination> _destinations(FeatureFlags features, BadgeCounts badges) {
    return [
      _Destination(
        label: 'Home',
        icon: Icons.space_dashboard_outlined,
        selectedIcon: Icons.space_dashboard_rounded,
        builder: (_) => const DashboardScreen(),
      ),
      _Destination(
        label: 'Directory',
        icon: Icons.groups_2_outlined,
        selectedIcon: Icons.groups_2_rounded,
        builder: (_) => const DirectoryScreen(),
        badge: badges.connectionRequests,
      ),
      if (features.groups)
        _Destination(
          label: 'Groups',
          icon: Icons.forum_outlined,
          selectedIcon: Icons.forum_rounded,
          builder: (_) => const GroupsScreen(),
        ),
      if (features.messaging)
        _Destination(
          label: 'Messages',
          icon: Icons.chat_bubble_outline_rounded,
          selectedIcon: Icons.chat_bubble_rounded,
          builder: (_) => const MessagesScreen(),
          badge: badges.messages,
        ),
      _Destination(
        label: 'More',
        icon: Icons.grid_view_outlined,
        selectedIcon: Icons.grid_view_rounded,
        builder: (_) => const MoreScreen(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final features = ref.watch(featuresProvider);
    final badges = ref.watch(badgeCountsProvider);
    final destinations = _destinations(features, badges);

    // Turning a feature off in the admin console shortens the list; clamp so a
    // previously-selected tab index cannot fall off the end.
    final index = _index.clamp(0, destinations.length - 1);
    final body = IndexedStack(
      index: index,
      children: [
        for (final destination in destinations)
          Builder(builder: destination.builder),
      ],
    );

    final isWide = MediaQuery.sizeOf(context).width >= 800;

    if (isWide) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: index,
              onDestinationSelected: (value) => setState(() => _index = value),
              labelType: NavigationRailLabelType.all,
              groupAlignment: -0.7,
              destinations: [
                for (final destination in destinations)
                  NavigationRailDestination(
                    icon: _BadgedIcon(
                      icon: destination.icon,
                      count: destination.badge,
                    ),
                    selectedIcon: _BadgedIcon(
                      icon: destination.selectedIcon,
                      count: destination.badge,
                    ),
                    label: Text(destination.label),
                  ),
              ],
            ),
            const VerticalDivider(width: 1),
            Expanded(child: body),
          ],
        ),
      );
    }

    return Scaffold(
      body: body,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: [
          for (final destination in destinations)
            NavigationDestination(
              icon: _BadgedIcon(
                icon: destination.icon,
                count: destination.badge,
              ),
              selectedIcon: _BadgedIcon(
                icon: destination.selectedIcon,
                count: destination.badge,
              ),
              label: destination.label,
            ),
        ],
      ),
    );
  }
}

class _BadgedIcon extends StatelessWidget {
  const _BadgedIcon({required this.icon, required this.count});

  final IconData icon;
  final int count;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return Icon(icon);
    return Badge(
      label: Text(count > 99 ? '99+' : '$count'),
      child: Icon(icon),
    );
  }
}
