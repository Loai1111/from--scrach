class BloodBag {
  final int bagID;
  final int? donorID;
  final String? donorName;
  final String bloodType;
  final String? collectionDate;
  final String? expiryDate;
  final String? status;

  BloodBag({
    required this.bagID,
    this.donorID,
    this.donorName,
    required this.bloodType,
    this.collectionDate,
    this.expiryDate,
    this.status,
  });

  factory BloodBag.fromJson(Map<String, dynamic> json) {
    return BloodBag(
      bagID: json['BagID'],
      donorID: json['DonorID'],
      donorName: json['DonorName'],
      bloodType: json['BloodType'] ?? 'Unknown',
      collectionDate: json['CollectionDate'],
      expiryDate: json['ExpiryDate'],
      status: json['status'] ?? 'Unknown',
    );
  }
}