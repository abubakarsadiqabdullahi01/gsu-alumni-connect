import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../theme/app_colors.dart';
import '../utils/formatters.dart';

/// Standard content surface. Every list row, panel and tile uses this so
/// radius, border and elevation stay identical across all sixteen screens.
class GsuCard extends StatelessWidget {
  const GsuCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.accent,
    this.gradient,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  /// Draws a 3px spine on the leading edge — used to colour-code entities.
  final Color? accent;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final radius = BorderRadius.circular(18);

    return Material(
      color: gradient == null ? theme.colorScheme.surface : null,
      borderRadius: radius,
      clipBehavior: Clip.antiAlias,
      child: Ink(
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: radius,
          border: Border.all(
            color: theme.colorScheme.outline.withValues(alpha: 0.7),
          ),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Stack(
            fit: StackFit.passthrough,
            children: [
              if (accent != null)
                Positioned(
                  left: 0,
                  top: 0,
                  bottom: 0,
                  child: Container(width: 3.5, color: accent),
                ),
              Padding(padding: padding, child: child),
            ],
          ),
        ),
      ),
    );
  }
}

/// Title + optional action, used above every content block.
class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.icon,
  });

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18, color: theme.colorScheme.primary),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleMedium),
                if (subtitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(subtitle!, style: theme.textTheme.bodySmall),
                  ),
              ],
            ),
          ),
          if (actionLabel != null && onAction != null)
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

/// Gradient icon tile. Flat monochrome icons read cheap; a soft branded tile
/// behind each one is what makes the nav and quick-actions feel considered.
class IconBadge extends StatelessWidget {
  const IconBadge(
    this.icon, {
    super.key,
    this.color,
    this.size = 42,
    this.iconSize,
    this.solid = false,
  });

  final IconData icon;
  final Color? color;
  final double size;
  final double? iconSize;
  final bool solid;

  @override
  Widget build(BuildContext context) {
    final tone = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: solid
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [tone, Color.lerp(tone, Colors.black, 0.25)!],
              )
            : LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  tone.withValues(alpha: 0.20),
                  tone.withValues(alpha: 0.08),
                ],
              ),
        borderRadius: BorderRadius.circular(size * 0.3),
        border: solid ? null : Border.all(color: tone.withValues(alpha: 0.22)),
      ),
      child: Icon(
        icon,
        size: iconSize ?? size * 0.48,
        color: solid ? Colors.white : tone,
      ),
    );
  }
}

/// Metric tile used on the dashboard and the per-feature summary strips.
class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.tone,
    this.caption,
    this.onTap,
    this.compact = false,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color? tone;
  final String? caption;
  final VoidCallback? onTap;

  /// Centred and tightened so four tiles fit one row on a phone.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = tone ?? theme.colorScheme.primary;

    if (compact) {
      return GsuCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.max,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Align(
              alignment: Alignment.center,
              child: IconBadge(icon, color: color, size: 26, iconSize: 13),
            ),
            const SizedBox(height: 4),
            // Scaled down rather than clipped: a five-figure count still fits.
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                value,
                style: theme.textTheme.titleMedium?.copyWith(
                  height: 1,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                fontSize: 10,
                height: 1.1,
                letterSpacing: 0,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            // Reserved whether or not this tile has a caption. Rendering it
            // only when present made the one tile carrying "1 pending" taller,
            // and since the row centres its content vertically, that pushed its
            // icon, value and label out of line with the other three.
            SizedBox(
              height: 13,
              child: caption == null
                  ? null
                  : Center(
                      child: Text(
                        caption!,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: color,
                          fontSize: 9.5,
                          height: 1.1,
                          letterSpacing: 0,
                          fontWeight: FontWeight.w700,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
            ),
          ],
        ),
      );
    }

    return GsuCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              IconBadge(icon, color: color, size: 34),
              const Spacer(),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: theme.textTheme.headlineSmall?.copyWith(height: 1.1),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.bodySmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (caption != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                caption!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: color,
                  letterSpacing: 0,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
        ],
      ),
    );
  }
}

/// Small status/label pill.
class StatusPill extends StatelessWidget {
  const StatusPill(
    this.label, {
    super.key,
    this.tone,
    this.icon,
    this.filled = false,
  });

  final String label;
  final Color? tone;
  final IconData? icon;
  final bool filled;

