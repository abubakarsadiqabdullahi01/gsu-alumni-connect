import 'json_utils.dart';

class AlumniMapData {
  const AlumniMapData({
    required this.points,
    required this.states,
    required this.mappedAlumni,
    required this.statesCovered,
    this.topState,
    this.topStateCount = 0,
  });

  final List<MapPoint> points;
  final List<StateCluster> states;
  final int mappedAlumni;
  final int statesCovered;
  final String? topState;
  final int topStateCount;

  factory AlumniMapData.fromJson(Map<String, dynamic> json) {
    final stats = asMap(json['stats']);
    return AlumniMapData(
      points: asList(json['points']).map(MapPoint.fromJson).toList(),
      states: asList(json['states']).map(StateCluster.fromJson).toList(),
      mappedAlumni: asInt(stats['mappedAlumni']),
      statesCovered: asInt(stats['statesCovered']),
      topState: asStringOrNull(stats['topState']),
      topStateCount: asInt(stats['topStateCount']),
    );
  }
}

class MapPoint {
  const MapPoint({
    required this.latitude,
    required this.longitude,
    required this.fullName,
    this.city,
    this.state,
    this.lga,
    this.courseCode,
    this.facultyCode,
    this.graduationYear,
  });

  final double latitude;
  final double longitude;
  final String fullName;
  final String? city;
  final String? state;
  final String? lga;
  final String? courseCode;
  final String? facultyCode;
  final String? graduationYear;

  factory MapPoint.fromJson(Map<String, dynamic> json) => MapPoint(
        latitude: asDouble(json['latitude']),
        longitude: asDouble(json['longitude']),
        fullName: asString(json['fullName'], fallback: 'Alumnus'),
        city: asStringOrNull(json['city']),
        state: asStringOrNull(json['state']),
        lga: asStringOrNull(json['lga']),
        courseCode: asStringOrNull(json['courseCode']),
        facultyCode: asStringOrNull(json['facultyCode']),
        graduationYear: asStringOrNull(json['graduationYear']),
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
