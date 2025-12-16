import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { verifyMessage } from 'ethers';

class PolymarketOrderService {
  constructor() {
    this.host = 'https://clob.polymarket.com';
    this.chainId = 137; // Polygon
  }

  /**
   * Verify the signature matches the order data and user address
   */
  verifyOrderSignature(orderData, signature, userAddress) {
    try {
      const message = JSON.stringify(orderData);
      const recoveredAddress = verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Create or derive API key for user (requires private key or email)
   * Note: For production, you should securely manage private keys
   */
  async createOrDeriveApiKey(signer) {
    try {
      const clobClient = new ClobClient(this.host, this.chainId, signer);
      const creds = await clobClient.createOrDeriveApiKey();

      return creds;
    } catch (error) {
      console.error('API key creation error:', error);
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  /**
   * Place an order on Polymarket
   */
  async placeOrder(credentials, orderData, signatureType = 1, funder) {
    try {
      if (!credentials.privateKey) {
        throw new Error('Private key required to place order');
      }

      const signer = new Wallet(credentials.privateKey);

      const clobClient = new ClobClient(
        this.host,
        this.chainId,
        signer,
        credentials.apiKey,
        signatureType,
        funder
      );

      // Prepare market details
      const tickSize = '0.001'; // Default tick size
      const negRisk = false; // Adjust based on market

      // Convert side string to enum
      const side = orderData.side.toUpperCase() === 'BUY' ? Side.BUY : Side.SELL;

      // Create and post order
      const response = await clobClient.createAndPostOrder(
        {
          tokenID: orderData.tokenId,
          price: parseFloat(orderData.price),
          side,
          size: parseFloat(orderData.amount),
          feeRateBps: 0,
        },
        {
          tickSize,
          negRisk,
        },
        OrderType.GTC // Good-Till-Cancelled
      );

      console.log('Order placed successfully:', response);
      return response;
    } catch (error) {
      console.error('Order placement error:', error);
      throw new Error(`Failed to place order: ${error.message}`);
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId, credentials) {
    try {
      if (!credentials.privateKey) {
        throw new Error('Private key required to fetch order');
      }

      const signer = new Wallet(credentials.privateKey);

      const clobClient = new ClobClient(
        this.host,
        this.chainId,
        signer,
        credentials.apiKey
      );

      const orders = await clobClient.getOrders(null);
      const order = orders.find((o) => o.id === orderId);

      return order || null;
    } catch (error) {
      console.error('Order status fetch error:', error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId, credentials) {
    try {
      if (!credentials.privateKey) {
        throw new Error('Private key required to cancel order');
      }

      const signer = new Wallet(credentials.privateKey);

      const clobClient = new ClobClient(
        this.host,
        this.chainId,
        signer,
        credentials.apiKey
      );

      const response = await clobClient.cancelOrder(orderId);

      console.log('Order cancelled successfully:', response);
      return response;
    } catch (error) {
      console.error('Order cancellation error:', error);
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }
}

export default PolymarketOrderService;
