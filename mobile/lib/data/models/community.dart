import 'json_utils.dart';
import 'people.dart';

class AlumniGroup {
  const AlumniGroup({
    required this.id,
    required this.name,
    required this.type,
    required this.memberCount,
    required this.postCount,
    required this.isAuto,
    this.slug,
    this.description,
    this.membershipRole,
    this.lastPostContent,
    this.lastPostAt,
  });

  final String id;
  final String name;
  final String type;
  final int memberCount;
  final int postCount;
  final bool isAuto;
  final String? slug;
  final String? description;

  /// null when the current user has not joined.
  final String? membershipRole;
  final String? lastPostContent;
  final DateTime? lastPostAt;

  bool get isMember => membershipRole != null;
  bool get isAdmin =>
      membershipRole == 'ADMIN' || membershipRole == 'MODERATOR';

  factory AlumniGroup.fromJson(Map<String, dynamic> json) {
    final membership = json['membership'];
    final lastPost = asMap(json['lastPost']);
    return AlumniGroup(
      id: asString(json['id']),
      name: asString(json['name']),
      type: asString(json['type'], fallback: 'GENERAL'),
      memberCount: asInt(json['memberCount']),
      postCount: asInt(json['postCount']),
      isAuto: asBool(json['isAuto']),
      slug: asStringOrNull(json['slug']),
      description: asStringOrNull(json['description']),
      membershipRole: membership == null
          ? null
          : asString(asMap(membership)['role'], fallback: 'MEMBER'),
      lastPostContent: asStringOrNull(lastPost['content']),
      lastPostAt: asDate(lastPost['createdAt']),
    );
  }
}

class GroupPost {
  const GroupPost({
    required this.id,
    required this.content,
    required this.authorName,
    required this.commentsCount,
    required this.reactionsCount,
    required this.isPinned,
    this.authorImage,
    this.authorId,
    this.createdAt,
  });

  final String id;
  final String content;
  final String authorName;
  final int commentsCount;
  final int reactionsCount;
  final bool isPinned;
  final String? authorImage;
  final String? authorId;
  final DateTime? createdAt;

  factory GroupPost.fromJson(Map<String, dynamic> json) {
    final author = asMap(json['author']);
    return GroupPost(
      id: asString(json['id']),
      content: asString(json['content']),
      authorName: asString(author['fullName'], fallback: 'Alumnus'),
      commentsCount: asInt(json['commentsCount']),
      reactionsCount: asInt(json['reactionsCount']),
      isPinned: asBool(json['isPinned']),
      authorImage: asStringOrNull(author['image']),
      authorId: asStringOrNull(author['graduateId']),
      createdAt: asDate(json['createdAt']),
    );
  }
}

class GroupFeed {
  const GroupFeed({required this.groupName, required this.posts});

  final String groupName;
  final List<GroupPost> posts;

  factory GroupFeed.fromJson(Map<String, dynamic> json) => GroupFeed(
        groupName: asString(asMap(json['group'])['name'], fallback: 'Group'),
        posts: asList(json['posts']).map(GroupPost.fromJson).toList(),
      );
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    this.actionUrl,
    this.createdAt,
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final bool isRead;
  final String? actionUrl;
  final DateTime? createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: asString(json['id']),
        type: asString(json['type']),
        title: asString(json['title']),
        body: asString(json['body']),
        isRead: asBool(json['isRead']),
        actionUrl: asStringOrNull(json['actionUrl']),
        createdAt: asDate(json['createdAt']),
      );
}

class NotificationsData {
  const NotificationsData({
    required this.notifications,
    required this.unread,
    required this.total,
    required this.pagination,
  });

  final List<AppNotification> notifications;
  final int unread;
  final int total;
  final Pagination pagination;

  factory NotificationsData.fromJson(Map<String, dynamic> json) {
    final stats = asMap(json['stats']);
    return NotificationsData(
      notifications:
          asList(json['notifications']).map(AppNotification.fromJson).toList(),
      unread: asInt(stats['unread']),
      total: asInt(stats['total']),
      pagination: Pagination.fromJson(asMap(json['pagination'])),
    );
  }
}

class Achievement {
  const Achievement({
    required this.id,
    required this.title,
    required this.verified,
    this.description,
    this.year,
    this.createdAt,
  });

  final String id;
  final String title;
  final bool verified;
  final String? description;
  final int? year;
  final DateTime? createdAt;

  factory Achievement.fromJson(Map<String, dynamic> json) => Achievement(
        id: asString(json['id']),
        title: asString(json['title']),
        verified: asBool(json['verified']),
        description: asStringOrNull(json['description']),
        year: asIntOrNull(json['year']),
        createdAt: asDate(json['createdAt']),
      );
}

class ProfileBadge {
  const ProfileBadge({
    required this.badgeType,
    required this.label,
    required this.description,
    required this.icon,
    required this.locked,
    this.awardedAt,
  });

  final String badgeType;
  final String label;
  final String description;

  /// Lucide icon name from the web catalogue; mapped to Material on device.
  final String icon;
  final bool locked;
  final DateTime? awardedAt;

  factory ProfileBadge.fromJson(Map<String, dynamic> json) => ProfileBadge(
        badgeType: asString(json['badgeType']),
        label: asString(json['label']),
        description: asString(json['description']),
        icon: asString(json['icon']),
        locked: asBool(json['locked'], fallback: true),
        awardedAt: asDate(json['awardedAt']),
      );
}

class AchievementsData {
  const AchievementsData({
    required this.achievements,
    required this.badges,
    required this.totalAchievements,
    required this.verifiedAchievements,
    required this.earnedBadges,
  });

  final List<Achievement> achievements;
  final List<ProfileBadge> badges;
  final int totalAchievements;
  final int verifiedAchievements;
  final int earnedBadges;

  factory AchievementsData.fromJson(Map<String, dynamic> json) {
    final stats = asMap(json['stats']);
    return AchievementsData(
      achievements:
          asList(json['achievements']).map(Achievement.fromJson).toList(),
      badges: asList(json['badges']).map(ProfileBadge.fromJson).toList(),
      totalAchievements: asInt(stats['totalAchievements']),
      verifiedAchievements: asInt(stats['verifiedAchievements']),
      earnedBadges: asInt(stats['earnedBadges']),
    );
  }
}

class FeedItem {
  const FeedItem({
    required this.id,
    required this.headline,
    required this.actionType,
    required this.authorName,
    this.authorImage,
    this.authorDepartment,
    this.isPublic = true,
    this.createdAt,
  });

  final String id;
  final String headline;
  final String actionType;
  final String authorName;
  final String? authorImage;
  final String? authorDepartment;
  final bool isPublic;
  final DateTime? createdAt;

  factory FeedItem.fromJson(Map<String, dynamic> json) {
    final graduate = asMap(json['graduate']);
    return FeedItem(
      id: asString(json['id']),
      headline: asString(json['headline']),
      actionType: asString(json['actionType']),
      authorName: asString(graduate['fullName'], fallback: 'Alumnus'),
      authorImage: asStringOrNull(asMap(graduate['user'])['image']),
      authorDepartment: asStringOrNull(graduate['departmentName']),
      isPublic: asBool(json['isPublic'], fallback: true),
      createdAt: asDate(json['createdAt']),
    );
  }
}
