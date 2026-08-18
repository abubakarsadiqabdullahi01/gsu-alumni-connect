import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/branding/gsu_crest.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/models/id_card.dart';
import '../../data/providers.dart';

class IdCardScreen extends ConsumerStatefulWidget {
  const IdCardScreen({super.key});

  @override
  ConsumerState<IdCardScreen> createState() => _IdCardScreenState();
}

class _IdCardScreenState extends ConsumerState<IdCardScreen> {
  bool _showBack = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = ref.watch(idCardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Alumni ID'),
        actions: [
          IconButton(
            tooltip: 'Reissue card',
            onPressed: () => ref.invalidate(idCardProvider),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: AsyncView<IdCard>(
        value: card,
        onRetry: () => ref.invalidate(idCardProvider),
        loading: const Center(child: CircularProgressIndicator()),
        data: (data) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: GestureDetector(
                  onTap: () => setState(() => _showBack = !_showBack),
                  child: _FlipCard(
                    showBack: _showBack,
                    front: _CardFront(card: data),
                    back: _CardBack(card: data),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: TextButton.icon(
                onPressed: () => setState(() => _showBack = !_showBack),
                icon: const Icon(Icons.flip_camera_android_rounded, size: 18),
                label: Text(_showBack ? 'Show front' : 'Show back and QR'),
              ),
            ),
            const SizedBox(height: 12),
            _SecurityPanel(card: data),
            const SizedBox(height: 16),
            GsuCard(
              padding: const EdgeInsets.all(15),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const IconBadge(
                    Icons.info_outline_rounded,
                    size: 38,
                    color: AppColors.navy600,
                  ),
                  const SizedBox(width: 13),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'How verification works',
                          style: theme.textTheme.titleMedium
                              ?.copyWith(fontSize: 14.5),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Each card is signed by the server with HMAC-SHA256 '
                          'and expires shortly after it is issued. Anyone can '
                          'scan the QR code on the back to confirm the card is '
                          'genuine and unaltered. Pull to reissue if it has '
                          'expired.',
                          style:
                              theme.textTheme.bodySmall?.copyWith(height: 1.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Y-axis flip that swaps faces exactly at the perpendicular, so the reverse
/// face never shows through mirrored.
class _FlipCard extends StatelessWidget {
  const _FlipCard({
    required this.showBack,
    required this.front,
    required this.back,
  });

  final bool showBack;
  final Widget front;
  final Widget back;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: showBack ? 1 : 0),
      duration: const Duration(milliseconds: 560),
      curve: Curves.easeInOutCubic,
      builder: (context, value, _) {
        final angle = value * math.pi;
        final isBackVisible = value > 0.5;

        return Transform(
          alignment: Alignment.center,
          transform: Matrix4.identity()
            ..setEntry(3, 2, 0.0012)
            ..rotateY(angle),
          child: isBackVisible
              ? Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.identity()..rotateY(math.pi),
                  child: back,
                )
              : front,
        );
      },
    );
  }
}

class _CardFront extends StatelessWidget {
  const _CardFront({required this.card});

  final IdCard card;

  @override
  Widget build(BuildContext context) {
    final photo = AppConfig.resolveUrl(card.imageUrl);

    return AspectRatio(
      aspectRatio: 1.62,
      child: Container(
        decoration: BoxDecoration(
          gradient: AppColors.nightGradient,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.28),
              blurRadius: 26,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            const Positioned.fill(
              child: CustomPaint(painter: _GuillochePainter()),
            ),
            Positioned(
              top: -40,
              right: -30,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.gold500.withValues(alpha: 0.09),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const GsuCrest(size: 34, showRibbon: false),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              AppConfig.institution.toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.4,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'ALUMNI IDENTITY CARD',
                              style: TextStyle(
                                color: AppColors.gold400,
                                fontSize: 8.5,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 2,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          gradient: AppColors.goldGradient,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: const Text(
                          'VERIFIED',
                          style: TextStyle(
                            color: AppColors.navy900,
                            fontSize: 7.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 78,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: AppColors.gold500.withValues(alpha: 0.55),
                              width: 1.5,
                            ),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: photo.isEmpty
                              ? Container(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  alignment: Alignment.center,
                                  child: Text(
                                    Fmt.initials(card.fullName),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 26,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                )
                              : CachedNetworkImage(
                                  imageUrl: photo,
                                  fit: BoxFit.cover,
                                  errorWidget: (context, _, __) => Container(
                                    color: Colors.white.withValues(alpha: 0.08),
                                    alignment: Alignment.center,
                                    child: Text(
                                      Fmt.initials(card.fullName),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 26,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                  placeholder: (context, _) => Container(
                                    color: Colors.white.withValues(alpha: 0.06),
                                  ),
                                ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                card.fullName.toUpperCase(),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  height: 1.2,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.3,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                card.alumniNumber,
                                style: const TextStyle(
                                  color: AppColors.gold400,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.1,
                                ),
                              ),
                              const SizedBox(height: 10),
                              _CardField(
                                label: 'DISCIPLINE',
                                value: card.discipline,
                              ),
                              _CardField(
                                label: 'CLASS',
                                value: card.graduationYear,
                              ),
                              _CardField(label: 'RANK', value: card.rank),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'STATE OF ORIGIN',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.45),
                                fontSize: 6.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.1,
                              ),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              card.stateOfOrigin,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 84,
                        height: 1,
                        color: AppColors.gold500.withValues(alpha: 0.6),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      'REGISTRAR',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.45),
                        fontSize: 6.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardField extends StatelessWidget {
  const _CardField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.45),
              fontSize: 6.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _CardBack extends StatelessWidget {
  const _CardBack({required this.card});

  final IdCard card;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1.62,
      child: Container(
        decoration: BoxDecoration(
          gradient: AppColors.nightGradient,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.28),
              blurRadius: 26,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            const Positioned.fill(
              child: CustomPaint(painter: _GuillochePainter()),
            ),
            // Magnetic-stripe motif.
            Positioned(
              top: 18,
              left: 0,
              right: 0,
              child: Container(height: 30, color: Colors.black87),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 62, 16, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: QrImageView(
                      data: card.verificationUrl.isEmpty
                          ? card.alumniNumber
                          : card.verificationUrl,
                      version: QrVersions.auto,
                      size: 92,
                      gapless: true,
                      backgroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'SCAN TO VERIFY',
                          style: TextStyle(
                            color: AppColors.gold400,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.6,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'This card is cryptographically signed. Scanning the '
                          'QR code confirms the holder is a genuine graduate '
                          'of ${AppConfig.institution}.',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.72),
                            fontSize: 8.5,
                            height: 1.5,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          'SIGNATURE',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.45),
                            fontSize: 6.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          card.shortSignature,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.6,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Fine interference lines, the way a security document is engraved. Cheap to
/// draw and impossible to reproduce with a flat colour fill.
class _GuillochePainter extends CustomPainter {
  const _GuillochePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.55
      ..color = Colors.white.withValues(alpha: 0.055);

    for (var i = 0; i < 26; i++) {
      final path = Path();
      final offset = i * (size.height / 13);
      path.moveTo(-size.width * 0.1, offset);
      path.cubicTo(
        size.width * 0.3,
        offset - size.height * 0.22,
        size.width * 0.7,
        offset + size.height * 0.22,
        size.width * 1.1,
        offset,
      );
      canvas.drawPath(path, paint);
    }

    final radial = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5
      ..color = AppColors.gold500.withValues(alpha: 0.07);
    for (var i = 1; i < 9; i++) {
      canvas.drawCircle(
        Offset(size.width * 0.82, size.height * 0.5),
        i * 16.0,
        radial,
      );
    }
  }

  @override
  bool shouldRepaint(_GuillochePainter oldDelegate) => false;
}

class _SecurityPanel extends StatelessWidget {
  const _SecurityPanel({required this.card});

  final IdCard card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final expired = card.isExpired;

    return GsuCard(
      accent: expired ? AppColors.rose500 : AppColors.teal500,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconBadge(
                expired ? Icons.gpp_bad_outlined : Icons.gpp_good_outlined,
                color: expired ? AppColors.rose600 : AppColors.teal600,
                size: 40,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      expired ? 'Card expired' : 'Card is valid',
                      style:
                          theme.textTheme.titleMedium?.copyWith(fontSize: 15),
                    ),
                    Text(
                      expired
                          ? 'Tap refresh above to issue a new signed card.'
                          : 'Signed with HMAC-SHA256 · expires '
                              '${Fmt.time(card.expiresAt)}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 26),
          DetailRow(
            icon: Icons.tag_rounded,
            label: 'Card ID',
            value: card.cardId,
          ),
          DetailRow(
            icon: Icons.fingerprint_rounded,
            label: 'Signature',
            value: card.shortSignature,
          ),
          DetailRow(
            icon: Icons.schedule_rounded,
            label: 'Issued',
            value: Fmt.dateTime(card.issuedAt),
          ),
          if (card.verificationUrl.isNotEmpty)
            DetailRow(
              icon: Icons.link_rounded,
              label: 'Verification link',
              value: 'Tap to copy',
              onTap: () async {
                await Clipboard.setData(
                  ClipboardData(text: card.verificationUrl),
                );
                if (context.mounted) {
                  showAppSnack(context, 'Verification link copied.');
                }
              },
            ),
        ],
      ),
    );
  }
}
