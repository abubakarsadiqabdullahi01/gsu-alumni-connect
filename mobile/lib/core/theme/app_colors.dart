import 'package:flutter/material.dart';

/// Brand tokens.
///
/// The green is the association's, matched to the web app's primary
/// (`oklch(0.508 0.118 165.6)` = #047857) so the two clients read as one
/// product rather than two. Gold is reserved for achievement and verification
/// affordances — it also carries the printed ID card — and teal handles
/// positive/active states so gold never dilutes into ordinary success
/// messaging.
class AppColors {
  const AppColors._();

  static const green900 = Color(0xFF022C22);
  static const green800 = Color(0xFF064E3B);
  static const green700 = Color(0xFF065F46);
  static const green600 = Color(0xFF047857);
  static const green500 = Color(0xFF059669);
  static const green300 = Color(0xFF6EE7B7);
  static const green100 = Color(0xFFD1FAE5);

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
    colors: [green800, green600, teal600],
  );

  static const goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [gold600, gold500, gold400],
  );

  static const nightGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [green900, Color(0xFF053C2C), Color(0xFF07343A)],
  );

  /// Deterministic accent per entity, so the same person or group always shows
  /// the same colour across every screen.
  static const accentCycle = <Color>[
    green600,
    teal500,
    gold600,
    Color(0xFF6D4AA8),
    Color(0xFF0F766E),
    Color(0xFFB4530E),
  ];

  static Color accentFor(String seed) {
    if (seed.isEmpty) return green600;
    var hash = 0;
    for (final unit in seed.codeUnits) {
      hash = (hash * 31 + unit) & 0x7FFFFFFF;
    }
    return accentCycle[hash % accentCycle.length];
  }
}
