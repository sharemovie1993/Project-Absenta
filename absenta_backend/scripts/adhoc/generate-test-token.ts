import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Generate token untuk SUPERADMIN
const payload = {
  userId: 'cm4qdcjdg000013e4fddcedce', // ID user SUPERADMIN
  roleName: 'SUPERADMIN', // Gunakan roleName sesuai auth middleware
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 jam
};

const token = jwt.sign(payload, JWT_SECRET);

console.log('🎫 Generated JWT Token:');
console.log(token);
console.log('\n📋 Token Payload:');
console.log(JSON.stringify(payload, null, 2));