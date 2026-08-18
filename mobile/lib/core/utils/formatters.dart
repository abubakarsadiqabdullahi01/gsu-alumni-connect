/// Small, dependency-free formatting helpers.
///
/// Hand-rolled rather than pulling `intl`, because the app only needs English
/// and a fixed set of shapes — and this keeps the dependency graph aligned with
/// whatever `intl` version the Flutter SDK pins.
class Fmt {
  const Fmt._();

  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  static const _weekdays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ];

  static DateTime? parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.tryParse(value.toString())?.toLocal();
  }

  /// `12 Aug 2026`
  static String date(Object? value) {
    final date = parseDate(value);
    if (date == null) return '—';
    return '${date.day} ${_months[date.month - 1]} ${date.year}';
  }

  /// `Wed, 12 Aug · 4:30 PM`
  static String dateTime(Object? value) {
    final date = parseDate(value);
    if (date == null) return '—';
    return '${_weekdays[date.weekday - 1]}, ${date.day} ${_months[date.month - 1]}'
        ' · ${time(date)}';
  }

  /// `4:30 PM`
  static String time(Object? value) {
    final date = parseDate(value);
    if (date == null) return '—';
    final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    return '$hour:$minute ${date.hour < 12 ? 'AM' : 'PM'}';
  }

  /// `just now`, `4m`, `3h`, `2d`, then falls back to an absolute date.
  static String relative(Object? value) {
    final date = parseDate(value);
    if (date == null) return '';
    final diff = DateTime.now().difference(date);

    if (diff.isNegative) {
      final ahead = date.difference(DateTime.now());
      if (ahead.inMinutes < 60) return 'in ${ahead.inMinutes}m';
      if (ahead.inHours < 24) return 'in ${ahead.inHours}h';
      if (ahead.inDays < 7) return 'in ${ahead.inDays}d';
      return Fmt.date(date);
    }

    if (diff.inSeconds < 45) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    if (diff.inDays < 365) return '${(diff.inDays / 7).floor()}w ago';
    return Fmt.date(date);
  }

  /// `1,240`
  static String number(num? value) {
    if (value == null) return '0';
    final text = value.round().abs().toString();
    final buffer = StringBuffer(value.isNegative ? '-' : '');
    for (var i = 0; i < text.length; i++) {
      if (i > 0 && (text.length - i) % 3 == 0) buffer.write(',');
      buffer.write(text[i]);
    }
    return buffer.toString();
  }

  /// `1.2k`, `3.4M` — for tight metric tiles.
  static String compact(num? value) {
    final v = value ?? 0;
    if (v.abs() >= 1000000) {
      return '${(v / 1000000).toStringAsFixed(v.abs() >= 10000000 ? 0 : 1)}M';
    }
    if (v.abs() >= 1000) {
      return '${(v / 1000).toStringAsFixed(v.abs() >= 10000 ? 0 : 1)}k';
    }
    return v.round().toString();
  }

  /// `₦450,000 – ₦700,000`
  static String salaryRange({
    num? min,
    num? max,
    String currency = 'NGN',
  }) {
    final symbol = switch (currency.toUpperCase()) {
      'NGN' => '₦',
      'USD' => r'$',
      'GBP' => '£',
      'EUR' => '€',
      _ => '$currency ',
    };
    if (min == null && max == null) return 'Salary not disclosed';
    if (min != null && max != null) {
      return '$symbol${number(min)} – $symbol${number(max)}';
    }
    return '$symbol${number(min ?? max)}';
  }

  /// `FULL_TIME` → `Full time`
  static String enumLabel(String? value) {
    if (value == null || value.isEmpty) return '';
    final words = value.toLowerCase().split('_').where((w) => w.isNotEmpty);
    if (words.isEmpty) return '';
    final first = words.first;
    return [
      first[0].toUpperCase() + first.substring(1),
      ...words.skip(1),
    ].join(' ');
  }

  /// `Abubakar Sadiq Abdullahi` → `AS`
  static String initials(String? name) {
    final parts = (name ?? '')
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    return (parts.first.substring(0, 1) + parts[1].substring(0, 1))
        .toUpperCase();
  }
}
