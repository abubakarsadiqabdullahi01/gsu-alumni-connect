import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/api_client.dart';
import 'models/alumni_map.dart';
import 'models/bootstrap.dart';
import 'models/community.dart';
import 'models/dashboard.dart';
import 'models/id_card.dart';
import 'models/insights.dart';
import 'models/messaging.dart';
import 'models/opportunities.dart';
import 'models/people.dart';
import 'models/profile.dart';
import 'models/public_profile.dart';
import 'models/search.dart';

/// Every server call the app makes, in one place.
///
/// Screens never talk to `ApiService` directly — they go through here, so route
/// names and payload shapes are defined once and stay next to each other.
class AlumniRepository {
  const AlumniRepository(this._api);

  final ApiService _api;

  // ── Session ────────────────────────────────────────────────────────────────

  Future<Bootstrap> bootstrap() async {
    return Bootstrap.fromJson(await _api.get('/api/mobile/bootstrap'));
  }

  Future<void> signIn({
    required String registrationNo,
    required String password,
    bool rememberMe = true,
  }) async {
    await _api.post(
      '/api/auth/sign-in/registration',
      body: {
        'registrationNo': registrationNo.trim(),
        'password': password,
        'rememberMe': rememberMe,
      },
    );
  }

  Future<void> signOut() async {
    try {
      await _api.post('/api/auth/sign-out');
    } catch (_) {
      // A failed server sign-out must not strand the user in the app; the
      // local cookie drop below is what actually ends the session on device.
    }
    await _api.clearSession();
  }

  Future<void> heartbeat() async {
    try {
      await _api.post('/api/presence/heartbeat');
    } catch (_) {
      // Presence is best-effort.
    }
  }

  // ── Dashboard, feed and map ────────────────────────────────────────────────

  Future<DashboardData> dashboard() async {
    return DashboardData.fromJson(await _api.get('/api/dashboard'));
  }

