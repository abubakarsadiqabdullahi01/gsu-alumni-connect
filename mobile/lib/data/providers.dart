import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'alumni_repository.dart';
import 'models/alumni_map.dart';
import 'models/community.dart';
import 'models/dashboard.dart';
import 'models/id_card.dart';
import 'models/messaging.dart';
import 'models/opportunities.dart';
import 'models/people.dart';
import 'models/profile.dart';

/// A list that grows page by page.
class Paged<T> {
  const Paged({
    required this.items,
    required this.pagination,
    this.loadingMore = false,
  });

  final List<T> items;
  final Pagination pagination;
  final bool loadingMore;

  bool get hasMore => pagination.hasMore;

  Paged<T> copyWith({
    List<T>? items,
    Pagination? pagination,
    bool? loadingMore,
  }) =>
      Paged<T>(
        items: items ?? this.items,
        pagination: pagination ?? this.pagination,
        loadingMore: loadingMore ?? this.loadingMore,
      );
}

/// Shared paging and search behaviour: page one replaces, later pages append,
/// and a keystroke debounce stops the directory firing a request per character.
abstract class PagedController<T> extends AutoDisposeAsyncNotifier<Paged<T>> {
  Timer? _debounce;

  Future<Paged<T>> fetch(int page);

  @override
  Future<Paged<T>> build() {
    ref.onDispose(() => _debounce?.cancel());
    return fetch(1);
  }

  /// Re-queries from page one after a short pause.
  void scheduleReload({Duration delay = const Duration(milliseconds: 350)}) {
    _debounce?.cancel();
    _debounce = Timer(delay, reload);
  }

  Future<void> reload() async {
    state = await AsyncValue.guard(() => fetch(1));
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.loadingMore) return;

    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final next = await fetch(current.pagination.page + 1);
      state = AsyncData(
        Paged<T>(
          items: [...current.items, ...next.items],
          pagination: next.pagination,
        ),
      );
    } catch (_) {
      // Keep what is already on screen rather than wiping the list because
      // one extra page failed; the user can pull to retry.
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }
}

// ── Dashboard, feed, map ─────────────────────────────────────────────────────

final dashboardProvider =
    FutureProvider.autoDispose<DashboardData>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.dashboard();
});

final feedProvider = FutureProvider.autoDispose<List<FeedItem>>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.feed();
});

final alumniMapProvider =
    FutureProvider.autoDispose<AlumniMapData>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.alumniMap();
});

// ── Directory ────────────────────────────────────────────────────────────────

final directoryProvider =
    AsyncNotifierProvider.autoDispose<DirectoryController, Paged<Person>>(
  DirectoryController.new,
);

class DirectoryController extends PagedController<Person> {
  String query = '';
  String department = '';
  String year = '';

  int get activeFilterCount =>
      (department.isEmpty ? 0 : 1) + (year.isEmpty ? 0 : 1);

  @override
  Future<Paged<Person>> fetch(int page) async {
    final repository = await ref.read(repositoryProvider.future);
    final result = await repository.directory(
      query: query,
      department: department,
      year: year,
      page: page,
    );
    return Paged(items: result.items, pagination: result.pagination);
  }

  void setQuery(String value) {
    query = value.trim();
    scheduleReload();
  }

  void setFilters({String? department, String? year}) {
    this.department = department ?? this.department;
    this.year = year ?? this.year;
    scheduleReload(delay: Duration.zero);
  }

  void clearFilters() {
    department = '';
    year = '';
    scheduleReload(delay: Duration.zero);
  }
}

// ── Connections ──────────────────────────────────────────────────────────────

final connectionsProvider =
    FutureProvider.autoDispose<ConnectionsData>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.connections();
});

// ── Groups ───────────────────────────────────────────────────────────────────

final groupsProvider =
    FutureProvider.autoDispose<List<AlumniGroup>>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.groups();
});

final groupFeedProvider =
    FutureProvider.autoDispose.family<GroupFeed, String>((ref, groupId) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.groupPosts(groupId);
});

// ── Messaging ────────────────────────────────────────────────────────────────

final conversationsProvider =
    FutureProvider.autoDispose<List<ConversationSummary>>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.conversations();
});

final threadProvider = FutureProvider.autoDispose
    .family<ConversationThread, String>((ref, conversationId) async {
  final repository = await ref.watch(repositoryProvider.future);
  final thread = await repository.thread(conversationId);
  unawaited(repository.markConversationRead(conversationId));
  return thread;
});

// ── Jobs ─────────────────────────────────────────────────────────────────────

final jobsProvider =
    AsyncNotifierProvider.autoDispose<JobsController, Paged<JobPosting>>(
  JobsController.new,
);

class JobsController extends PagedController<JobPosting> {
  String query = '';
  String jobType = '';
  String locationState = '';
  List<JobApplication> myApplications = const [];

  @override
  Future<Paged<JobPosting>> fetch(int page) async {
    final repository = await ref.read(repositoryProvider.future);
    final result = await repository.jobs(
      query: query,
      jobType: jobType,
      state: locationState,
      page: page,
    );
    myApplications = result.myApplications;
    return Paged(items: result.jobs, pagination: result.pagination);
  }

  void setQuery(String value) {
    query = value.trim();
    scheduleReload();
  }

  void setType(String value) {
    jobType = value;
    scheduleReload(delay: Duration.zero);
  }
}

// ── Events ───────────────────────────────────────────────────────────────────

final eventsProvider =
    AsyncNotifierProvider.autoDispose<EventsController, Paged<AlumniEvent>>(
  EventsController.new,
);

class EventsController extends PagedController<AlumniEvent> {
  String query = '';
  String type = '';
  String status = 'upcoming';

  @override
  Future<Paged<AlumniEvent>> fetch(int page) async {
    final repository = await ref.read(repositoryProvider.future);
    final result = await repository.events(
      query: query,
      type: type,
      status: status,
      page: page,
    );
    return Paged(items: result.events, pagination: result.pagination);
  }

  void setQuery(String value) {
    query = value.trim();
    scheduleReload();
  }

  void setStatus(String value) {
    status = value;
    scheduleReload(delay: Duration.zero);
  }
}

// ── Mentorship ───────────────────────────────────────────────────────────────

final mentorshipQueryProvider = StateProvider.autoDispose<String>((ref) => '');

final mentorshipProvider =
    FutureProvider.autoDispose<MentorshipData>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.mentorship(query: ref.watch(mentorshipQueryProvider));
});

// ── Notifications ────────────────────────────────────────────────────────────

final notificationFilterProvider =
    StateProvider.autoDispose<String>((ref) => 'all');

final notificationsProvider =
    FutureProvider.autoDispose<NotificationsData>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.notifications(
      status: ref.watch(notificationFilterProvider));
});

// ── Achievements, profile, settings, ID card ─────────────────────────────────

final achievementsProvider =
    FutureProvider.autoDispose<AchievementsData>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.achievements();
});

final profileProvider = FutureProvider.autoDispose<AlumniProfile>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.profile();
});

final settingsProvider =
    FutureProvider.autoDispose<PrivacySettings>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.settings();
});

final idCardProvider = FutureProvider.autoDispose<IdCard>((ref) async {
  final repository = await ref.watch(repositoryProvider.future);
  return repository.idCard();
});
