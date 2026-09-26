class FamilyModel {
  final String id;
  final String name;
  final String badgeTag;
  final String badgeBgColor;
  final String badgeTextColor;
  final int level;
  final String? iconUrl;

  FamilyModel({
    required this.id,
    required this.name,
    required this.badgeTag,
    required this.badgeBgColor,
    required this.badgeTextColor,
    required this.level,
    this.iconUrl,
  });

  factory FamilyModel.fromJson(Map<String, dynamic> json) {
    return FamilyModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      badgeTag: json['badgeTag'] as String? ?? '',
      badgeBgColor: json['badgeBgColor'] as String? ?? '#7928CA',
      badgeTextColor: json['badgeTextColor'] as String? ?? '#FFFFFF',
      level: (json['level'] as num?)?.toInt() ?? 1,
      iconUrl: json['iconUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'badgeTag': badgeTag,
      'badgeBgColor': badgeBgColor,
      'badgeTextColor': badgeTextColor,
      'level': level,
      'iconUrl': iconUrl,
    };
  }
}

class TitleModel {
  final String id;
  final String name;
  final String rarityTier;
  final String bgGradientStart;
  final String bgGradientEnd;
  final String textColor;
  final String? borderColor;
  final int minLevel;
  final String? iconUrl;
  final bool isEquipped;

  TitleModel({
    required this.id,
    required this.name,
    required this.rarityTier,
    required this.bgGradientStart,
    required this.bgGradientEnd,
    this.textColor = '#FFFFFF',
    this.borderColor,
    this.minLevel = 1,
    this.iconUrl,
    this.isEquipped = false,
  });

  factory TitleModel.fromJson(Map<String, dynamic> json) {
    return TitleModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      rarityTier: json['rarityTier'] as String? ?? 'RARE',
      bgGradientStart: json['bgGradientStart'] as String? ?? '#FF416C',
      bgGradientEnd: json['bgGradientEnd'] as String? ?? '#FF4B2B',
      textColor: json['textColor'] as String? ?? '#FFFFFF',
      borderColor: json['borderColor'] as String?,
      minLevel: (json['minLevel'] as num?)?.toInt() ?? 1,
      iconUrl: json['iconUrl'] as String?,
      isEquipped: json['isEquipped'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'rarityTier': rarityTier,
      'bgGradientStart': bgGradientStart,
      'bgGradientEnd': bgGradientEnd,
      'textColor': textColor,
      'borderColor': borderColor,
      'minLevel': minLevel,
      'iconUrl': iconUrl,
      'isEquipped': isEquipped,
    };
  }
}

class BadgeModel {
  final String id;
  final String name;
  final String category;
  final String shape;
  final String badgeBgColor;
  final int minLevel;
  final String? iconUrl;

  BadgeModel({
    required this.id,
    required this.name,
    required this.category,
    this.shape = 'HEXAGON',
    this.badgeBgColor = '#7928CA',
    this.minLevel = 1,
    this.iconUrl,
  });

  factory BadgeModel.fromJson(Map<String, dynamic> json) {
    return BadgeModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? 'HONOR',
      shape: json['shape'] as String? ?? 'HEXAGON',
      badgeBgColor: json['badgeBgColor'] as String? ?? '#7928CA',
      minLevel: (json['minLevel'] as num?)?.toInt() ?? 1,
      iconUrl: json['iconUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'shape': shape,
      'badgeBgColor': badgeBgColor,
      'minLevel': minLevel,
      'iconUrl': iconUrl,
    };
  }
}

class CharmTierModel {
  final String tier;
  final int subTier;
  final String label;
  final String icon;

  CharmTierModel({
    required this.tier,
    required this.subTier,
    required this.label,
    required this.icon,
  });

  factory CharmTierModel.fromJson(Map<String, dynamic> json) {
    return CharmTierModel(
      tier: json['tier'] as String? ?? 'STAR',
      subTier: (json['subTier'] as num?)?.toInt() ?? 1,
      label: json['label'] as String? ?? 'Star 1',
      icon: json['icon'] as String? ?? 'star',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tier': tier,
      'subTier': subTier,
      'label': label,
      'icon': icon,
    };
  }
}

class UserModel {
  final String id;
  final String? displayId;
  final String username;
  final String email;
  final String? phone;
  final String role;
  final String coinsBalance;
  final String charmPoints;
  final String expPoints;
  final int activeLevel;
  final String blessingPoints;
  final String signature;
  final String region;
  final String gender;
  final bool isBanned;
  final String? avatarUrl;
  final FamilyModel? family;
  final TitleModel? equippedTitle;
  final List<TitleModel> titles;
  final List<BadgeModel> badges;
  final CharmTierModel? charmTier;
  final String? authProvider;
  final String? firebaseUid;
  final String? lastLoginAt;
  final String? birthday;
  final bool profileCompleted;

