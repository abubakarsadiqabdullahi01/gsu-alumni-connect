import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// The app mark, drawn as vectors rather than shipped as a bitmap.
///
/// Everything scales cleanly to any density, tints itself for light/dark, and
/// adds no asset weight — which matters because this mark also gets rendered
/// large on the splash, the ID card and the sign-in screen.
class GsuCrest extends StatelessWidget {
  const GsuCrest({
    super.key,
    this.size = 72,
    this.shieldGradient,
    this.emblemColor = AppColors.gold500,
    this.showRibbon = true,
  });

  final double size;
  final Gradient? shieldGradient;
  final Color emblemColor;
  final bool showRibbon;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size * 1.12,
      // The association's actual mark, the same file the web portal's sidebar
      // uses. The painted crest is kept as the fallback so the brand degrades
      // to a drawn shield rather than a broken-image box if the asset is ever
      // missing from a build.
      child: Image.asset(
        'assets/images/gsu-alumni-logo.png',
        fit: BoxFit.contain,
        filterQuality: FilterQuality.medium,
        errorBuilder: (context, error, stackTrace) => CustomPaint(
          painter: _CrestPainter(
            gradient: shieldGradient ?? AppColors.brandGradient,
            emblem: emblemColor,
            showRibbon: showRibbon,
          ),
        ),
      ),
    );
  }
}

class _CrestPainter extends CustomPainter {
  _CrestPainter({
    required this.gradient,
    required this.emblem,
    required this.showRibbon,
  });

  final Gradient gradient;
  final Color emblem;
  final bool showRibbon;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final shield = _shieldPath(w, h);
    final rect = Rect.fromLTWH(0, 0, w, h);

    canvas.drawShadow(
        shield, Colors.black.withValues(alpha: 0.4), w * 0.06, false);
    canvas.drawPath(shield, Paint()..shader = gradient.createShader(rect));

    // Inner bevel keeps the mark from reading flat at large sizes.
    canvas.save();
    canvas.clipPath(shield);
    canvas.drawPath(
      shield,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = w * 0.045
        ..color = Colors.white.withValues(alpha: 0.16),
    );
    canvas.drawCircle(
      Offset(w * 0.22, h * 0.16),
      w * 0.42,
      Paint()..color = Colors.white.withValues(alpha: 0.07),
    );
    canvas.restore();

    // Gold rule under the emblem.
    final rulePaint = Paint()
      ..color = emblem.withValues(alpha: 0.85)
      ..strokeWidth = w * 0.022
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(w * 0.30, h * 0.615),
      Offset(w * 0.70, h * 0.615),
      rulePaint,
    );

    _paintMortarboard(canvas, w, h);
    if (showRibbon) _paintLaurel(canvas, w, h);
  }

  Path _shieldPath(double w, double h) {
    return Path()
      ..moveTo(w * 0.5, h * 0.02)
      ..lineTo(w * 0.955, h * 0.185)
      ..lineTo(w * 0.955, h * 0.575)
      ..cubicTo(w * 0.955, h * 0.80, w * 0.775, h * 0.925, w * 0.5, h * 0.985)
      ..cubicTo(w * 0.225, h * 0.925, w * 0.045, h * 0.80, w * 0.045, h * 0.575)
      ..lineTo(w * 0.045, h * 0.185)
      ..close();
  }

  void _paintMortarboard(Canvas canvas, double w, double h) {
    final cx = w * 0.5;
    final cy = h * 0.40;
    final span = w * 0.30;

    final board = Path()
      ..moveTo(cx, cy - span * 0.46)
      ..lineTo(cx + span, cy)
      ..lineTo(cx, cy + span * 0.46)
      ..lineTo(cx - span, cy)
      ..close();

    canvas.drawPath(board, Paint()..color = emblem);

    // Cap body sitting under the board.
    final body = Path()
      ..moveTo(cx - span * 0.52, cy + span * 0.16)
      ..lineTo(cx - span * 0.52, cy + span * 0.52)
      ..quadraticBezierTo(
          cx, cy + span * 0.95, cx + span * 0.52, cy + span * 0.52)
      ..lineTo(cx + span * 0.52, cy + span * 0.16)
      ..lineTo(cx, cy + span * 0.50)
      ..close();
    canvas.drawPath(body, Paint()..color = emblem.withValues(alpha: 0.72));

    // Tassel.
    final tasselPaint = Paint()
      ..color = emblem
      ..strokeWidth = w * 0.017
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final tassel = Path()
      ..moveTo(cx + span, cy)
      ..quadraticBezierTo(
        cx + span * 1.12,
        cy + span * 0.42,
        cx + span * 0.92,
        cy + span * 0.78,
      );
    canvas.drawPath(tassel, tasselPaint);
    canvas.drawCircle(
      Offset(cx + span * 0.92, cy + span * 0.86),
      w * 0.026,
      Paint()..color = emblem,
    );
  }

  void _paintLaurel(Canvas canvas, double w, double h) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.014
      ..strokeCap = StrokeCap.round;

    for (final direction in [-1.0, 1.0]) {
      final path = Path()
        ..moveTo(w * (0.5 + direction * 0.16), h * 0.70)
        ..quadraticBezierTo(
          w * (0.5 + direction * 0.30),
          h * 0.755,
          w * (0.5 + direction * 0.22),
          h * 0.855,
        );
      canvas.drawPath(path, paint);

      for (var i = 0; i < 3; i++) {
        final t = 0.30 + i * 0.24;
        final cx = w * (0.5 + direction * (0.19 + t * 0.09));
        final cy = h * (0.725 + t * 0.10);
        canvas.save();
        canvas.translate(cx, cy);
        canvas.rotate(direction * (math.pi / 5));
        canvas.drawOval(
          Rect.fromCenter(
              center: Offset.zero, width: w * 0.075, height: w * 0.032),
          Paint()..color = Colors.white.withValues(alpha: 0.5),
        );
        canvas.restore();
      }
    }
  }

  @override
  bool shouldRepaint(_CrestPainter oldDelegate) =>
      oldDelegate.gradient != gradient ||
      oldDelegate.emblem != emblem ||
      oldDelegate.showRibbon != showRibbon;
}

/// Horizontal lockup: crest + wordmark. Used in app bars and the sign-in header.
class GsuWordmark extends StatelessWidget {
  const GsuWordmark({
    super.key,
    this.crestSize = 34,
    this.onDark = false,
    this.subtitle = 'Alumni Connect',
  });

  final double crestSize;
  final bool onDark;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = onDark ? Colors.white : theme.colorScheme.onSurface;
    final mutedColor = onDark
        ? Colors.white.withValues(alpha: 0.72)
        : theme.colorScheme.onSurfaceVariant;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GsuCrest(
          size: crestSize,
          showRibbon: false,
          shieldGradient:
              onDark ? AppColors.goldGradient : AppColors.brandGradient,
          emblemColor: onDark ? AppColors.navy800 : AppColors.gold500,
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'GSU',
              style: theme.textTheme.titleLarge?.copyWith(
                color: primaryColor,
                letterSpacing: 2,
                height: 1.05,
              ),
            ),
            Text(
              subtitle,
              style: theme.textTheme.labelSmall?.copyWith(
                color: mutedColor,
                letterSpacing: 1.4,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
