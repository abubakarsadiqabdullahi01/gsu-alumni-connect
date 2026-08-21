import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

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

/// Native design size of the card, matching `CARD_WIDTH`/`CARD_HEIGHT` in
/// components/profile/id-card-studio/cardVectors.ts on the web.
///
/// Each face is laid out at exactly these numbers and then scaled to fit, so
/// every position below is the web's own coordinate rather than something
/// re-derived by eye. Change one on the web and the same number changes here.
const double _cardW = 1011;
const double _cardH = 635;

const Color _cardGreen = Color(0xFF1A5C3A);
const Color _cardTeal = Color(0xFF0A9396);
const Color _cardGold = Color(0xFFC9A84C);
const Color _labelGrey = Color(0xFF4B5563);
const Color _valueInk = Color(0xFF333333);
const Color _noteInk = Color(0xFF334155);

const String _frontTemplate = 'assets/images/Front-ID.png';
const String _backTemplate = 'assets/images/Back-ID.png';
const String _fallbackSignature = 'assets/images/Signature.png';
const String _logoAsset = 'assets/images/gsu-alumni-logo.png';

const String _frontMicrotext = 'GSU ALUMNI ASSOCIATION • PRIMUS INTERPARES • '
    'UPLIFTING THE IDEAS OF GSU • AUTHORIZED MEMBER';

/// Scales a face authored at [_cardW]x[_cardH] down to the available width.
///
/// FittedBox, not Transform.scale: Transform does not affect layout, so the
/// inner SizedBox was still constrained by the incoming box and got clamped to
/// the card's on-screen width — then scaled down again, rendering the card at
/// roughly 40% of its intended size. FittedBox hands the child unbounded
/// constraints so it lays out at its true 1011x635 before being scaled to fit,
/// which is what lets the children below use the web's coordinates verbatim.
class _CardFace extends StatelessWidget {
  const _CardFace({required this.template, required this.children});

  final String template;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: _cardW / _cardH,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: FittedBox(
          fit: BoxFit.contain,
          child: SizedBox(
            width: _cardW,
            height: _cardH,
            child: Stack(
              children: [
                // The template carries the crest, headings, motto and
                // guilloche artwork; everything else is overlaid.
                Positioned.fill(
                  child: Image.asset(
                    template,
                    // Matches the web's object-cover. The box is already the
                    // template's own 1011x635, so nothing is actually cropped.
                    fit: BoxFit.cover,
                    filterQuality: FilterQuality.medium,
                  ),
                ),
                ...children,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Small caps label above a value, matching the web card's `DetailField`.
class _DetailField extends StatelessWidget {
  const _DetailField({
    required this.label,
    required this.value,
    required this.left,
    required this.baseline,
    this.width = 300,
    this.accent = false,
  });

  /// All four fields on the card share this size; the web's per-field override
  /// resolves to the same 25 for every one of them.
  static const double _valueFontSize = 25;

  final String label;
  final String value;
  final double left;

  /// The web positions the value on an SVG baseline with
  /// dominantBaseline="middle"; this offsets from the same number.
  final double baseline;
  final double width;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: left,
      top: baseline - 37,
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            style: const TextStyle(
              fontSize: 15,
              height: 1,
              fontWeight: FontWeight.w700,
              color: _labelGrey,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 9),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: _valueFontSize,
              height: 1,
              fontWeight: accent ? FontWeight.w800 : FontWeight.w600,
              color: accent ? _cardTeal : _valueInk,
            ),
          ),
        ],
      ),
    );
  }
}

/// A decorative square outline, as drawn by the web's `cornerSquares`.
class _CornerSquare extends StatelessWidget {
  const _CornerSquare({
    required this.left,
    required this.top,
    required this.size,
    required this.opacity,
  });

  final double left;
  final double top;
  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: left,
      top: top,
      width: size,
      height: size,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(
            color: _cardGreen.withValues(alpha: opacity),
            width: 1.5,
          ),
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}

/// Iridescent disc standing in for the web's `HologramSticker`.
class _Hologram extends StatelessWidget {
  const _Hologram({
    required this.centreX,
    required this.centreY,
    required this.radius,
  });

  final double centreX;
  final double centreY;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: centreX - radius,
      top: centreY - radius,
      width: radius * 2,
      height: radius * 2,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: SweepGradient(
            colors: [
              _cardTeal.withValues(alpha: 0.55),
              _cardGold.withValues(alpha: 0.55),
              const Color(0xFF6D4AA8).withValues(alpha: 0.5),
              _cardGreen.withValues(alpha: 0.55),
              _cardTeal.withValues(alpha: 0.55),
            ],
          ),
          border: Border.all(color: Colors.white.withValues(alpha: 0.6)),
        ),
        child: Center(
          child: Icon(
            Icons.star_rounded,
            size: radius * 0.9,
            color: Colors.white.withValues(alpha: 0.85),
          ),
        ),
      ),
    );
  }
}