  UserModel({
    required this.id,
    this.displayId,
    required this.username,
    required this.email,
    this.phone,
    required this.role,
    dynamic coinsBalance = '0',
    dynamic charmPoints = '0',
    dynamic expPoints = '0',
    this.activeLevel = 1,
    dynamic blessingPoints = '0',
    this.signature = '',
    this.region = 'Global',
    this.gender = 'unknown',
    required this.isBanned,
    this.avatarUrl,
    this.family,
    this.equippedTitle,
    this.titles = const [],
    this.badges = const [],
    this.charmTier,
    this.authProvider,
    this.firebaseUid,
    this.lastLoginAt,
    this.birthday,
    this.profileCompleted = false,
  })  : coinsBalance = coinsBalance.toString(),
        charmPoints = charmPoints.toString(),
        expPoints = expPoints.toString(),
        blessingPoints = blessingPoints.toString();

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final titlesList = (json['titles'] as List<dynamic>?)
            ?.map((e) => TitleModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    final badgesList = (json['badges'] as List<dynamic>?)
            ?.map((e) => BadgeModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    return UserModel(
      id: json['id'] as String? ?? '',
      displayId: json['displayId'] as String?,
      username: json['username'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'user',
      coinsBalance: json['coinsBalance']?.toString() ?? '0',
      charmPoints: json['charmPoints']?.toString() ?? '0',
      expPoints: json['expPoints']?.toString() ?? '0',
      activeLevel: (json['activeLevel'] as num?)?.toInt() ?? 1,
      blessingPoints: json['blessingPoints']?.toString() ?? '0',
      signature: json['signature'] as String? ?? 'Welcome to WePlay!',
      region: json['region'] as String? ?? 'Pakistan',
      gender: json['gender'] as String? ?? 'MALE',
      isBanned: json['isBanned'] as bool? ?? false,
      avatarUrl: json['avatarUrl'] as String?,
      family: json['family'] != null ? FamilyModel.fromJson(json['family']) : null,
      equippedTitle: json['equippedTitle'] != null
          ? TitleModel.fromJson(json['equippedTitle'])
          : null,
      titles: titlesList,
      badges: badgesList,
      charmTier: json['charmTier'] != null
          ? CharmTierModel.fromJson(json['charmTier'])
          : null,
      authProvider: json['authProvider'] as String?,
      firebaseUid: json['firebaseUid'] as String?,
      lastLoginAt: json['lastLoginAt'] as String?,
      birthday: json['birthday'] as String?,
      profileCompleted: json['profileCompleted'] as bool? ??
          json['is_onboarded'] as bool? ??
          json['isOnboarded'] as bool? ??
          false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'displayId': displayId,
      'username': username,
      'email': email,
      'phone': phone,
      'role': role,
      'coinsBalance': coinsBalance,
      'charmPoints': charmPoints,
      'expPoints': expPoints,
      'activeLevel': activeLevel,
      'blessingPoints': blessingPoints,
      'signature': signature,
      'region': region,
      'gender': gender,
      'isBanned': isBanned,
      'avatarUrl': avatarUrl,
      'family': family?.toJson(),
      'equippedTitle': equippedTitle?.toJson(),
      'titles': titles.map((t) => t.toJson()).toList(),
      'badges': badges.map((b) => b.toJson()).toList(),
      'charmTier': charmTier?.toJson(),
      'authProvider': authProvider,
      'firebaseUid': firebaseUid,
      'lastLoginAt': lastLoginAt,
      'birthday': birthday,
      'profileCompleted': profileCompleted,
    };
  }

  UserModel copyWith({
    String? id,
    String? displayId,
    String? username,
    String? email,
    String? phone,
    String? role,
    String? coinsBalance,
    String? charmPoints,
    String? expPoints,
    int? activeLevel,
    String? blessingPoints,
    String? signature,
    String? region,
    String? gender,
    bool? isBanned,
    String? avatarUrl,
    FamilyModel? family,
    TitleModel? equippedTitle,
    List<TitleModel>? titles,
    List<BadgeModel>? badges,
    CharmTierModel? charmTier,
    String? authProvider,
    String? firebaseUid,
    String? lastLoginAt,
    String? birthday,
    bool? profileCompleted,
  }) {
    return UserModel(
      id: id ?? this.id,
      displayId: displayId ?? this.displayId,
      username: username ?? this.username,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      coinsBalance: coinsBalance ?? this.coinsBalance,
      charmPoints: charmPoints ?? this.charmPoints,
      expPoints: expPoints ?? this.expPoints,
      activeLevel: activeLevel ?? this.activeLevel,
      blessingPoints: blessingPoints ?? this.blessingPoints,
      signature: signature ?? this.signature,
      region: region ?? this.region,
      gender: gender ?? this.gender,
      isBanned: isBanned ?? this.isBanned,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      family: family ?? this.family,
      equippedTitle: equippedTitle ?? this.equippedTitle,
      titles: titles ?? this.titles,
      badges: badges ?? this.badges,
      charmTier: charmTier ?? this.charmTier,
      authProvider: authProvider ?? this.authProvider,
      firebaseUid: firebaseUid ?? this.firebaseUid,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      birthday: birthday ?? this.birthday,
      profileCompleted: profileCompleted ?? this.profileCompleted,
    );
  }
}
