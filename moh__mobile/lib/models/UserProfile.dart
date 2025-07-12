class UserProfile {
  final String name;
  final String email;
  final String bloodType;

  UserProfile({
    required this.name,
    required this.email,
    required this.bloodType,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      name: json['name'],
      email: json['email'],
      bloodType: json['bloodType'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'bloodType': bloodType,
    };
  }
}