/// Gold contact pad, standing in for the web's `SmartChip`.
class _SmartChip extends StatelessWidget {
  const _SmartChip({
    required this.left,
    required this.top,
    required this.width,
    required this.height,
  });

  final double left;
  final double top;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: left,
      top: top,
      width: width,
      height: height,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(6),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFE8D28A), _cardGold, Color(0xFFA8862F)],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            for (var i = 0; i < 4; i++)
              Container(
                height: 1.4,
                margin: const EdgeInsets.symmetric(horizontal: 10),
                color: const Color(0xFF8A6D22).withValues(alpha: 0.7),
              ),
          ],
        ),
      ),
    );
  }
}

/// Photo, signature and template images may be bundled assets or remote URLs.
///
/// [fit] matters per call site: the photo fills a circle and wants `cover`,
/// while a signature is a wide transparent strip and must be `contain` — cover
/// on a 230x60 box crops roughly half the height off a portrait-ish signature,
/// taking the ascenders and descenders with it.
Widget _cardImage(
  String? url, {
  required String fallbackAsset,
  BoxFit fit = BoxFit.cover,
}) {
  final resolved = AppConfig.resolveUrl(url);
  if (resolved.isEmpty) {
    return Image.asset(fallbackAsset, fit: fit);
  }
  return CachedNetworkImage(
    imageUrl: resolved,
    fit: fit,
    errorWidget: (context, _, __) => Image.asset(fallbackAsset, fit: fit),
    placeholder: (context, _) => const ColoredBox(color: Color(0xFFE7ECE8)),
  );
}

class _CardFront extends StatelessWidget {
  const _CardFront({required this.card});

  final IdCard card;

  // cardVectors.front.photo*
  static const double _photoX = 93;
  static const double _photoY = 295;
  static const double _photoR = 105;

