import 'user_model.dart';

class RoomSeatModel {
  final String id;
  final String roomId;
  final int seatIndex;
  final String? userId;
  final bool isLocked;
  final bool isMuted;
  final UserModel? user;

  RoomSeatModel({
    required this.id,
    required this.roomId,
    required this.seatIndex,
    this.userId,
    this.isLocked = false,
    this.isMuted = false,
    this.user,
  });

  bool get isOccupied => userId != null && userId!.isNotEmpty;

  factory RoomSeatModel.fromJson(Map<String, dynamic> json) {
    return RoomSeatModel(
      id: json['id'] as String? ?? '',
      roomId: json['roomId'] as String? ?? json['room_id'] as String? ?? '',
      seatIndex: (json['seatIndex'] as num?)?.toInt() ?? (json['seat_index'] as num?)?.toInt() ?? 0,
      userId: json['userId'] as String? ?? json['user_id'] as String?,
      isLocked: json['isLocked'] as bool? ?? json['is_locked'] as bool? ?? false,
      isMuted: json['isMuted'] as bool? ?? json['is_muted'] as bool? ?? false,
      user: json['user'] != null ? UserModel.fromJson(json['user']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'roomId': roomId,
      'seatIndex': seatIndex,
      'userId': userId,
      'isLocked': isLocked,
      'isMuted': isMuted,
      'user': user?.toJson(),
    };
  }

  RoomSeatModel copyWith({
    String? id,
    String? roomId,
    int? seatIndex,
    String? userId,
    bool? isLocked,
    bool? isMuted,
    UserModel? user,
    bool clearUser = false,
  }) {
    return RoomSeatModel(
      id: id ?? this.id,
      roomId: roomId ?? this.roomId,
      seatIndex: seatIndex ?? this.seatIndex,
      userId: clearUser ? null : (userId ?? this.userId),
      isLocked: isLocked ?? this.isLocked,
      isMuted: isMuted ?? this.isMuted,
      user: clearUser ? null : (user ?? this.user),
    );
  }
}

class RoomModel {
  final String id;
  final String? roomIdDisplay;
  final String title;
  final String hostId;
  final String roomType;
  final String category;
  final bool isLocked;
  final String agoraChannel;
  final String status;
  final int occupiedSeatsCount;
  final int listenersCount;
  final int totalSeats;
  final UserModel? host;
  final List<RoomSeatModel> seats;

  RoomModel({
    required this.id,
    this.roomIdDisplay,
    required this.title,
    required this.hostId,
    this.roomType = 'TEMPORARY',
    this.category = 'ALL',
    this.isLocked = false,
    required this.agoraChannel,
    required this.status,
    this.occupiedSeatsCount = 0,
    this.listenersCount = 0,
    this.totalSeats = 8,
    this.host,
    this.seats = const [],
  });

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    var rawSeats = json['seats'] as List<dynamic>? ?? [];
    List<RoomSeatModel> parsedSeats = rawSeats
        .map((s) => RoomSeatModel.fromJson(s as Map<String, dynamic>))
        .toList();

    return RoomModel(
      id: json['id'] as String? ?? '',
      roomIdDisplay: json['roomIdDisplay'] as String? ?? json['room_id_display'] as String?,
      title: json['title'] as String? ?? 'Voice Room',
      hostId: json['hostId'] as String? ?? json['host_id'] as String? ?? '',
      roomType: json['roomType'] as String? ?? json['room_type'] as String? ?? 'TEMPORARY',
      category: json['category'] as String? ?? 'ALL',
      isLocked: json['isLocked'] as bool? ?? json['is_locked'] as bool? ?? false,
      agoraChannel: json['agoraChannel'] as String? ?? json['agora_channel'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      occupiedSeatsCount: (json['occupiedSeatsCount'] as num?)?.toInt() ??
          parsedSeats.where((s) => s.isOccupied).length,
      listenersCount: (json['listenersCount'] as num?)?.toInt() ?? 0,
      totalSeats: (json['totalSeats'] as num?)?.toInt() ?? 8,
      host: json['host'] != null ? UserModel.fromJson(json['host']) : null,
      seats: parsedSeats,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'roomIdDisplay': roomIdDisplay,
      'title': title,
      'hostId': hostId,
      'roomType': roomType,
      'category': category,
      'isLocked': isLocked,
      'agoraChannel': agoraChannel,
      'status': status,
      'occupiedSeatsCount': occupiedSeatsCount,
      'listenersCount': listenersCount,
      'totalSeats': totalSeats,
      'host': host?.toJson(),
      'seats': seats.map((s) => s.toJson()).toList(),
    };
  }

  RoomModel copyWith({
    String? id,
    String? roomIdDisplay,
    String? title,
    String? hostId,
    String? roomType,
    String? category,
    bool? isLocked,
    String? agoraChannel,
    String? status,
    int? occupiedSeatsCount,
    int? listenersCount,
    int? totalSeats,
    UserModel? host,
    List<RoomSeatModel>? seats,
  }) {
    return RoomModel(
      id: id ?? this.id,
      roomIdDisplay: roomIdDisplay ?? this.roomIdDisplay,
      title: title ?? this.title,
      hostId: hostId ?? this.hostId,
      roomType: roomType ?? this.roomType,
      category: category ?? this.category,
      isLocked: isLocked ?? this.isLocked,
      agoraChannel: agoraChannel ?? this.agoraChannel,
      status: status ?? this.status,
      occupiedSeatsCount: occupiedSeatsCount ?? this.occupiedSeatsCount,
      listenersCount: listenersCount ?? this.listenersCount,
      totalSeats: totalSeats ?? this.totalSeats,
      host: host ?? this.host,
      seats: seats ?? this.seats,
    );
  }
}
