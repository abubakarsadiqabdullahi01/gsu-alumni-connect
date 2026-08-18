import 'package:flutter/material.dart';

/// Brand tokens.
///
/// Deep academic navy carries the institutional weight, gold is reserved for
/// achievement/verification affordances, and teal handles positive/active
/// states so gold never gets diluted into ordinary success messaging.
class AppColors {
  const AppColors._();

  static const navy900 = Color(0xFF06182F);
  static const navy800 = Color(0xFF0A2245);
  static const navy700 = Color(0xFF0E2E5C);
  static const navy600 = Color(0xFF143C74);
  static const navy500 = Color(0xFF1D5090);
  static const navy300 = Color(0xFF6E93C4);
  static const navy100 = Color(0xFFDCE7F6);

  static const gold600 = Color(0xFFA5801F);
  static const gold500 = Color(0xFFC8A34A);
  static const gold400 = Color(0xFFDFC078);
  static const gold100 = Color(0xFFF7EDD5);

  static const teal600 = Color(0xFF0B6F71);
  static const teal500 = Color(0xFF0F8B8D);
  static const teal100 = Color(0xFFD6F0F0);

  static const rose600 = Color(0xFFB3261E);
  static const rose500 = Color(0xFFDC3545);
  static const rose100 = Color(0xFFFBE3E4);

  static const amber600 = Color(0xFFB4690E);
  static const amber100 = Color(0xFFFBEBD2);

  static const ink900 = Color(0xFF0B1220);
  static const ink700 = Color(0xFF334155);
  static const ink500 = Color(0xFF64748B);
  static const ink300 = Color(0xFFCBD5E1);
  static const ink100 = Color(0xFFF1F5F9);

  static const canvasLight = Color(0xFFF6F8FC);
  static const surfaceLight = Color(0xFFFFFFFF);
  static const canvasDark = Color(0xFF070D18);
  static const surfaceDark = Color(0xFF111A2B);

  /// The signature header treatment used on the dashboard and ID card.
  static const brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [navy800, navy600, teal600],
  );

  static const goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [gold600, gold500, gold400],
  );

  static const nightGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [navy900, Color(0xFF0C2137), Color(0xFF07343A)],
  );

  /// Deterministic accent per entity, so the same person or group always shows
  /// the same colour across every screen.
  static const accentCycle = <Color>[
    navy600,
    teal500,
    gold600,
    Color(0xFF6D4AA8),
    Color(0xFF0F766E),
    Color(0xFFB4530E),
  ];

  static Color accentFor(String seed) {
    if (seed.isEmpty) return navy600;
    var hash = 0;
    for (final unit in seed.codeUnits) {
      hash = (hash * 31 + unit) & 0x7FFFFFFF;
    }
    return accentCycle[hash % accentCycle.length];
  }
}
