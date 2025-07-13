class UserProfile {
  final String name;
  final String email;
  final String bloodType;
  final String? dateOfBirth;
  final String? phoneNumber;

  UserProfile({
    required this.name,
    required this.email,
    required this.bloodType,
    this.dateOfBirth,
    this.phoneNumber,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      name: json['name'],
      email: json['email'],
      bloodType: json['bloodType'],
      dateOfBirth: json['DateOfBirth'],
      phoneNumber: json['PhoneNumber'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'bloodType': bloodType,
      'DateOfBirth': dateOfBirth,
      'PhoneNumber': phoneNumber,
    };
  }
}