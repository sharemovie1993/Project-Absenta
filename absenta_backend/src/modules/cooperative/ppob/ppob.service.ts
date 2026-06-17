// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { PPOBType, PPOBStatus } from '@prisma/client';

export class PPOBService {
    // Get PPOB Products
    static async getProducts(tenantId: string) {
        return await prisma.pPOBProduct.findMany({
            where: { tenantId, isActive: true },
            orderBy: { name: 'asc' }
        });
    }

    // Create PPOB Product (Admin)
    static async createProduct(tenantId: string, data: any) {
        return await prisma.pPOBProduct.create({
            data: {
                tenantId,
                code: data.code,
                name: data.name,
                provider: data.provider,
                type: data.type as PPOBType,
                price: Number(data.price),
                fee: Number(data.fee || 0),
                isActive: true
            }
        });
    }

    // Create Transaction
    static async createTransaction(tenantId: string, data: any) {
        // Validate product
        const product = await prisma.pPOBProduct.findUnique({
            where: { id: data.productId }
        });

        if (!product) throw new Error('Product not found');
        if (product.tenantId !== tenantId) throw new Error('Product not found in this tenant');

        // Simulate transaction
        return await prisma.pPOBTransaction.create({
            data: {
                tenantId,
                productId: data.productId,
                customerNo: data.customerNo,
                amount: Number(data.amount),
                status: 'PENDING' // In real app, this would be updated by callback
            }
        });
    }
}



