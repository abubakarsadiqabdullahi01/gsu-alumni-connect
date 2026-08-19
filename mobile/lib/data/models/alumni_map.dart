import 'json_utils.dart';

/// Alumni geography, as the server now aggregates it.
///
/// The API used to send one row per alumnus, carrying their name and precise
/// coordinates. It no longer does: everything arrives pre-aggregated, so the
/// app can still filter and re-rank locally without ever holding a per-person
/// location. [MapPoint] was removed with it.
class AlumniMapData {
  const AlumniMapData({
    required this.facts,
    required this.states,
    required this.faculties,
    required this.years,
    required this.mappedAlumni,
    required this.unmappedAlumni,
    required this.statesCovered,
    this.topState,
    this.topStateCount = 0,
  });

  final List<GeoFact> facts;
  final List<StateCluster> states;
  final List<String> faculties;
  final List<String> years;

  /// Alumni we can place on the map.
  final int mappedAlumni;

  /// Counted in the totals but not placeable: no state, or a state with no
  /// known centroid.
  final int unmappedAlumni;

  final int statesCovered;
  final String? topState;
  final int topStateCount;

  factory AlumniMapData.fromJson(Map<String, dynamic> json) {
    final stats = asMap(json['stats']);
    final filters = asMap(json['filters']);
    return AlumniMapData(
      facts: asList(json['facts']).map(GeoFact.fromJson).toList(),
      states: asList(json['states']).map(StateCluster.fromJson).toList(),
      faculties: asStringList(filters['faculties']),
      years: asStringList(filters['years']),
      mappedAlumni: asInt(stats['mappedAlumni']),
      unmappedAlumni: asInt(stats['unmappedAlumni']),
      statesCovered: asInt(stats['statesCovered']),
      topState: asStringOrNull(stats['topState']),
      topStateCount: asInt(stats['topStateCount']),
    );
  }

  /// Re-aggregate the fact table under the given filters.
  ///
  /// Counts compose, so this is a local sum rather than a network round trip —
  /// which is the whole reason the server sends facts instead of totals.
  List<StateCluster> clustersFor({String? faculty, String? year}) {
    final totals = <String, int>{};
    for (final fact in facts) {
      if (faculty != null && fact.faculty != faculty) continue;
      if (year != null && fact.year != year) continue;
      totals[fact.state] = (totals[fact.state] ?? 0) + fact.count;
    }

    final byState = {for (final cluster in states) cluster.state: cluster};
    final result = <StateCluster>[];
    for (final entry in totals.entries) {
      final centre = byState[entry.key];
      // No centroid means no bubble; the count still shows in rankings.
      if (centre == null) continue;
      result.add(
        StateCluster(
          state: entry.key,
          count: entry.value,
          latitude: centre.latitude,
          longitude: centre.longitude,
        ),
      );
    }
    result.sort((a, b) => b.count.compareTo(a.count));
    return result;
  }
}

/// One distinct (state, lga, city, faculty, year) combination and how many
/// alumni fall into it.
class GeoFact {
  const GeoFact({
    required this.state,
    required this.count,
    this.lga,
    this.city,
    this.faculty,
    this.year,
  });

  final String state;
  final int count;
  final String? lga;
  final String? city;
  final String? faculty;
  final String? year;

  factory GeoFact.fromJson(Map<String, dynamic> json) => GeoFact(
        state: asString(json['state'], fallback: 'Unknown'),
        count: asInt(json['count']),
        lga: asStringOrNull(json['lga']),
        city: asStringOrNull(json['city']),
        faculty: asStringOrNull(json['faculty']),
        year: asStringOrNull(json['year']),
      );
}

class StateCluster {
  const StateCluster({
    required this.state,
    required this.count,
    required this.latitude,
    required this.longitude,
  });

  final String state;
  final int count;
  final double latitude;
  final double longitude;

  factory StateCluster.fromJson(Map<String, dynamic> json) => StateCluster(
        state: asString(json['state'], fallback: 'Unknown'),
        count: asInt(json['count']),
        latitude: asDouble(json['latitude']),
        longitude: asDouble(json['longitude']),
      );
}
