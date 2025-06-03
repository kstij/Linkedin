import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';
import { nanoid } from 'nanoid';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { count, daysUntilExpiry, sellerName } = req.body;

    if (!count || count < 1) {
      return res.status(400).json({ error: 'Count must be at least 1' });
    }

    if (!daysUntilExpiry || daysUntilExpiry < 1) {
      return res.status(400).json({ error: 'Days until expiry must be at least 1' });
    }

    if (!sellerName) {
      return res.status(400).json({ error: 'Seller name is required' });
    }

    const client = await clientPromise;
    const db = client.db();

    // Find available links
    const availableLinks = await db.collection('storedLinks')
      .find({ 
        userId: session.user.id,
        usedInCoupon: false 
      })
      .limit(count)
      .toArray();

    if (availableLinks.length < count) {
      return res.status(400).json({ 
        error: 'Not enough available links',
        available: availableLinks.length,
        requested: count
      });
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(daysUntilExpiry));
    expiresAt.setHours(23, 59, 59, 999);

    // Generate coupons
    const coupons = await Promise.all(
      availableLinks.map(async (link) => {
        const code = nanoid(10);
        const coupon = {
          code,
          claimLink: link.url,
          name: sellerName,
          isClaimed: false,
          claimedAt: null,
          claimedBy: null,
          createdAt: new Date(),
          expiresAt,
          createdBy: session.user.email,
        };

        // Insert coupon
        await db.collection('coupons').insertOne(coupon);

        // Mark link as used
        await db.collection('storedLinks').updateOne(
          { _id: link._id },
          { $set: { usedInCoupon: true, updatedAt: new Date() } }
        );

        return coupon;
      })
    );

    return res.status(200).json({
      count: coupons.length,
      coupons
    });
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 