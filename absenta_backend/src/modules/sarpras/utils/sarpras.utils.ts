export function generateAssetCode(): string {
  const years = new Date().getFullYear();
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0, O, 1, I
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `INV-${years}-${randomStr}`;
}
