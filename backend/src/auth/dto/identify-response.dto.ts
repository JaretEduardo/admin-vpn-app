export class IdentifyResponseAdminDto {
  id: string;
  fullName: string;
}

export class IdentifyResponseDto {
  admin: IdentifyResponseAdminDto;
  challengeToken: string;
  expiresIn: number;
}
