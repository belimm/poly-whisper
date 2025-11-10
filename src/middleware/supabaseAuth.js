import { supabaseClient } from '../infrastructure/database/supabaseClient.js';

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 * Expects token in Authorization header: "Bearer <token>"
 */
export async function authenticateSupabaseUser(req, res, next) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid Authorization header'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!supabaseClient) {
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Authentication service not available'
            });
        }

        // Verify the token with Supabase
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }

        // Attach user information to request object
        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
}

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't reject if missing
 */
export async function optionalSupabaseAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            if (supabaseClient) {
                const { data: { user } } = await supabaseClient.auth.getUser(token);
                if (user) {
                    req.user = user;
                    req.token = token;
                }
            }
        }

        next();
    } catch (error) {
        // Don't fail the request, just log the error
        console.error('Optional auth error:', error);
        next();
    }
}

/**
 * Middleware to check if user has a specific role
 * Should be used after authenticateSupabaseUser
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role || 'authenticated';

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
        }

        next();
    };
}

/**
 * Middleware to verify WebSocket connection token
 * For use with WebSocket upgrade requests
 */
export async function authenticateWebSocketConnection(token) {
    try {
        if (!token) {
            throw new Error('No token provided');
        }

        if (!supabaseClient) {
            throw new Error('Authentication service not available');
        }

        const { data: { user }, error } = await supabaseClient.auth.getUser(token);

        if (error || !user) {
            throw new Error('Invalid or expired token');
        }

        return { user, token };
    } catch (error) {
        throw new Error(`WebSocket authentication failed: ${error.message}`);
    }
}

export default {
    authenticateSupabaseUser,
    optionalSupabaseAuth,
    requireRole,
    authenticateWebSocketConnection
};
