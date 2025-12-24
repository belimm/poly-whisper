// import express from 'express';
// import { authenticateSupabaseUser } from '../middleware/supabaseAuth.js';
// import OrderDatabaseService from '../services/database/orderDatabaseService.js';
// //import PolymarketOrderService from '../services/market/polymarketOrderService.js';

// const router = express.Router();
// const orderDB = new OrderDatabaseService();
// //const polymarketOrderService = new PolymarketOrderService();

// // All routes in this router require authentication
// router.use(authenticateSupabaseUser);

// /**
//  * POST /api/orders/create
//  * Create and place an order on Polymarket
//  * Body: { orderData, signature }
//  */
// router.post('/create', async (req, res) => {
//   try {
//     const { orderData, signature } = req.body;
//     const userId = req.user.id;
//     const userAddress = req.user.wallet_address;

//     // Validate required fields
//     if (!orderData || !signature) {
//       return res.status(400).json({
//         error: 'Missing orderData or signature',
//       });
//     }

//     if (!userAddress) {
//       return res.status(400).json({
//         error: 'User wallet address not found. Please connect your wallet.',
//       });
//     }

//     // Verify signature
//     const isValidSignature = polymarketOrderService.verifyOrderSignature(
//       orderData,
//       signature,
//       userAddress
//     );

//     if (!isValidSignature) {
//       return res.status(401).json({
//         error: 'Invalid signature. Order verification failed.',
//       });
//     }

//     // Store order in database first
//     const dbOrder = await orderDB.createOrder(userId, {
//       ...orderData,
//       signature,
//     });

//     // Get or create Polymarket credentials
//     let polymarketCreds = await orderDB.getPolymarketCredentials(userId);

//     if (!polymarketCreds) {
//       // If no credentials exist, we need the user to provide them
//       // For now, return error and guide user to set up credentials
//       return res.status(400).json({
//         error: 'Polymarket credentials not found',
//         message: 'Please set up your Polymarket API credentials first',
//         action: 'setup_credentials',
//       });
//     }

//     // Place order on Polymarket
//     // Note: This requires the user's private key which should be encrypted in the database
//     let polymarketOrderResponse;
//     try {
//       polymarketOrderResponse = await polymarketOrderService.placeOrder(
//         polymarketCreds,
//         orderData,
//         1, // signatureType: 1 = Magic/Email Login
//         userAddress
//       );

//       // Update order status to filled
//       await orderDB.updateOrderStatus(
//         dbOrder.id,
//         'filled',
//         polymarketOrderResponse.id
//       );
//     } catch (polymarketError) {
//       console.error('Polymarket order placement failed:', polymarketError);

//       // Update order status to failed
//       await orderDB.updateOrderStatus(dbOrder.id, 'failed');

//       return res.status(500).json({
//         error: 'Failed to place order on Polymarket',
//         message: polymarketError.message,
//         orderId: dbOrder.id, // Return local order ID for reference
//       });
//     }

//     res.status(201).json({
//       success: true,
//       order: {
//         id: dbOrder.id,
//         status: 'filled',
//         polymarketOrderId: polymarketOrderResponse.id,
//         ...orderData,
//       },
//     });
//   } catch (error) {
//     console.error('Order creation error:', error);
//     res.status(500).json({
//       error: 'Failed to create order',
//       message: error.message,
//     });
//   }
// });

// /**
//  * GET /api/orders
//  * Get user's orders
//  * Query params: limit (default: 50), offset (default: 0)
//  */
// router.get('/', async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const limit = parseInt(req.query.limit) || 50;
//     const offset = parseInt(req.query.offset) || 0;

//     const { data, count } = await orderDB.getUserOrders(userId, limit, offset);

//     res.json({
//       orders: data,
//       total: count,
//       limit,
//       offset,
//       hasMore: offset + limit < count,
//     });
//   } catch (error) {
//     console.error('Error fetching orders:', error);
//     res.status(500).json({
//       error: 'Failed to fetch orders',
//       message: error.message,
//     });
//   }
// });

// /**
//  * GET /api/orders/:orderId
//  * Get order details
//  */
// router.get('/:orderId', async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const order = await orderDB.getOrder(req.params.orderId);

//     if (!order) {
//       return res.status(404).json({
//         error: 'Order not found',
//       });
//     }

//     // Verify user owns this order
//     if (order.user_id !== userId) {
//       return res.status(403).json({
//         error: 'Unauthorized',
//       });
//     }

//     res.json(order);
//   } catch (error) {
//     console.error('Error fetching order:', error);
//     res.status(500).json({
//       error: 'Failed to fetch order',
//       message: error.message,
//     });
//   }
// });

// /**
//  * POST /api/orders/:orderId/cancel
//  * Cancel an order
//  */
// router.post('/:orderId/cancel', async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const order = await orderDB.getOrder(req.params.orderId);

//     if (!order) {
//       return res.status(404).json({
//         error: 'Order not found',
//       });
//     }

//     // Verify user owns this order
//     if (order.user_id !== userId) {
//       return res.status(403).json({
//         error: 'Unauthorized',
//       });
//     }

//     // Check if order can be cancelled
//     if (order.status !== 'filled' && order.status !== 'pending') {
//       return res.status(400).json({
//         error: 'Cannot cancel order',
//         reason: `Order status is ${order.status}`,
//       });
//     }

//     // Get Polymarket credentials
//     const polymarketCreds = await orderDB.getPolymarketCredentials(userId);

//     if (!polymarketCreds) {
//       return res.status(400).json({
//         error: 'Polymarket credentials not found',
//       });
//     }

//     // Cancel order on Polymarket
//     try {
//       await polymarketOrderService.cancelOrder(
//         order.polymarket_order_id,
//         polymarketCreds
//       );

//       // Update order status to cancelled
//       await orderDB.updateOrderStatus(req.params.orderId, 'cancelled');

//       res.json({
//         success: true,
//         message: 'Order cancelled successfully',
//       });
//     } catch (polymarketError) {
//       return res.status(500).json({
//         error: 'Failed to cancel order on Polymarket',
//         message: polymarketError.message,
//       });
//     }
//   } catch (error) {
//     console.error('Error cancelling order:', error);
//     res.status(500).json({
//       error: 'Failed to cancel order',
//       message: error.message,
//     });
//   }
// });

// export default router;