  Future<List<FeedItem>> feed() async {
    final json = await _api.get('/api/feed');
    return (json['feed'] as List? ?? [])
        .map(
            (item) => FeedItem.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<void> postActivity({
    required String headline,
    required String actionType,
    bool isPublic = true,
  }) async {
    await _api.post(
      '/api/feed',
      body: {
        'headline': headline,
        'actionType': actionType,
        'isPublic': isPublic,
      },
    );
  }

  Future<AlumniMapData> alumniMap() async {
    return AlumniMapData.fromJson(await _api.get('/api/map'));
  }

  // ── Insights, search and completion ────────────────────────────────────────

  /// Aggregate platform statistics. Counts only — safe for any member.
  Future<AlumniInsights> insights() async {
    return AlumniInsights.fromJson(await _api.get('/api/insights/alumni'));
  }

  /// One query across alumni, groups, jobs and events.
  ///
  /// Short queries are answered locally: the server treats anything under two
  /// characters as empty, so there is no point spending a request on it.
  Future<SearchResults> search(String query) async {
    final trimmed = query.trim();
    if (trimmed.length < 2) return SearchResults.empty;
    return SearchResults.fromJson(
      await _api.get('/api/search', query: {'q': trimmed}),
    );
  }

  /// Weighted profile completion for the signed-in member, including the one
  /// outstanding item most worth prompting about.
  Future<ProfileCompletion> profileCompletion() async {
    return ProfileCompletion.fromJson(await _api.get('/api/profile/completion'));
  }

  /// Another alumnus, with privacy rules already applied server-side.
  Future<PublicAlumniProfile> alumniProfile(String graduateId) async {
    return PublicAlumniProfile.fromJson(
      await _api.get('/api/directory/$graduateId'),
    );
  }

  // ── Directory and connections ──────────────────────────────────────────────

  Future<DirectoryPage> directory({
    String query = '',
    String department = '',
    String year = '',
    int page = 1,
    int pageSize = 12,
  }) async {
    return DirectoryPage.fromJson(
      await _api.get(
        '/api/directory',
        query: {
          'q': query,
          'department': department,
          'year': year,
          'page': page,
          'pageSize': pageSize,
        },
      ),
    );
  }

  Future<ConnectionsData> connections() async {
    return ConnectionsData.fromJson(await _api.get('/api/connections'));
  }

  Future<void> requestConnection(String receiverGraduateId) async {
    await _api.post(
      '/api/connections/request',
      body: {'receiverGraduateId': receiverGraduateId},
    );
  }

  /// [action] is one of accept, decline, cancel, block.
  Future<void> respondToConnection(String connectionId, String action) async {
    await _api
        .patch('/api/connections/$connectionId', body: {'action': action});
  }

  Future<void> removeConnection(String connectionId) async {
    await _api.delete('/api/connections/$connectionId');
  }

  // ── Groups ─────────────────────────────────────────────────────────────────

  Future<List<AlumniGroup>> groups() async {
    final json = await _api.get('/api/groups');
    return (json['groups'] as List? ?? [])
        .map((item) =>
            AlumniGroup.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<void> joinGroup(String groupId) async {
    await _api.post('/api/groups/$groupId/membership');
  }

  Future<void> leaveGroup(String groupId) async {
    await _api.delete('/api/groups/$groupId/membership');
  }

  Future<GroupFeed> groupPosts(String groupId) async {
    return GroupFeed.fromJson(await _api.get('/api/groups/$groupId/posts'));
  }

  Future<void> createGroupPost(String groupId, String content) async {
    await _api.post('/api/groups/$groupId/posts', body: {'content': content});
  }

  /// Opens (or creates) the chat thread attached to an alumni group.
  Future<String> groupConversation(String groupId) async {
    final json = await _api.post('/api/groups/$groupId/conversation');
    return (json['conversationId'] ?? '').toString();
  }

  // ── Messaging ──────────────────────────────────────────────────────────────

  Future<List<ConversationSummary>> conversations() async {
    final json = await _api.get('/api/messages/conversations');
    return (json['conversations'] as List? ?? [])
        .map((item) => ConversationSummary.fromJson(
            Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<ConversationThread> thread(String conversationId) async {
    return ConversationThread.fromJson(
      await _api.get('/api/messages/conversations/$conversationId'),
    );
  }

  Future<ChatMessage> sendMessage(String conversationId, String body) async {
    final json = await _api.post(
      '/api/messages/conversations/$conversationId/messages',
      body: {'body': body},
    );
    return ChatMessage.fromJson(
      Map<String, dynamic>.from(json['message'] as Map? ?? const {}),
    );
  }

  Future<void> markConversationRead(String conversationId) async {
    try {
      await _api.post('/api/messages/conversations/$conversationId/read');
    } catch (_) {
      // Read receipts are advisory; a failure must not block the chat UI.
    }
  }

  Future<String> openDirectConversation(String graduateId) async {
    final json = await _api.post(
      '/api/messages/direct',
      body: {'graduateId': graduateId},
    );
    return (json['conversationId'] ?? '').toString();
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────

  Future<JobsData> jobs({
    String query = '',
    String jobType = '',
    String state = '',
    int page = 1,
  }) async {
    return JobsData.fromJson(
      await _api.get(
        '/api/jobs',
        query: {
          'q': query,
          'jobType': jobType,
          'state': state,
          'page': page,
          'pageSize': 10,
        },
      ),
    );
  }

  Future<void> applyToJob(
    String jobId, {
    String? coverNote,
    String? cvUrl,
  }) async {
    await _api.post(
      '/api/jobs/$jobId/apply',
      body: {'coverNote': coverNote, 'cvUrl': cvUrl},
    );
  }

  Future<void> createJob(Map<String, dynamic> payload) async {
    await _api.post('/api/jobs', body: payload);
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  Future<EventsData> events({
    String query = '',
    String type = '',
    String status = 'upcoming',
    int page = 1,
  }) async {
    return EventsData.fromJson(
      await _api.get(
        '/api/events',
        query: {
          'q': query,
          'type': type,
          'status': status,
          'page': page,
          'pageSize': 10,
        },
      ),
    );
  }

  Future<void> rsvp(String eventId) async {
    await _api.post('/api/events/$eventId/rsvp');
  }

  Future<void> cancelRsvp(String eventId) async {
    await _api.delete('/api/events/$eventId/rsvp');
  }

  Future<void> createEvent(Map<String, dynamic> payload) async {
    await _api.post('/api/events', body: payload);
  }

  // ── Mentorship ─────────────────────────────────────────────────────────────

  Future<MentorshipData> mentorship({String query = ''}) async {
    return MentorshipData.fromJson(
      await _api.get('/api/mentorship', query: {'q': query}),
    );
  }

  Future<void> requestMentorship({
    required String mentorId,
    String? subject,
    String? message,
  }) async {
    await _api.post(
      '/api/mentorship',
      body: {'mentorId': mentorId, 'subject': subject, 'message': message},
    );
  }

  /// [action] is one of accept, decline, cancel, complete.
  Future<void> updateMentorship(
    String id,
    String action, {
    String? notes,
  }) async {
    await _api.patch(
      '/api/mentorship/$id',
      body: {'action': action, if (notes != null) 'notes': notes},
    );
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  Future<NotificationsData> notifications({
    String status = 'all',
    String query = '',
    int page = 1,
  }) async {
    return NotificationsData.fromJson(
      await _api.get(
        '/api/notifications',
        query: {'status': status, 'q': query, 'page': page, 'pageSize': 20},
      ),
    );
  }

  Future<void> markNotificationRead(String id) async {
    await _api.patch('/api/notifications/$id', body: {'action': 'read'});
  }

  Future<void> markAllNotificationsRead() async {
    await _api.patch('/api/notifications', body: {'action': 'mark_all_read'});
  }

  // ── Achievements ───────────────────────────────────────────────────────────

  Future<AchievementsData> achievements() async {
    return AchievementsData.fromJson(await _api.get('/api/achievements'));
  }

  Future<void> createAchievement({
    required String title,
    String? description,
    int? year,
  }) async {
    await _api.post(
      '/api/achievements',
      body: {'title': title, 'description': description, 'year': year},
    );
  }

  Future<void> deleteAchievement(String id) async {
    await _api.delete('/api/achievements/$id');
  }

  // ── Profile, settings and ID card ──────────────────────────────────────────

  Future<AlumniProfile> profile() async {
    final json = await _api.get('/api/profile');
    return AlumniProfile.fromJson(
      Map<String, dynamic>.from(json['profile'] as Map? ?? const {}),
    );
  }

  Future<void> updateProfile(Map<String, dynamic> payload) async {
    await _api.patch('/api/profile', body: payload);
  }

  Future<PrivacySettings> settings() async {
    final json = await _api.get('/api/settings');
    return PrivacySettings.fromJson(
      Map<String, dynamic>.from(json['settings'] as Map? ?? const {}),
    );
  }

  Future<void> updateSettings(Map<String, dynamic> payload) async {
    await _api.patch('/api/settings', body: payload);
  }

  Future<IdCard> idCard() async {
    return IdCard.fromJson(await _api.get('/api/id-cards'));
  }
}

final repositoryProvider = FutureProvider<AlumniRepository>((ref) async {
  final api = await ref.watch(apiServiceProvider.future);
  return AlumniRepository(api);
});
