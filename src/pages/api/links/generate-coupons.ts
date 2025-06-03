import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import authOptions from '../auth/[...nextauth]';
import connectDB from '@/lib/mongoose';
import StoredLink from '@/models/StoredLink';
import Coupon from '@/models/Coupon';
import { nanoid } from 'nanoid';
import type { Session } from 'next-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const session = await getServerSession(req, res, authOptions) as Session & { user?: { email?: string } };

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await connectDB();

    const { count, daysUntilExpiry } = req.body;

    if (!count || count < 1) {
      return res.status(400).json({ error: 'Count must be at least 1' });
    }

    if (!daysUntilExpiry || daysUntilExpiry < 1) {
      return res.status(400).json({ error: 'Days until expiry must be at least 1' });
    }

    // Find unused links
    const unusedLinks = await StoredLink.find({ isUsed: false }).limit(count);

    if (unusedLinks.length < count) {
      return res.status(400).json({ 
        error: 'Not enough unused links available',
        available: unusedLinks.length,
        requested: count
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(daysUntilExpiry));
    expiresAt.setHours(23, 59, 59, 999);

    // Generate coupons and mark links as used
    const coupons = await Promise.all(
      unusedLinks.map(async (storedLink) => {
        const code = nanoid(10);
        const coupon = await Coupon.create({
          code,
          claimLink: storedLink.link,
          name: 'generated',
          expiresAt: expiresAt.toISOString(),
          createdBy: session.user?.email || 'admin',
        });

        // Mark link as used
        storedLink.isUsed = true;
        storedLink.usedAt = new Date();
        await storedLink.save();

        return coupon;
      })
    );

    res.status(201).json({ 
      message: 'Coupons generated successfully',
      count: coupons.length,
      coupons 
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate coupons',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 