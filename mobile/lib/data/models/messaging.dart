import 'json_utils.dart';

class ConversationSummary {
  const ConversationSummary({
    required this.id,
    required this.title,
    required this.isGroup,
    required this.unreadCount,
    this.peerGraduateId,
    this.peerImage,
    this.lastMessageBody,
    this.lastMessageAt,
    this.lastSeenAt,
  });

  final String id;
  final String title;
  final bool isGroup;
  final int unreadCount;
  final String? peerGraduateId;
  final String? peerImage;
  final String? lastMessageBody;
  final DateTime? lastMessageAt;
  final DateTime? lastSeenAt;

  /// The web app treats a heartbeat inside five minutes as "online".
  bool get isPeerOnline {
    if (lastSeenAt == null) return false;
    return DateTime.now().difference(lastSeenAt!).inMinutes < 5;
  }

  factory ConversationSummary.fromJson(Map<String, dynamic> json) {
    final participants = asList(json['participants']);
    final peer =
        participants.isEmpty ? const <String, dynamic>{} : participants.first;
    final lastMessage = asMap(json['lastMessage']);

    return ConversationSummary(
      id: asString(json['id']),
      title: asString(
        json['title'] ?? json['groupName'] ?? peer['fullName'],
        fallback: 'Conversation',
      ),
      isGroup: asBool(json['isGroup']),
      unreadCount: asInt(json['unreadCount']),
      peerGraduateId: asStringOrNull(peer['graduateId'] ?? peer['id']),
      peerImage: asStringOrNull(peer['image']),
      lastMessageBody: asStringOrNull(lastMessage['body']),
      lastMessageAt: asDate(lastMessage['createdAt']),
      lastSeenAt: asDate(peer['lastSeenAt']),
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.body,
    required this.senderId,
    required this.senderName,
    this.senderImage,
    this.createdAt,
    this.isPending = false,
  });

  final String id;
  final String body;
  final String senderId;
  final String senderName;
  final String? senderImage;
  final DateTime? createdAt;

  /// True while an optimistic bubble is still in flight.
  final bool isPending;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = asMap(json['sender']);
    return ChatMessage(
      id: asString(json['id']),
      body: asString(json['body']),
      senderId: asString(sender['graduateId'] ?? sender['id']),
      senderName: asString(sender['fullName'], fallback: 'Alumnus'),
      senderImage: asStringOrNull(sender['image']),
      createdAt: asDate(json['createdAt']),
    );
  }

  ChatMessage copyWith({String? id, bool? isPending}) => ChatMessage(
        id: id ?? this.id,
        body: body,
        senderId: senderId,
        senderName: senderName,
        senderImage: senderImage,
        createdAt: createdAt,
        isPending: isPending ?? this.isPending,
      );
}

class ConversationThread {
  const ConversationThread({
    required this.id,
    required this.title,
    required this.isGroup,
    required this.messages,
    this.peerImage,
  });

  final String id;
  final String title;
  final bool isGroup;
  final List<ChatMessage> messages;
  final String? peerImage;

  factory ConversationThread.fromJson(Map<String, dynamic> json) {
    final conversation = asMap(json['conversation']);
    final participants = asList(conversation['participants']);
    final peer =
        participants.isEmpty ? const <String, dynamic>{} : participants.first;

    return ConversationThread(
      id: asString(conversation['id']),
      title: asString(
        conversation['title'] ?? conversation['groupName'] ?? peer['fullName'],
        fallback: 'Conversation',
      ),
      isGroup: asBool(conversation['isGroup']),
      peerImage: asStringOrNull(peer['image']),
      messages: asList(json['messages']).map(ChatMessage.fromJson).toList(),
    );
  }
}
