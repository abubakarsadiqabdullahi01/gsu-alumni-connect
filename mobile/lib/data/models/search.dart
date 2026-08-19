import 'json_utils.dart';

/// Results for the one search bar that spans alumni, groups, jobs and events.
///
/// Sections the server omitted because a module is switched off arrive empty,
/// so the app shows nothing for them rather than an option that dead-ends.
class SearchResults {
  const SearchResults({
    required this.query,
    required this.alumni,
    required this.groups,
    required this.jobs,
    required this.events,
    required this.total,
  });

  final String query;
  final List<SearchHit> alumni;
  final List<SearchHit> groups;
  final List<SearchHit> jobs;
  final List<SearchHit> events;
  final int total;

  bool get isEmpty => total == 0;

  factory SearchResults.fromJson(Map<String, dynamic> json) => SearchResults(
        query: asString(json['query']),
        alumni: asList(json['alumni']).map(SearchHit.alumni).toList(),
        groups: asList(json['groups']).map(SearchHit.group).toList(),
        jobs: asList(json['jobs']).map(SearchHit.job).toList(),
        events: asList(json['events']).map(SearchHit.event).toList(),
        total: asInt(json['total']),
      );

  static const empty = SearchResults(
    query: '',
    alumni: [],
    groups: [],
    jobs: [],
    events: [],
    total: 0,
  );
}

/// The four sections differ in their fields but not in how they are rendered,
/// so they are normalised to one shape at the edge instead of four near-
/// identical widgets downstream.
class SearchHit {
  const SearchHit({
    required this.id,
    required this.title,
    this.subtitle,
    this.avatarUrl,
  });

  final String id;
  final String title;
  final String? subtitle;
  final String? avatarUrl;

  factory SearchHit.alumni(Map<String, dynamic> json) {
    final department = asStringOrNull(json['departmentName']);
    final year = asStringOrNull(json['graduationYear']);
    return SearchHit(
      id: asString(json['id']),
      title: asString(json['fullName'], fallback: 'Alumnus'),
      subtitle: [department, year].whereType<String>().join(' · '),
      avatarUrl: asStringOrNull(json['avatarUrl']),
    );
  }

  factory SearchHit.group(Map<String, dynamic> json) {
    final members = asInt(json['membersCount']);
    return SearchHit(
      id: asString(json['id']),
      title: asString(json['name'], fallback: 'Group'),
      subtitle: '$members member${members == 1 ? '' : 's'}',
    );
  }

  factory SearchHit.job(Map<String, dynamic> json) => SearchHit(
        id: asString(json['id']),
        title: asString(json['title'], fallback: 'Untitled role'),
        subtitle: [
          asStringOrNull(json['companyName']),
          asStringOrNull(json['locationState']),
        ].whereType<String>().join(' · '),
      );

  factory SearchHit.event(Map<String, dynamic> json) => SearchHit(
        id: asString(json['id']),
        title: asString(json['title'], fallback: 'Event'),
        subtitle: asStringOrNull(json['location']),
      );
}
