import 'json_utils.dart';

class DashboardData {
  const DashboardData({
    required this.stats,
    required this.completion,
    required this.networkGrowth,
    required this.facultyDistribution,
    required this.cohortDistribution,
    required this.recentActivity,
    required this.upcomingEvents,
  });

  final DashboardStats stats;
  final ProfileCompletion completion;
  final List<GrowthPoint> networkGrowth;
  final List<CategoryCount> facultyDistribution;
  final List<CategoryCount> cohortDistribution;
  final List<ActivityItem> recentActivity;
  final List<EventTeaser> upcomingEvents;

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final charts = asMap(json['charts']);
    return DashboardData(
      stats: DashboardStats.fromJson(asMap(json['stats'])),
      completion: ProfileCompletion.fromJson(asMap(json['completion'])),
      networkGrowth:
          asList(charts['networkGrowth']).map(GrowthPoint.fromJson).toList(),
      facultyDistribution: asList(charts['facultyDistribution'])
          .map(CategoryCount.fromJson)
          .toList(),
      cohortDistribution: asList(charts['cohortDistribution'])
          .map(CategoryCount.fromJson)
          .toList(),
      recentActivity:
          asList(json['recentActivity']).map(ActivityItem.fromJson).toList(),
      upcomingEvents:
          asList(json['upcomingEvents']).map(EventTeaser.fromJson).toList(),
    );
  }
}

class DashboardStats {
  const DashboardStats({
    required this.connections,
    required this.pendingConnectionRequests,
    required this.profileViews,
    required this.jobApplications,
    required this.groupsJoined,
    required this.eventsJoined,
    required this.achievements,
    required this.unreadNotifications,
    required this.networkSize,
  });

  final int connections;
  final int pendingConnectionRequests;
  final int profileViews;
  final int jobApplications;
  final int groupsJoined;
  final int eventsJoined;
  final int achievements;
  final int unreadNotifications;
  final int networkSize;

  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(
        connections: asInt(json['connections']),
        pendingConnectionRequests: asInt(json['pendingConnectionRequests']),
        profileViews: asInt(json['profileViews']),
        jobApplications: asInt(json['jobApplications']),
        groupsJoined: asInt(json['groupsJoined']),
        eventsJoined: asInt(json['eventsJoined']),
        achievements: asInt(json['achievements']),
        unreadNotifications: asInt(json['unreadNotifications']),
        networkSize: asInt(json['networkSize']),
      );
}

class ProfileCompletion {
  const ProfileCompletion({
    required this.percent,
    required this.completed,
    required this.checklist,
  });

  final int percent;
  final bool completed;
  final List<ChecklistItem> checklist;

  List<ChecklistItem> get outstanding =>
      checklist.where((item) => !item.done).toList();

  factory ProfileCompletion.fromJson(Map<String, dynamic> json) =>
      ProfileCompletion(
        percent: asInt(json['percent']),
        completed: asBool(json['completed']),
        checklist:
            asList(json['checklist']).map(ChecklistItem.fromJson).toList(),
      );
}

class ChecklistItem {
  const ChecklistItem({
    required this.key,
    required this.label,
    required this.done,
  });

  final String key;
  final String label;
  final bool done;

  factory ChecklistItem.fromJson(Map<String, dynamic> json) => ChecklistItem(
        key: asString(json['key']),
        label: asString(json['label']),
        done: asBool(json['done']),
      );
}

class GrowthPoint {
  const GrowthPoint({
    required this.label,
    required this.added,
    required this.total,
  });

  final String label;
  final int added;
  final int total;

  factory GrowthPoint.fromJson(Map<String, dynamic> json) => GrowthPoint(
        label: asString(json['label']),
        added: asInt(json['added']),
        total: asInt(json['total']),
      );
}

class CategoryCount {
  const CategoryCount({required this.label, required this.count});

  final String label;
  final int count;

  factory CategoryCount.fromJson(Map<String, dynamic> json) => CategoryCount(
        label: asString(json['label'], fallback: 'Unknown'),
        count: asInt(json['count']),
      );
}

class ActivityItem {
  const ActivityItem({
    required this.id,
    required this.headline,
    required this.actionType,
    this.createdAt,
  });

  final String id;
  final String headline;
  final String actionType;
  final DateTime? createdAt;

  factory ActivityItem.fromJson(Map<String, dynamic> json) => ActivityItem(
        id: asString(json['id']),
        headline: asString(json['headline']),
        actionType: asString(json['actionType']),
        createdAt: asDate(json['createdAt']),
      );
}

class EventTeaser {
  const EventTeaser({
    required this.id,
    required this.title,
    required this.location,
    required this.type,
    required this.attendeesCount,
    this.startsAt,
  });

  final String id;
  final String title;
  final String location;
  final String type;
  final int attendeesCount;
  final DateTime? startsAt;

  factory EventTeaser.fromJson(Map<String, dynamic> json) => EventTeaser(
        id: asString(json['id']),
        title: asString(json['title']),
        location: asString(json['location']),
        type: asString(json['type']),
        attendeesCount: asInt(json['attendeesCount']),
        startsAt: asDate(json['startsAt']),
      );
}
