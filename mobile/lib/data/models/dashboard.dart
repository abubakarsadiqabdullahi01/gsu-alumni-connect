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
    required this.jobs,
    required this.groups,
    required this.connectionSuggestions,
  });

  final DashboardStats stats;
  final ProfileCompletion completion;
  final List<GrowthPoint> networkGrowth;
  final List<CategoryCount> facultyDistribution;
  final List<CategoryCount> cohortDistribution;
  final List<ActivityItem> recentActivity;
  final List<EventTeaser> upcomingEvents;
  final JobsSummary jobs;
  final GroupsSummary groups;
  final List<SuggestedConnection> connectionSuggestions;

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
      // Absent on an older server: asMap yields {} and these degrade to zeros
      // and empty lists rather than throwing.
      jobs: JobsSummary.fromJson(asMap(json['jobs'])),
      groups: GroupsSummary.fromJson(asMap(json['groups'])),
      connectionSuggestions: asList(json['connectionSuggestions'])
          .map(SuggestedConnection.fromJson)
          .toList(),
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
    this.nextBestAction,
  });

  final int percent;
  final bool completed;
  final List<ChecklistItem> checklist;

  /// The single highest-weight outstanding section, chosen by the server so
  /// web and mobile nudge towards the same thing.
  final ChecklistItem? nextBestAction;

  List<ChecklistItem> get outstanding =>
      checklist.where((item) => !item.done).toList();

  factory ProfileCompletion.fromJson(Map<String, dynamic> json) {
    final next = json['nextBestAction'];
    return ProfileCompletion(
      percent: asInt(json['percent']),
      completed: asBool(json['completed']),
      checklist: asList(json['checklist']).map(ChecklistItem.fromJson).toList(),
      nextBestAction: next == null ? null : ChecklistItem.fromJson(asMap(next)),
    );
  }
}

class ChecklistItem {
  const ChecklistItem({
    required this.key,
    required this.label,
    required this.done,
    this.weight = 0,
    this.prompt,
    this.href,
  });

  final String key;
  final String label;
  final bool done;

  /// How much this section contributes to the percentage.
  final int weight;

  /// Friendly invitation to complete it, authored server-side.
  final String? prompt;

  /// Web path the section belongs to; the app maps it to its own route.
  final String? href;

  factory ChecklistItem.fromJson(Map<String, dynamic> json) => ChecklistItem(
        key: asString(json['key']),
        label: asString(json['label']),
        done: asBool(json['done']),
        weight: asInt(json['weight']),
        prompt: asStringOrNull(json['prompt']),
        href: asStringOrNull(json['href']),
      );
}

class JobsSummary {
  const JobsSummary({
    required this.activeTotal,
    required this.myApplications,
    required this.recent,
  });

  final int activeTotal;
  final int myApplications;
  final List<JobTeaser> recent;

  factory JobsSummary.fromJson(Map<String, dynamic> json) => JobsSummary(
        activeTotal: asInt(json['activeTotal']),
        myApplications: asInt(json['myApplications']),
        recent: asList(json['recent']).map(JobTeaser.fromJson).toList(),
      );
}

class JobTeaser {
  const JobTeaser({
    required this.id,
    required this.title,
    required this.companyName,
    this.industry,
    this.jobType,
    this.locationState,
  });

  final String id;
  final String title;
  final String companyName;
  final String? industry;
  final String? jobType;
  final String? locationState;

  factory JobTeaser.fromJson(Map<String, dynamic> json) => JobTeaser(
        id: asString(json['id']),
        title: asString(json['title'], fallback: 'Untitled role'),
        companyName: asString(json['companyName']),
        industry: asStringOrNull(json['industry']),
        jobType: asStringOrNull(json['jobType']),
        locationState: asStringOrNull(json['locationState']),
      );
}

class GroupsSummary {
  const GroupsSummary({required this.joined, required this.popular});

  final int joined;
  final List<GroupTeaser> popular;

  factory GroupsSummary.fromJson(Map<String, dynamic> json) => GroupsSummary(
        joined: asInt(json['joined']),
        popular: asList(json['popular']).map(GroupTeaser.fromJson).toList(),
      );
}

class GroupTeaser {
  const GroupTeaser({
    required this.id,
    required this.name,
    required this.membersCount,
    this.type,
  });

  final String id;
  final String name;
  final int membersCount;
  final String? type;

  factory GroupTeaser.fromJson(Map<String, dynamic> json) => GroupTeaser(
        id: asString(json['id']),
        name: asString(json['name'], fallback: 'Group'),
        membersCount: asInt(json['membersCount']),
        type: asStringOrNull(json['type']),
      );
}

class SuggestedConnection {
  const SuggestedConnection({
    required this.id,
    required this.fullName,
    this.departmentName,
    this.graduationYear,
    this.avatarUrl,
  });

  final String id;
  final String fullName;
  final String? departmentName;
  final String? graduationYear;
  final String? avatarUrl;

  factory SuggestedConnection.fromJson(Map<String, dynamic> json) =>
      SuggestedConnection(
        id: asString(json['id']),
        fullName: asString(json['fullName'], fallback: 'Alumnus'),
        departmentName: asStringOrNull(json['departmentName']),
        graduationYear: asStringOrNull(json['graduationYear']),
        avatarUrl: asStringOrNull(json['avatarUrl']),
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
