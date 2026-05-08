export interface UserSession {
  sub: string; // user identifier
  email: string;
  name: string;
  groups: string[]; // Okta groups
}
