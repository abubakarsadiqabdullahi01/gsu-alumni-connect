import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/models/people.dart';
import '../../data/providers.dart';
import '../auth/session_controller.dart';
import '../connections/connections_screen.dart';
import '../shared/navigation.dart';
import '../shared/person_card.dart';

class DirectoryScreen extends ConsumerStatefulWidget {
  const DirectoryScreen({super.key});

  @override
  ConsumerState<DirectoryScreen> createState() => _DirectoryScreenState();
}

class _DirectoryScreenState extends ConsumerState<DirectoryScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 400) {
      ref.read(directoryProvider.notifier).loadMore();
    }
  }

  Future<void> _openFilters() async {
    final controller = ref.read(directoryProvider.notifier);
    await openSheet(
      context,
      _FilterSheet(
        department: controller.department,
        year: controller.year,
        onApply: (department, year) {
          controller.setFilters(department: department, year: year);
        },
        onClear: controller.clearFilters,
      ),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final directory = ref.watch(directoryProvider);
    final controller = ref.read(directoryProvider.notifier);
    // Read from the bootstrap payload, which is already in memory — opening the
    // directory should not trigger a connections fetch just to draw a badge.
    final pendingRequests = ref.watch(badgeCountsProvider).connectionRequests;

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
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Alumni Directory',
                                style: theme.textTheme.headlineSmall),
                            const SizedBox(height: 2),
                            Text(
                              directory.valueOrNull == null
                                  ? 'Search verified graduates'
                                  : '${Fmt.number(directory.value!.pagination.total)} '
                                      'verified graduates',
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      Badge(
                        isLabelVisible: pendingRequests > 0,
                        label: Text('$pendingRequests'),
                        child: IconButton.filledTonal(
                          onPressed: () =>
                              openScreen(context, const ConnectionsScreen()),
                          icon: const Icon(Icons.hub_outlined),
                          tooltip: 'My connections',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  GsuSearchField(
                    controller: _searchController,
                    hintText: 'Name, department or registration number',
                    onChanged: controller.setQuery,
                    onFilterTap: _openFilters,
                    filterCount: controller.activeFilterCount,
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: controller.reload,
                child: AsyncView<Paged<Person>>(
                  value: directory,
                  onRetry: controller.reload,
                  data: (paged) {
                    if (paged.items.isEmpty) {
                      return ListView(
                        controller: _scrollController,
                        children: [
                          EmptyState(
                            icon: Icons.person_search_outlined,
                            title: 'No alumni found',
                            message: controller.query.isEmpty
                                ? 'No graduates match the current filters.'
                                : 'Nothing matched "${controller.query}". '
                                    'Try a different spelling or clear the filters.',
                            actionLabel: controller.activeFilterCount > 0
                                ? 'Clear filters'
                                : null,
                            onAction: controller.activeFilterCount > 0
                                ? controller.clearFilters
                                : null,
                          ),
                        ],
                      );
                    }

                    return ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                      itemCount: paged.items.length + (paged.hasMore ? 1 : 0),
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= paged.items.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 22),
                            child: Center(
                              child: SizedBox(
                                height: 22,
                                width: 22,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2.4),
                              ),
                            ),
                          );
                        }
                        return PersonCard(person: paged.items[index]);
                      },
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

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({
    required this.department,
    required this.year,
    required this.onApply,
    required this.onClear,
  });

  final String department;
  final String year;
  final void Function(String department, String year) onApply;
  final VoidCallback onClear;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late final _departmentController =
      TextEditingController(text: widget.department);
  late final _yearController = TextEditingController(text: widget.year);

  @override
  void dispose() {
    _departmentController.dispose();
    _yearController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Filter directory', style: theme.textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(
            'Values must match the record exactly, as stored by the alumni '
            'office.',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _departmentController,
            decoration: const InputDecoration(
              labelText: 'Department',
              hintText: 'Accounting',
              prefixIcon: Icon(Icons.school_outlined),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _yearController,
            keyboardType: TextInputType.text,
            decoration: const InputDecoration(
              labelText: 'Graduation year',
              hintText: '2023-2024',
              prefixIcon: Icon(Icons.calendar_today_outlined),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    widget.onClear();
                    Navigator.of(context).pop();
                  },
                  child: const Text('Clear'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: () {
                    widget.onApply(
                      _departmentController.text.trim(),
                      _yearController.text.trim(),
                    );
                    Navigator.of(context).pop();
                  },
                  child: const Text('Apply filters'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