  @override
  Widget build(BuildContext context) {
    const photoDiameter = _photoR * 2;
    final qrData =
        card.verificationUrl.isEmpty ? card.alumniNumber : card.verificationUrl;

    return _CardFace(
      template: _frontTemplate,
      children: [
        // Top spectrum bar.
        const Positioned(
          left: 0,
          top: 0,
          width: _cardW,
          height: 18,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  _cardGreen,
                  Color(0xFF2E7D52),
                  _cardTeal,
                  Color(0xFF2E7D52),
                  _cardGreen,
                ],
                stops: [0, 0.3, 0.5, 0.7, 1],
              ),
            ),
          ),
        ),

        // Outer gold ring, then the green bezel, then the photo itself.
        Positioned(
          left: _photoX - 7,
          top: _photoY - 7,
          width: photoDiameter + 14,
          height: photoDiameter + 14,
          child: DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: _cardGold.withValues(alpha: 0.6),
              ),
            ),
          ),
        ),
        Positioned(
          left: _photoX - 2,
          top: _photoY - 2,
          width: photoDiameter + 4,
          height: photoDiameter + 4,
          child: const DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.fromBorderSide(
                BorderSide(color: _cardGreen, width: 3),
              ),
            ),
          ),
        ),
        Positioned(
          left: _photoX,
          top: _photoY,
          width: photoDiameter,
          height: photoDiameter,
          child: ClipOval(
            // Falls back to the association mark rather than a broken frame,
            // so a card with no uploaded photo still prints presentably.
            child: ColoredBox(
              color: const Color(0xFFE7ECE8),
              child: _cardImage(card.imageUrl, fallbackAsset: _logoAsset),
            ),
          ),
        ),

        _SmartChip(left: 870, top: 270, width: 75, height: 55),

        // cardVectors.front.fullName — squeezed rather than clipped, matching
        // the web's textLength/lengthAdjust.
        Positioned(
          left: 390,
          top: 276,
          width: 390,
          height: 46,
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              card.fullName.toUpperCase(),
              maxLines: 1,
              style: const TextStyle(
                fontSize: 33,
                height: 1,
                fontWeight: FontWeight.w700,
                color: _cardGreen,
              ),
            ),
          ),
        ),

        _DetailField(
          label: 'MEMBERSHIP NUMBER',
          // Printed form, not the raw registration number the API sends.
          value: card.membershipNumber,
          left: 335,
          baseline: 382,
          width: 340,
          accent: true,
        ),
        _DetailField(
          label: 'YEAR OF GRADUATION',
          value: card.graduationYear,
          left: 700,
          baseline: 382,
          width: 290,
        ),
        _DetailField(
          label: 'DISCIPLINE',
          value: card.discipline,
          left: 335,
          baseline: 478,
          width: 340,
        ),
        _DetailField(
          label: 'GENDER',
          value: card.gender,
          left: 700,
          baseline: 478,
          width: 190,
        ),

        _Hologram(centreX: 550, centreY: 558, radius: 35),

        // cardVectors.front.qr*
        Positioned(
          left: 800,
          top: 420,
          width: 140,
          height: 140,
          child: QrImageView(
            data: qrData,
            version: QrVersions.auto,
            size: 140,
            gapless: true,
            padding: EdgeInsets.zero,
            backgroundColor: Colors.white,
            eyeStyle: const QrEyeStyle(
              eyeShape: QrEyeShape.square,
              color: _cardGreen,
            ),
            dataModuleStyle: const QrDataModuleStyle(
              dataModuleShape: QrDataModuleShape.square,
              color: _cardGreen,
            ),
          ),
        ),

        // cardVectors.front.cardholderSig
        Positioned(
          left: 90,
          top: 520,
          width: 230,
          height: 60,
          child: _cardImage(
            card.signatureUrl,
            fallbackAsset: _fallbackSignature,
            fit: BoxFit.contain,
          ),
        ),
        const Positioned(
          left: 90,
          top: 580,
          width: 230,
          height: 0.9,
          child: ColoredBox(color: _cardGreen),
        ),
        const Positioned(
          left: 90,
          top: 588,
          width: 230,
          child: Text(
            "HOLDER'S SIGNATURE",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 8,
              height: 1,
              color: Color(0xFF6B7280),
              letterSpacing: 1.5,
            ),
          ),
        ),

        for (final square in const [
          [40.0, 480.0, 14.0, 0.45],
          [68.0, 480.0, 10.0, 0.6],
          [40.0, 500.0, 10.0, 0.45],
          [960.0, 480.0, 14.0, 0.6],
          [946.0, 480.0, 10.0, 0.45],
          [960.0, 500.0, 10.0, 0.6],
        ])
          _CornerSquare(
            left: square[0],
            top: square[1],
            size: square[2],
            opacity: square[3],
          ),

        // Footer strip and its microprint.
        Positioned(
          left: 0,
          top: _cardH - 24,
          width: _cardW,
          height: 24,
          child: const ColoredBox(
            color: _cardGreen,
            child: Center(
              child: Text(
                _frontMicrotext,
                maxLines: 1,
                style: TextStyle(
                  fontSize: 7,
                  height: 1,
                  fontFamily: 'monospace',
                  letterSpacing: 3,
                  color: Color(0x8CFFFFFF),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CardBack extends StatelessWidget {
  const _CardBack({required this.card});

  final IdCard card;

  // cardVectors.back.noteBlock — baselines 308, 363, 398, 433.
  static const double _noteX = 120;

  @override
  Widget build(BuildContext context) {
    return _CardFace(
      template: _backTemplate,
      children: [
        const Positioned(
          left: _noteX,
          top: 290,
          width: 800,
          child: Text(
            'Emergency NOK: 08131381023',
            style: TextStyle(
              fontSize: 23,
              height: 1,
              fontWeight: FontWeight.w800,
              color: _noteInk,
            ),
          ),
        ),
        const Positioned(
          left: _noteX,
          top: 350,
          width: 800,
          child: Text(
            'This card is personal and non-transferable. '
            'Alteration, erasure, or misuse renders it invalid.',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 17,
              height: 1,
              fontWeight: FontWeight.w700,
              color: _noteInk,
            ),
          ),
        ),
        const Positioned(
          left: _noteX,
          top: 385,
          width: 800,
          child: Text(
            'Loss should be reported immediately to '
            'GSU Alumni National Secretariat:',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 17,
              height: 1,
              fontWeight: FontWeight.w600,
              color: _noteInk,
            ),
          ),
        ),
        const Positioned(
          left: _noteX,
          top: 420,
          width: 800,
          child: Text(
            '08163667912, 08052495302, or nearest Police Station.',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 17,
              height: 1,
              fontWeight: FontWeight.w700,
              color: _noteInk,
            ),
          ),
        ),

        // cardVectors.back.stateOfOrigin
        const Positioned(
          left: 310,
          top: 529,
          width: 260,
          child: Text(
            'STATE OF ORIGIN',
            style: TextStyle(
              fontSize: 9,
              height: 1,
              color: Color(0xFF8A8A8A),
              letterSpacing: 1.8,
            ),
          ),
        ),
        Positioned(
          left: 310,
          top: 542,
          width: 260,
          child: Text(
            card.stateOfOrigin,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 15,
              height: 1,
              fontWeight: FontWeight.w600,
              color: _valueInk,
            ),
          ),
        ),

        _Hologram(centreX: 500, centreY: 530, radius: 30),

        // cardVectors.back.sigText — the serial, centred on x 510.
        Positioned(
          left: 110,
          top: 598,
          width: 800,
          child: Text(
            card.serialNumber,
            textAlign: TextAlign.center,
            maxLines: 1,
            style: const TextStyle(
              fontSize: 13,
              height: 1,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F5132),
              letterSpacing: 2,
            ),
          ),
        ),

        for (final square in const [
          [100.0, 35.0, 14.0],
          [138.0, 55.0, 10.0],
          [140.0, 85.0, 14.0],
          [80.0, 55.0, 10.0],
        ])
          _CornerSquare(
            left: square[0],
            top: square[1],
            size: square[2],
            opacity: 0.4,
          ),
      ],
    );
  }
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