  /// Maps the API's status vocabulary onto the palette.
  factory StatusPill.forStatus(String status, {bool filled = false}) {
    final normalized = status.toUpperCase();
    final tone = switch (normalized) {
      'ACCEPTED' || 'ACTIVE' || 'COMPLETED' || 'VERIFIED' => AppColors.teal600,
      'PENDING' || 'SHORTLISTED' => AppColors.amber600,
      'DECLINED' ||
      'CANCELLED' ||
      'REJECTED' ||
      'SUSPENDED' =>
        AppColors.rose600,
      _ => AppColors.navy600,
    };
    return StatusPill(Fmt.enumLabel(status), tone: tone, filled: filled);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = tone ?? theme.colorScheme.primary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: filled ? color : color.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: filled ? color : color.withValues(alpha: 0.24),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: filled ? Colors.white : color),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: filled ? Colors.white : color,
              letterSpacing: 0.2,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

/// Avatar that falls back to branded initials — most alumni records have no
/// photo, so the fallback is the common case and has to look deliberate.
class GsuAvatar extends StatelessWidget {
  const GsuAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.radius = 24,
    this.showRing = false,
  });

  final String name;
  final String? imageUrl;
  final double radius;
  final bool showRing;

  @override
  Widget build(BuildContext context) {
    final tone = AppColors.accentFor(name);
    final resolved = AppConfig.resolveUrl(imageUrl);

    final avatar = Container(
      width: radius * 2,
      height: radius * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [tone, Color.lerp(tone, Colors.black, 0.32)!],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      child: resolved.isEmpty
          ? Text(
              Fmt.initials(name),
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: radius * 0.78,
                letterSpacing: 0.5,
              ),
            )
          : CachedNetworkImage(
              imageUrl: resolved,
              fit: BoxFit.cover,
              width: radius * 2,
              height: radius * 2,
              errorWidget: (context, _, __) => Text(
                Fmt.initials(name),
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: radius * 0.78,
                ),
              ),
              placeholder: (context, _) => const SizedBox.shrink(),
            ),
    );

    if (!showRing) return avatar;

    return Container(
      padding: const EdgeInsets.all(2.5),
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: AppColors.goldGradient,
      ),
      child: Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Theme.of(context).colorScheme.surface,
        ),
        child: avatar,
      ),
    );
  }
}

/// Debounced search field shared by directory, jobs, events and mentorship.
class GsuSearchField extends StatelessWidget {
  const GsuSearchField({
    super.key,
    required this.controller,
    required this.onChanged,
    this.hintText = 'Search',
    this.onFilterTap,
    this.filterCount = 0,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String hintText;
  final VoidCallback? onFilterTap;
  final int filterCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            onChanged: onChanged,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: hintText,
              prefixIcon: const Icon(Icons.search_rounded, size: 21),
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              suffixIcon: ValueListenableBuilder<TextEditingValue>(
                valueListenable: controller,
                builder: (context, value, _) {
                  if (value.text.isEmpty) return const SizedBox.shrink();
                  return IconButton(
                    icon: const Icon(Icons.close_rounded, size: 18),
                    onPressed: () {
                      controller.clear();
                      onChanged('');
                    },
                  );
                },
              ),
            ),
          ),
        ),
        if (onFilterTap != null) ...[
          const SizedBox(width: 10),
          Badge(
            isLabelVisible: filterCount > 0,
            label: Text('$filterCount'),
            child: Material(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                onTap: onFilterTap,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: theme.colorScheme.outline),
                  ),
                  child: Icon(
                    Icons.tune_rounded,
                    color: filterCount > 0
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Label/value row used across profile, job detail and event detail sheets.
class DetailRow extends StatelessWidget {
  const DetailRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 9),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 17, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: theme.textTheme.bodySmall),
                  const SizedBox(height: 2),
                  Text(
                    value.isEmpty ? '—' : value,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            if (onTap != null)
              Icon(
                Icons.chevron_right_rounded,
                size: 18,
                color: theme.colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }
}

/// Horizontally scrollable filter chips with a shared selected style.
class FilterChipsRow extends StatelessWidget {
  const FilterChipsRow({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  final Map<String, String> options;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (final entry in options.entries)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(entry.value),
                selected: selected == entry.key,
                showCheckmark: false,
                onSelected: (_) => onSelected(entry.key),
                selectedColor: theme.colorScheme.primary,
                labelStyle: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: selected == entry.key
                      ? theme.colorScheme.onPrimary
                      : theme.colorScheme.onSurfaceVariant,
                ),
                side: BorderSide(
                  color: selected == entry.key
                      ? theme.colorScheme.primary
                      : theme.colorScheme.outline,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
