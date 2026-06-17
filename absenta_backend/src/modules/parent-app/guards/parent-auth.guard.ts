import { parentAuthService } from '../services/parent-auth.service';

export async function parentAuthGuard(request: any, reply: any) {
  console.log('🔥🔥🔥 parentAuthGuard EXECUTED');
  try {
    const authHeader = request.headers.authorization;
    
    // 1. Check Header Existence
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔥🔥🔥 parentAuthGuard REJECTING REQUEST');
      return reply.status(401).send({ 
        success: false, 
        message: 'Missing or invalid Authorization header' 
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Validate Token via Service
    // This checks: exists, active, not expired, has active students
    const parent = await parentAuthService.validateToken(token);

    // 3. Attach Parent to Request for Controller Use
    request.parent = parent;

    // Log success (debug)
    // console.log(`[ParentGuard] Access granted for parent: ${parent.nama}`);
    
  } catch (error: any) {
    console.error('[ParentGuard] Auth Failed:', error.message);
    console.log('🔥🔥🔥 parentAuthGuard REJECTING REQUEST');
    return reply.status(401).send({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
}
