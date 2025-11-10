import express from 'express';
import { authenticateSupabaseUser } from '../middleware/supabaseAuth.js';
import { supabaseAdmin } from '../infrastructure/database/supabaseClient.js';

const router = express.Router();

// All routes in this router require authentication
router.use(authenticateSupabaseUser);

/**
 * GET /api/user/profile
 * Get current user's profile
 */
router.get('/profile', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            throw error;
        }

        // If profile doesn't exist, create one
        if (!data) {
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('user_profiles')
                .insert([{
                    id: req.user.id,
                    username: req.user.email?.split('@')[0],
                    display_name: req.user.user_metadata?.display_name || req.user.email
                }])
                .select()
                .single();

            if (createError) throw createError;

            return res.json({
                profile: newProfile,
                created: true
            });
        }

        res.json({
            profile: data,
            created: false
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            message: error.message
        });
    }
});

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
router.put('/profile', async (req, res) => {
    try {
        const { username, display_name, preferences } = req.body;

        const updates = {};
        if (username !== undefined) updates.username = username;
        if (display_name !== undefined) updates.display_name = display_name;
        if (preferences !== undefined) updates.preferences = preferences;

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .update(updates)
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            profile: data,
            updated: true
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            message: error.message
        });
    }
});

/**
 * GET /api/user/interactions
 * Get user's tweet interactions (bookmarks, favorites, etc.)
 */
router.get('/interactions', async (req, res) => {
    try {
        const type = req.query.type;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        let query = supabaseAdmin
            .from('user_interactions')
            .select(`
                *,
                tweet:tweets(*)
            `, { count: 'exact' })
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq('interaction_type', type);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            interactions: data,
            total: count,
            limit,
            offset,
            hasMore: offset + limit < count
        });
    } catch (error) {
        console.error('Error fetching interactions:', error);
        res.status(500).json({
            error: 'Failed to fetch interactions',
            message: error.message
        });
    }
});

/**
 * POST /api/user/interactions
 * Create a new interaction (bookmark, favorite, etc.)
 */
router.post('/interactions', async (req, res) => {
    try {
        const { tweet_id, interaction_type, note } = req.body;

        if (!tweet_id || !interaction_type) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'tweet_id and interaction_type are required'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('user_interactions')
            .insert([{
                user_id: req.user.id,
                tweet_id,
                interaction_type,
                note
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    error: 'Interaction already exists'
                });
            }
            throw error;
        }

        res.status(201).json({
            interaction: data,
            created: true
        });
    } catch (error) {
        console.error('Error creating interaction:', error);
        res.status(500).json({
            error: 'Failed to create interaction',
            message: error.message
        });
    }
});

/**
 * DELETE /api/user/interactions/:interactionId
 * Delete an interaction
 */
router.delete('/interactions/:interactionId', async (req, res) => {
    try {
        const { interactionId } = req.params;

        const { error } = await supabaseAdmin
            .from('user_interactions')
            .delete()
            .eq('id', interactionId)
            .eq('user_id', req.user.id);

        if (error) throw error;

        res.json({
            deleted: true
        });
    } catch (error) {
        console.error('Error deleting interaction:', error);
        res.status(500).json({
            error: 'Failed to delete interaction',
            message: error.message
        });
    }
});

export default router;
