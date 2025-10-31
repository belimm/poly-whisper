import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';


export class SimpleTokenAuth {
    // Generate a long-lived token for your frontend
    static generateApiToken(identifier = 'frontend-client') {
        return jwt.sign(
            { 
                client: identifier,
                type: 'api_access',
                created: Date.now()
            }, 
            JWT_SECRET, 
            { expiresIn: '365d' } // Long-lived for trusted clients
        );
    }

    // Verify API key or JWT token
    static verifyAccess(token) {
        try {
            // Check JWT token
            const decoded = jwt.verify(token, JWT_SECRET);
            return { 
                ...decoded, 
                valid: true 
            };
        } catch (error) {
            throw new Error('Invalid access token');
        }
    }
}

// Simple middleware for API access
export const authenticateApiAccess = (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
    const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : authHeader;

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const auth = SimpleTokenAuth.verifyAccess(token);
        req.auth = auth;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid access token' });
    }
};

// WebSocket authentication for simple token
export const authenticateWebSocketSimple = (ws, req) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token') || 
                     url.searchParams.get('apikey');

        if (!token) {
            throw new Error('No token provided');
        }

        const auth = SimpleTokenAuth.verifyAccess(token);
        return auth;
    } catch (error) {
        throw new Error('Authentication failed: ' + error.message);
    }
};