/// Defensive JSON readers.
///
/// The API returns Prisma output directly, so nullable columns arrive as null
/// and numeric columns can arrive as int, double or string depending on the
/// column type (Decimal serialises as a string). These helpers absorb that
/// instead of scattering casts through every model.
Map<String, dynamic> asMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

List<Map<String, dynamic>> asList(Object? value) {
  if (value is! List) return const [];
  return value.whereType<Object>().map(asMap).toList();
}

/// For plain string arrays such as filter option lists. Nulls and blanks are
/// dropped rather than surfacing as empty chips in a dropdown.
List<String> asStringList(Object? value) {
  if (value is! List) return const [];
  return value.map(asStringOrNull).whereType<String>().toList();
}

String asString(Object? value, {String fallback = ''}) {
  if (value == null) return fallback;
  final text = value.toString().trim();
  return text.isEmpty ? fallback : text;
}

String? asStringOrNull(Object? value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

int asInt(Object? value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

int? asIntOrNull(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value);
  return null;
}

double asDouble(Object? value, {double fallback = 0}) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

double? asDoubleOrNull(Object? value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

bool asBool(Object? value, {bool fallback = false}) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final text = value.toLowerCase();
    if (text == 'true') return true;
    if (text == 'false') return false;
  }
  return fallback;
}

DateTime? asDate(Object? value) {
  if (value == null) return null;
  if (value is DateTime) return value.toLocal();
  return DateTime.tryParse(value.toString())?.toLocal();
}
