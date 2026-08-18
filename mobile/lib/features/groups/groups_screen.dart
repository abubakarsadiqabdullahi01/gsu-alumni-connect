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
import 'group_detail_screen.dart';

class GroupsScreen extends ConsumerStatefulWidget {
  const GroupsScreen({super.key});

  @override
  ConsumerState<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends ConsumerState<GroupsScreen> {
  String _filter = 'all';
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<AlumniGroup> _apply(List<AlumniGroup> groups) {
    return groups.where((group) {
      if (_filter == 'joined' && !group.isMember) return false;
      if (_filter == 'discover' && group.isMember) return false;
      if (_query.isEmpty) return true;
      final needle = _query.toLowerCase();
      return group.name.toLowerCase().contains(needle) ||
          (group.description ?? '').toLowerCase().contains(needle);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final groups = ref.watch(groupsProvider);

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
                  Text('Groups', style: theme.textTheme.headlineSmall),
                  const SizedBox(height: 2),
                  Text(
                    'Cohort, faculty and interest communities',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 14),
                  GsuSearchField(
                    controller: _searchController,
                    hintText: 'Search groups',
                    onChanged: (value) => setState(() => _query = value.trim()),
                  ),
                ],
              ),
            ),
            FilterChipsRow(
              options: const {
                'all': 'All groups',
                'joined': 'My groups',
                'discover': 'Discover',
              },
              selected: _filter,
              onSelected: (value) => setState(() => _filter = value),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(groupsProvider);
                  await ref.read(groupsProvider.future);
                },
                child: AsyncView<List<AlumniGroup>>(
                  value: groups,
                  onRetry: () => ref.invalidate(groupsProvider),
                  data: (all) {
                    final visible = _apply(all);
                    if (visible.isEmpty) {
                      return ListView(
                        children: [
                          EmptyState(
                            icon: Icons.forum_outlined,
                            title: _filter == 'joined'
                                ? 'You have not joined a group'
                                : 'No groups found',
                            message: _filter == 'joined'
                                ? 'Join a cohort or faculty group to follow '
                                    'conversations from your classmates.'
                                : 'Try a different search term.',
                            actionLabel:
                                _filter == 'joined' ? 'Discover groups' : null,
                            onAction: _filter == 'joined'
                                ? () => setState(() => _filter = 'discover')
                                : null,
                          ),
                        ],
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                      itemCount: visible.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) =>
                          _GroupCard(group: visible[index]),
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

class _GroupCard extends ConsumerStatefulWidget {
  const _GroupCard({required this.group});

  final AlumniGroup group;

  @override
  ConsumerState<_GroupCard> createState() => _GroupCardState();
}

class _GroupCardState extends ConsumerState<_GroupCard> {
  bool _busy = false;

  Future<void> _toggleMembership() async {
    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      if (widget.group.isMember) {
        await repository.leaveGroup(widget.group.id);
        if (mounted) showAppSnack(context, 'Left ${widget.group.name}.');
      } else {
        await repository.joinGroup(widget.group.id);
        if (mounted) showAppSnack(context, 'Joined ${widget.group.name}.');
      }
      ref.invalidate(groupsProvider);
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
    final group = widget.group;
    final tone = AppColors.accentFor(group.name);

    return GsuCard(
      accent: tone,
      onTap: group.isMember
          ? () => openScreen(
                context,
                GroupDetailScreen(groupId: group.id, groupName: group.name),
              )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconBadge(
                _iconFor(group.type),
                color: tone,
                size: 46,
                solid: group.isMember,
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      group.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style:
                          theme.textTheme.titleMedium?.copyWith(fontSize: 15),
                    ),
                    const SizedBox(height: 5),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        StatusPill(Fmt.enumLabel(group.type), tone: tone),
                        StatusPill(
                          '${Fmt.compact(group.memberCount)} members',
                          tone: AppColors.ink500,
                        ),
                        if (group.postCount > 0)
                          StatusPill(
                            '${Fmt.compact(group.postCount)} posts',
                            tone: AppColors.ink500,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (group.description != null && group.description!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              group.description!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(height: 1.5),
            ),
          ],
          if (group.lastPostContent != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(11),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.format_quote_rounded,
                    size: 15,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      group.lastPostContent!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    Fmt.relative(group.lastPostAt),
                    style: theme.textTheme.labelSmall
                        ?.copyWith(letterSpacing: 0, fontSize: 10),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 13),
          Row(
            children: [
              if (group.isMember)
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => openScreen(
                      context,
                      GroupDetailScreen(
                        groupId: group.id,
                        groupName: group.name,
                      ),
                    ),
                    icon: const Icon(Icons.forum_outlined, size: 17),
                    label: const Text('Open'),
                    style:
                        FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                  ),
                )
              else
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _toggleMembership,
                    icon: _busy
                        ? const SizedBox(
                            height: 15,
                            width: 15,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.group_add_outlined, size: 17),
                    label: const Text('Join group'),
                    style:
                        FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                  ),
                ),
              if (group.isMember) ...[
                const SizedBox(width: 9),
                OutlinedButton(
                  onPressed: _busy ? null : _toggleMembership,
                  child: const Text('Leave'),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  static IconData _iconFor(String type) => switch (type.toUpperCase()) {
        'COHORT' => Icons.groups_2_outlined,
        'FACULTY' => Icons.account_balance_outlined,
        'COURSE' || 'DEPARTMENT' => Icons.menu_book_outlined,
        'STATE' => Icons.place_outlined,
        'INTEREST' => Icons.interests_outlined,
        _ => Icons.forum_outlined,
      };
}
