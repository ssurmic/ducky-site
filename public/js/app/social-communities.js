// Navigation allowlist mirrors the documented scopes collected by the backend.
export const communities=['all-stocks','wallstreetbets','stocks','investing','options',
  'Daytrading','SPACs','WallStreetbetsELITE','Wallstreetbetsnew'];
export const communityName=value=>value==='all-stocks'?null:'r/'+value;
