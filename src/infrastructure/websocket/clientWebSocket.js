import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { authenticateWebSocketConnection } from '../../middleware/supabaseAuth.js';

class ClientWebSocketService extends EventEmitter {
    constructor() {
        super();
        this.wss = null;
        this.clients = new Map(); // Map to store authenticated clients
        this.isRunning = false;
    }

    createServer(server) {
        this.wss = new WebSocketServer({ 
            server,
            path: '/ws',
            verifyClient: (info) => {
                try {
                    // Pre-validate the token before upgrade
                    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
                    const token = url.searchParams.get('token');
                    return !!token; // Basic check, full auth happens in connection handler
                } catch (error) {
                    console.error('WebSocket verification error:', error);
                    return false;
                }
            }
        });

        this.wss.on('connection', async (ws, req) => {
            try {
                // Extract token from URL
                const url = new URL(req.url, `http://${req.headers.host}`);
                const token = url.searchParams.get('token');

                let auth;

                // Try Supabase authentication first
                try {
                    const supabaseAuth = await authenticateWebSocketConnection(token);
                    auth = {
                        client: supabaseAuth.user.email || supabaseAuth.user.id,
                        type: 'supabase',
                        userId: supabaseAuth.user.id,
                        user: supabaseAuth.user
                    };
                    console.log('✅ Supabase authentication successful');
                } catch (supabaseError) {
                    // Fall back to simple token authentication
                    console.log('⚠️  Supabase auth failed, trying simple token:', supabaseError.message);
                   
                }

                // Store client with auth info
                const clientId = `${auth.client}_${Date.now()}`;
                this.clients.set(clientId, {
                    ws,
                    auth,
                    connectedAt: new Date().toISOString()
                });

                console.log(`✅ Frontend client connected: ${auth.client} (${auth.type})`);
                console.log(`📊 Total connected clients: ${this.clients.size}`);

                // Send welcome message
                ws.send(JSON.stringify({
                    type: 'welcome',
                    message: 'Connected to PolySense WebSocket',
                    client: auth.client,
                    authType: auth.type,
                    userId: auth.userId || null,
                    timestamp: new Date().toISOString()
                }));

                // Handle client messages
                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleClientMessage(clientId, message);
                    } catch (error) {
                        console.error('Failed to parse client message:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Invalid message format'
                        }));
                    }
                });

                // Handle client disconnect
                ws.on('close', () => {
                    this.clients.delete(clientId);
                    console.log(`❌ Frontend client disconnected: ${auth.client}`);
                    console.log(`📊 Total connected clients: ${this.clients.size}`);
                });

                // Handle errors
                ws.on('error', (error) => {
                    console.error(`WebSocket error for client ${auth.client}:`, error);
                    this.clients.delete(clientId);
                });

                this.emit('clientConnected', { clientId, auth });

            } catch (error) {
                console.error('WebSocket authentication failed:', error);
                ws.close(1008, 'Authentication failed');
            }
        });

        this.isRunning = true;
        console.log('🔌 Frontend WebSocket server started on /ws');
        return this.wss;
    }

    handleClientMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        console.log(`📨 Message from ${client.auth.client}:`, message);

        switch (message.type) {
            case 'ping':
                client.ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                }));
                break;

            case 'subscribe':
                // Handle subscription requests (e.g., specific keywords, categories)
                client.subscription = message.data;
                client.ws.send(JSON.stringify({
                    type: 'subscribed',
                    data: message.data,
                    message: 'Subscription updated successfully'
                }));
                break;

            case 'getStats':
                this.sendStatsToClient(clientId);
                break;

            default:
                client.ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }));
        }
    }

    // Broadcast enriched tweet to all connected clients
    broadcastTweet(enrichedTweet) {
        if (!this.isRunning || this.clients.size === 0) return;

        const message = JSON.stringify({
            type: 'newTweet',
            data: enrichedTweet,
            timestamp: new Date().toISOString()
        });

        let sentCount = 0;
        for (const [clientId, client] of this.clients) {
            try {
                // Check if client has specific subscription filters
                if (this.shouldSendToClient(client, enrichedTweet)) {
                    client.ws.send(message);
                    sentCount++;
                }
            } catch (error) {
                console.error(`Failed to send to client ${clientId}:`, error);
                this.clients.delete(clientId);
            }
        }

        if (sentCount > 0) {
            console.log(`📡 Broadcasted tweet to ${sentCount} client(s)`);
        }
    }

    // Check if tweet should be sent to specific client based on their subscription
    shouldSendToClient(client, enrichedTweet) {
        if (!client.subscription) return true; // Send all if no specific subscription

        const { keywords, categories, sentiment } = client.subscription;
        const analysis = enrichedTweet.analysis || {};

        // Filter by keywords
        if (keywords && keywords.length > 0) {
            const tweetKeywords = analysis.keywords || [];
            const hasMatchingKeyword = keywords.some(keyword => 
                tweetKeywords.some(tweetKeyword => 
                    tweetKeyword.toLowerCase().includes(keyword.toLowerCase())
                )
            );
            if (!hasMatchingKeyword) return false;
        }

        // Filter by categories
        if (categories && categories.length > 0) {
            const tweetCategories = analysis.categories || [];
            const hasMatchingCategory = categories.some(category => 
                tweetCategories.includes(category)
            );
            if (!hasMatchingCategory) return false;
        }

        // Filter by sentiment
        if (sentiment && analysis.sentiment && analysis.sentiment !== sentiment) {
            return false;
        }

        return true;
    }

    // Send current stats to a specific client
    sendStatsToClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const stats = {
            connectedClients: this.clients.size,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };

        client.ws.send(JSON.stringify({
            type: 'stats',
            data: stats
        }));
    }

    // Broadcast system message to all clients
    broadcastSystemMessage(message, type = 'info') {
        if (!this.isRunning) return;

        const systemMessage = JSON.stringify({
            type: 'system',
            level: type,
            message,
            timestamp: new Date().toISOString()
        });

        for (const [clientId, client] of this.clients) {
            try {
                client.ws.send(systemMessage);
            } catch (error) {
                console.error(`Failed to send system message to client ${clientId}:`, error);
                this.clients.delete(clientId);
            }
        }
    }

    // Get current connection stats
    getStats() {
        return {
            isRunning: this.isRunning,
            connectedClients: this.clients.size,
            clients: Array.from(this.clients.values()).map(client => ({
                auth: client.auth,
                connectedAt: client.connectedAt,
                subscription: client.subscription || null
            }))
        };
    }

    // Gracefully close all connections
    close() {
        if (this.wss) {
            console.log('🔌 Closing frontend WebSocket server...');
            
            // Notify all clients before closing
            this.broadcastSystemMessage('Server is shutting down', 'warning');
            
            // Close all client connections
            for (const [clientId, client] of this.clients) {
                client.ws.close(1001, 'Server shutdown');
            }
            
            this.clients.clear();
            this.wss.close();
            this.isRunning = false;
            console.log('✅ Frontend WebSocket server closed');
        }
    }
}

export default ClientWebSocketService;