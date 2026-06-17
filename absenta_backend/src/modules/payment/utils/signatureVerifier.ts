import crypto from 'crypto';
import Stripe from 'stripe';

export interface SignatureVerificationResult {
  isValid: boolean;
  error?: string;
  event?: any; // For Stripe, this will contain the constructed event
}

export class SignatureVerifier {
  /**
   * Verify Midtrans signature
   */
  static verifyMidtransSignature(
    payload: any,
    signature: string,
    serverKey: string
  ): SignatureVerificationResult {
    try {
      // Validate required fields
      if (!payload || !payload.order_id || !payload.status_code || !payload.gross_amount) {
        return {
          isValid: false,
          error: 'Missing required fields in Midtrans payload'
        };
      }

      if (!signature || !serverKey) {
        return {
          isValid: false,
          error: 'Missing signature or server key'
        };
      }

      const orderId = payload.order_id;
      const statusCode = payload.status_code;
      const grossAmount = payload.gross_amount;
      
      const signatureKey = orderId + statusCode + grossAmount + serverKey;
      const expectedSignature = crypto
        .createHash('sha512')
        .update(signatureKey)
        .digest('hex');

      return {
        isValid: signature === expectedSignature
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        isValid: false,
        error: `Midtrans signature verification failed: ${errorMessage}`
      };
    }
  }

  /**
   * Verify Stripe signature
   */
  static verifyStripeSignature(
    payload: string | Buffer,
    signature: string,
    endpointSecret: string
  ): SignatureVerificationResult {
    try {
      // Initialize Stripe with proper error handling
      if (!process.env.STRIPE_SECRET_KEY) {
        return {
          isValid: false,
          error: 'Stripe secret key not configured'
        };
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-10-29.clover' // Use the version expected by installed types
      });
      
      // Stripe webhook signature verification
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );

      return {
        isValid: true,
        event: event // Return the constructed event for further processing
      };
    } catch (error) {
      let errorMessage = 'Unknown error';
      
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        errorMessage = 'Invalid signature';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        isValid: false,
        error: `Stripe signature verification failed: ${errorMessage}`
      };
    }
  }

  /**
   * Verify Xendit signature
   */
  static verifyXenditSignature(
    payload: any,
    signature: string,
    callbackToken: string
  ): SignatureVerificationResult {
    try {
      // Validate required parameters
      if (!payload) {
        return {
          isValid: false,
          error: 'Missing payload for Xendit signature verification'
        };
      }

      if (!signature || !callbackToken) {
        return {
          isValid: false,
          error: 'Missing signature or callback token'
        };
      }

      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHash('sha256')
        .update(payloadString + callbackToken)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      return {
        isValid: isValid
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        isValid: false,
        error: `Xendit signature verification failed: ${errorMessage}`
      };
    }
  }

  /**
   * Generic signature verification method
   */
  static verifySignature(
    gateway: string,
    payload: any,
    signature: string,
    secret: string
  ): SignatureVerificationResult {
    // Validate required parameters
    if (!gateway || !signature || !secret) {
      return {
        isValid: false,
        error: 'Missing required parameters for signature verification'
      };
    }

    switch (gateway.toLowerCase()) {
      case 'midtrans':
        return this.verifyMidtransSignature(payload, signature, secret);
      
      case 'stripe':
        return this.verifyStripeSignature(payload, signature, secret);
      
      case 'xendit':
        return this.verifyXenditSignature(payload, signature, secret);
      
      default:
        return {
          isValid: false,
          error: `Unsupported gateway: ${gateway}`
        };
    }
  }

  /**
   * Generate HMAC signature for testing
   */
  static generateHMACSignature(
    payload: string,
    secret: string,
    algorithm: string = 'sha256'
  ): string {
    return crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMACSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): SignatureVerificationResult {
    try {
      // Validate required parameters
      if (!payload || !signature || !secret) {
        return {
          isValid: false,
          error: 'Missing required parameters for HMAC verification'
        };
      }

      const expectedSignature = this.generateHMACSignature(payload, secret, algorithm);
      
      return {
        isValid: crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        )
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        isValid: false,
        error: `HMAC signature verification failed: ${errorMessage}`
      };
    }
  }
}