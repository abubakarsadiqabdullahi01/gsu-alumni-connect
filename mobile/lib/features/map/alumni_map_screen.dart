import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/models/alumni_map.dart';
import '../../data/providers.dart';

/// Nigeria's bounding box, in degrees.
///
/// The host AspectRatio and the projection both derive from this single source,
/// so the canvas can no longer letterbox the outline: a hard-coded 1.08 against
/// a 1.22 bounding box was leaving a band of dead space above and below.
const double _minLon = 2.6;
const double _maxLon = 14.8;
const double _minLat = 4.0;
const double _maxLat = 14.0;
const double _mapAspect = (_maxLon - _minLon) / (_maxLat - _minLat);

/// Simplified national outline, in (longitude, latitude).
///
/// This is a low-resolution cartographic backdrop for the bubble overlay, not a
/// survey boundary — it exists so the distribution reads as a map rather than a
/// scatter plot, and it needs no tile server, API key or licence.
const _nigeriaOutline = <Offset>[
  Offset(3.62, 13.48),
  Offset(4.60, 13.72),
  Offset(5.55, 13.88),
  Offset(6.82, 13.62),
  Offset(7.80, 13.34),
  Offset(9.10, 12.98),
  Offset(10.60, 13.28),
  Offset(11.90, 13.42),
  Offset(13.10, 13.55),
  Offset(14.05, 13.10),
  Offset(14.62, 12.42),
  Offset(14.20, 11.60),
  Offset(13.72, 10.92),
  Offset(13.28, 10.15),
  Offset(12.86, 9.42),
  Offset(12.24, 8.62),
  Offset(11.55, 7.62),
  Offset(10.62, 7.00),
  Offset(9.88, 6.55),
  Offset(9.32, 6.20),
  Offset(8.90, 5.62),
  Offset(8.85, 4.82),
  Offset(8.32, 4.52),
  Offset(7.55, 4.42),
  Offset(6.72, 4.32),
  Offset(6.02, 4.28),
  Offset(5.42, 4.58),
  Offset(4.85, 5.92),
  Offset(4.20, 6.28),
  Offset(3.42, 6.38),
  Offset(2.72, 6.32),
  Offset(2.75, 7.42),
  Offset(2.72, 8.42),
  Offset(3.32, 9.32),
  Offset(3.62, 10.20),
  Offset(3.55, 11.20),
  Offset(3.72, 11.92),
  Offset(4.12, 12.62),
  Offset(3.85, 13.10),
];

class AlumniMapScreen extends ConsumerStatefulWidget {
  const AlumniMapScreen({super.key});

  @override
  ConsumerState<AlumniMapScreen> createState() => _AlumniMapScreenState();
}

