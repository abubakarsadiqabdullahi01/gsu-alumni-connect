import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/alumni_repository.dart';
import '../../data/models/messaging.dart';
import '../../data/providers.dart';
import '../auth/session_controller.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({
    super.key,
    required this.conversationId,
    required this.title,
  });

  final String conversationId;
  final String title;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  /// Messages sent from this screen, shown immediately and reconciled when the
  /// thread reloads. Without this the bubble only appears after a round trip.
  final List<ChatMessage> _optimistic = [];
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;

    final identity = ref.read(identityProvider);
    final pending = ChatMessage(
      id: 'pending-${DateTime.now().microsecondsSinceEpoch}',
      body: text,
      senderId: identity?.graduateId ?? '',
      senderName: identity?.fullName ?? 'You',
      createdAt: DateTime.now(),
      isPending: true,
    );

    setState(() {
      _optimistic.add(pending);
      _sending = true;
    });
    _controller.clear();
    _scrollToBottom();

    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.sendMessage(widget.conversationId, text);
      ref.invalidate(threadProvider(widget.conversationId));
      if (mounted) setState(() => _optimistic.remove(pending));
    } catch (error) {
      if (!mounted) return;
      setState(() => _optimistic.remove(pending));
      _controller.text = text;
      showAppSnack(context, ApiException.from(error).message, isError: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final thread = ref.watch(threadProvider(widget.conversationId));
    final myId = ref.watch(identityProvider)?.graduateId ?? '';

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            GsuAvatar(
              name: thread.valueOrNull?.title ?? widget.title,
              imageUrl: thread.valueOrNull?.peerImage,
              radius: 17,
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    thread.valueOrNull?.title ?? widget.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium,
                  ),
                  Text(
                    thread.valueOrNull?.isGroup == true
                        ? 'Group conversation'
                        : 'Direct message',
                    style:
                        theme.textTheme.labelSmall?.copyWith(letterSpacing: 0),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () =>
                ref.invalidate(threadProvider(widget.conversationId)),
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: AsyncView<ConversationThread>(
              value: thread,
              onRetry: () =>
                  ref.invalidate(threadProvider(widget.conversationId)),
              loading: const SkeletonList(itemCount: 4),
              data: (data) {
                final messages = [...data.messages, ..._optimistic];
                if (messages.isEmpty) {
                  return const EmptyState(
                    icon: Icons.waving_hand_outlined,
                    title: 'Say hello',
                    message: 'No messages yet. Send the first one to start the '
                        'conversation.',
                  );
                }

                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final previous = index == 0 ? null : messages[index - 1];
                    final showAuthor = data.isGroup &&
                        message.senderId != myId &&
                        previous?.senderId != message.senderId;

                    return _MessageBubble(
                      message: message,
                      isMine: message.senderId == myId,
                      showAuthor: showAuthor,
                    );
                  },
                );
              },
            ),
          ),
          _ChatComposer(
            controller: _controller,
            sending: _sending,
            onSend: _send,
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.isMine,
    required this.showAuthor,
  });

  final ChatMessage message;
  final bool isMine;
  final bool showAuthor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment:
            isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (showAuthor)
            Padding(
              padding: const EdgeInsets.only(left: 8, bottom: 3),
              child: Text(
                message.senderName,
                style: theme.textTheme.labelSmall?.copyWith(
                  letterSpacing: 0,
                  color: AppColors.accentFor(message.senderName),
                  fontSize: 11,
                ),
              ),
            ),
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * 0.76,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              gradient: isMine ? AppColors.brandGradient : null,
              color: isMine
                  ? null
                  : (isDark
                      ? theme.colorScheme.surfaceContainerHigh
                      : Colors.white),
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isMine ? 16 : 4),
                bottomRight: Radius.circular(isMine ? 4 : 16),
              ),
              border:
                  isMine ? null : Border.all(color: theme.colorScheme.outline),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.body,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: isMine ? Colors.white : theme.colorScheme.onSurface,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      Fmt.time(message.createdAt),
                      style: theme.textTheme.labelSmall?.copyWith(
                        letterSpacing: 0,
                        fontSize: 10,
                        color: isMine
                            ? Colors.white.withValues(alpha: 0.7)
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (message.isPending) ...[
                      const SizedBox(width: 5),
                      SizedBox(
                        height: 9,
                        width: 9,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.4,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatComposer extends StatelessWidget {
  const _ChatComposer({
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(top: BorderSide(color: theme.colorScheme.outline)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 5,
                  textCapitalization: TextCapitalization.sentences,
                  onSubmitted: (_) => onSend(),
                  decoration: const InputDecoration(
                    hintText: 'Write a message',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 9),
              SizedBox(
                width: 48,
                height: 48,
                child: FilledButton(
                  onPressed: sending ? null : onSend,
                  style: FilledButton.styleFrom(
                    padding: EdgeInsets.zero,
                    shape: const CircleBorder(),
                  ),
                  child: const Icon(Icons.send_rounded, size: 19),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