class _AlumniMapScreenState extends ConsumerState<AlumniMapScreen> {
  StateCluster? _selected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final map = ref.watch(alumniMapProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Alumni Map')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(alumniMapProvider);
          await ref.read(alumniMapProvider.future);
        },
        child: AsyncView<AlumniMapData>(
          value: map,
          onRetry: () => ref.invalidate(alumniMapProvider),
          data: (data) {
            if (data.states.isEmpty) {
              return ListView(
                children: const [
                  EmptyState(
                    icon: Icons.public_off_rounded,
                    title: 'No location data yet',
                    message:
                        'Alumni appear on the map once their state of origin '
                        'or current location is on file.',
                  ),
                ],
              );
            }

            // Everything below reads from the merged list, including maxCount:
            // merging changes the leader's total, so sizing bubbles off the
            // server's pre-merge first entry would misscale every bubble.
            final states = mergeClustersByPosition(data.states);
            final maxCount = states.first.count;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: StatTile(
                        label: 'Mapped alumni',
                        value: Fmt.compact(data.mappedAlumni),
                        icon: Icons.person_pin_circle_outlined,
                        tone: AppColors.teal600,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StatTile(
                        label: 'States covered',
                        // states.length, not data.statesCovered: merging
                        // duplicate spellings lowers the drawn count, and this
                        // tile has to agree with the map beside it.
                        value: '${states.length}',
                        icon: Icons.map_outlined,
                        tone: AppColors.navy600,
                        caption: 'Top: ${states.first.state}',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const SectionHeader(
                  title: 'Distribution across Nigeria',
                  subtitle:
                      'Bubble size reflects alumni density — tap to focus',
                  icon: Icons.public_rounded,
                ),
                GsuCard(
                  padding: const EdgeInsets.all(10),
                  child: AspectRatio(
                    aspectRatio: _mapAspect,
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        return GestureDetector(
                          onTapUp: (details) {
                            final hit = _hitTest(
                              details.localPosition,
                              Size(constraints.maxWidth, constraints.maxHeight),
                              states,
                              maxCount,
                            );
                            setState(() => _selected = hit);
                          },
                          child: CustomPaint(
                            painter: _AlumniMapPainter(
                              states: states,
                              maxCount: maxCount,
                              selected: _selected,
                              landColor: theme.brightness == Brightness.dark
                                  ? const Color(0xFF16233A)
                                  : const Color(0xFFE7EEF8),
                              borderColor: theme.colorScheme.outline,
                              labelColor: theme.colorScheme.onSurface,
                            ),
                            size: Size.infinite,
                          ),
                        );
                      },
                    ),
                  ),
                ),
                if (_selected != null) ...[
                  const SizedBox(height: 12),
                  GsuCard(
                    accent: AppColors.teal500,
                    child: Row(
                      children: [
                        const IconBadge(
                          Icons.place_rounded,
                          color: AppColors.teal600,
                          size: 42,
                        ),
                        const SizedBox(width: 13),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _selected!.state,
                                style: theme.textTheme.titleMedium,
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '${Fmt.number(_selected!.count)} alumni · '
                                '${(_selected!.count / data.mappedAlumni * 100).toStringAsFixed(1)}% '
                                'of the mapped network',
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => setState(() => _selected = null),
                          icon: const Icon(Icons.close_rounded, size: 19),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 22),
                const SectionHeader(
                  title: 'Top states',
                  icon: Icons.leaderboard_outlined,
                ),
                GsuCard(
                  child: Column(
                    children: [
                      for (var i = 0; i < math.min(10, states.length); i++)
                        Padding(
                          padding: EdgeInsets.only(
                            bottom: i == math.min(10, states.length) - 1
                                ? 0
                                : 14,
                          ),
                          child: _StateRow(
                            rank: i + 1,
                            cluster: states[i],
                            maxCount: maxCount,
                            selected: _selected?.state == states[i].state,
                            onTap: () => setState(
                              () => _selected =
                                  _selected?.state == states[i].state
                                      ? null
                                      : states[i],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  StateCluster? _hitTest(
    Offset position,
    Size size,
    List<StateCluster> states,
    int maxCount,
  ) {
    final projection = _Projection(size);
    StateCluster? best;
    var bestDistance = double.infinity;

    for (final cluster in states) {
      final centre = projection.project(cluster.longitude, cluster.latitude);
      final radius = _bubbleRadius(cluster.count, maxCount, size);
      final distance = (position - centre).distance;
      if (distance <= radius + 10 && distance < bestDistance) {
        best = cluster;
        bestDistance = distance;
      }
    }
    return best;
  }
}

double _bubbleRadius(int count, int maxCount, Size size) {
  final scale = size.shortestSide / 320;
  // Area-proportional sizing; radius scales with the square root of the count
  // so a state with 4x the alumni draws a bubble 2x as wide, not 4x.
  final ratio = maxCount <= 0 ? 0.0 : count / maxCount;
  return (6 + math.sqrt(ratio) * 26) * scale;
}

/// Equirectangular projection fitted to Nigeria's bounding box.
class _Projection {
  _Projection(this.size) {
    const spanLon = _maxLon - _minLon;
    const spanLat = _maxLat - _minLat;

    // Preserve aspect so the outline is not stretched. With the host now on
    // _mapAspect this is an exact fit rather than a letterbox.
    final scale = math.min(size.width / spanLon, size.height / spanLat);
    _scale = scale;
    _offsetX = (size.width - spanLon * scale) / 2;
    _offsetY = (size.height - spanLat * scale) / 2;
  }

  final Size size;
  late final double _scale;
  late final double _offsetX;
  late final double _offsetY;

  Offset project(double longitude, double latitude) {
    return Offset(
      _offsetX + (longitude - _minLon) * _scale,
      _offsetY + (_maxLat - latitude) * _scale,
    );
  }
}

/// Merges clusters that land on the same point.
///
/// The API can return several spellings of one state — "GOMBE", "Gombe", "GOM" —
/// and every one resolves to the same centroid. Painting them all stacked
/// concentric bubbles and overprinted their labels at a single position, which
/// is what made the map look broken. Counts are summed; the label keeps the
/// most readable spelling rather than the highest-counted one, so a row reads
/// "Gombe 40" and not "GOMBE 40".
///
/// This stays useful after the server-side canonicalisation ships: it is the
/// client's own guarantee that two bubbles never occupy one pixel.
List<StateCluster> mergeClustersByPosition(List<StateCluster> states) {
  String betterName(String a, String b) {
    final aHasLower = a != a.toUpperCase();
    final bHasLower = b != b.toUpperCase();
    if (aHasLower != bHasLower) return aHasLower ? a : b;
    return b.length > a.length ? b : a;
  }

  final merged = <String, StateCluster>{};
  for (final cluster in states) {
    // Three decimals is ~100m — far below the distance between two real state
    // centroids, so this only ever collapses genuine duplicates.
    final key = '${cluster.latitude.toStringAsFixed(3)},'
        '${cluster.longitude.toStringAsFixed(3)}';
    final existing = merged[key];
    merged[key] = existing == null
        ? cluster
        : StateCluster(
            state: betterName(existing.state, cluster.state),
            count: existing.count + cluster.count,
            latitude: existing.latitude,
            longitude: existing.longitude,
          );
  }

  final result = merged.values.toList()
    ..sort((a, b) => b.count.compareTo(a.count));
  return result;
}

class _AlumniMapPainter extends CustomPainter {
  const _AlumniMapPainter({
    required this.states,
    required this.maxCount,
    required this.selected,
    required this.landColor,
    required this.borderColor,
    required this.labelColor,
  });

  final List<StateCluster> states;
  final int maxCount;
  final StateCluster? selected;
  final Color landColor;
  final Color borderColor;
  final Color labelColor;

  @override
  void paint(Canvas canvas, Size size) {
    final projection = _Projection(size);

    final landPath = Path();
    for (var i = 0; i < _nigeriaOutline.length; i++) {
      final point = _nigeriaOutline[i];
      final projected = projection.project(point.dx, point.dy);
      if (i == 0) {
        landPath.moveTo(projected.dx, projected.dy);
      } else {
        landPath.lineTo(projected.dx, projected.dy);
      }
    }
    landPath.close();

    canvas.drawPath(landPath, Paint()..color = landColor);
    canvas.drawPath(
      landPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4
        ..color = borderColor,
    );

    // Bubbles, largest first so small ones stay clickable on top.
    final ordered = [...states]..sort((a, b) => b.count.compareTo(a.count));
    for (final cluster in ordered) {
      final centre = projection.project(cluster.longitude, cluster.latitude);
      final radius = _bubbleRadius(cluster.count, maxCount, size);
      final isSelected = selected?.state == cluster.state;
      final tone = isSelected ? AppColors.gold600 : AppColors.teal500;

      canvas.drawCircle(
        centre,
        radius,
        Paint()..color = tone.withValues(alpha: isSelected ? 0.42 : 0.26),
      );
      canvas.drawCircle(
        centre,
        radius,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = isSelected ? 2.4 : 1.3
          ..color = tone.withValues(alpha: 0.95),
      );
      canvas.drawCircle(centre, 2.2, Paint()..color = tone);
    }

    // Label only the leaders, so the map does not turn into a wall of text.
    //
    // Placement is a greedy search rather than "always below": below, above,
    // right, then left. The first slot that clears every label already placed
    // and still fits inside the canvas wins, and a label with no free slot is
    // dropped. Painting unconditionally below the bubble overprinted
    // neighbouring states and pushed edge labels off the canvas, where the
    // card's rounded clip sliced them.
    final occupied = <Rect>[];
    for (final cluster in ordered.take(5)) {
      final centre = projection.project(cluster.longitude, cluster.latitude);
      final radius = _bubbleRadius(cluster.count, maxCount, size);

      final painter = TextPainter(
        text: TextSpan(
          text: cluster.state,
          style: TextStyle(
            color: labelColor,
            fontSize: 9.5,
            fontWeight: FontWeight.w800,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();

      const gap = 3.0;
      final candidates = <Offset>[
        Offset(centre.dx - painter.width / 2, centre.dy + radius + gap),
        Offset(
          centre.dx - painter.width / 2,
          centre.dy - radius - gap - painter.height,
        ),
        Offset(centre.dx + radius + gap, centre.dy - painter.height / 2),
        Offset(
          centre.dx - radius - gap - painter.width,
          centre.dy - painter.height / 2,
        ),
      ];

      for (final candidate in candidates) {
        final rect = Rect.fromLTWH(
          candidate.dx,
          candidate.dy,
          painter.width,
          painter.height,
        );

        // Inset by 2 so a glyph never touches the card's rounded corner.
        if (rect.left < 2 ||
            rect.top < 2 ||
            rect.right > size.width - 2 ||
            rect.bottom > size.height - 2) {
          continue;
        }
        if (occupied.any((taken) => taken.overlaps(rect))) continue;

        painter.paint(canvas, candidate);
        // Padded so labels keep a little air between them, not just avoid
        // literal pixel overlap.
        occupied.add(rect.inflate(1.5));
        break;
      }
    }
  }

  @override
  bool shouldRepaint(_AlumniMapPainter oldDelegate) =>
      oldDelegate.states != states ||
      oldDelegate.selected != selected ||
      oldDelegate.maxCount != maxCount ||
      oldDelegate.landColor != landColor ||
      oldDelegate.borderColor != borderColor ||
      oldDelegate.labelColor != labelColor;
}

class _StateRow extends StatelessWidget {
  const _StateRow({
    required this.rank,
    required this.cluster,
    required this.maxCount,
    required this.selected,
    required this.onTap,
  });

  final int rank;
  final StateCluster cluster;
  final int maxCount;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tone = selected ? AppColors.gold600 : AppColors.teal600;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Row(
        children: [
          SizedBox(
            width: 22,
            child: Text(
              '$rank',
              style: theme.textTheme.labelSmall?.copyWith(
                letterSpacing: 0,
                fontSize: 12,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        cluster.state,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                    Text(
                      Fmt.number(cluster.count),
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: tone,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: maxCount <= 0 ? 0 : cluster.count / maxCount,
                    minHeight: 6,
                    backgroundColor: theme.colorScheme.surfaceContainerHighest,
                    valueColor: AlwaysStoppedAnimation(tone),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
