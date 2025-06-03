import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import authOptions from '../auth/[...nextauth]';
import connectDB from '@/lib/db';
import Coupon from '@/models/Coupon';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions) as { user?: { email?: string } };
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await connectDB();
    const { links, name, daysUntilExpiry } = req.body;
    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({ error: 'Links are required' });
    }
    if (!daysUntilExpiry || daysUntilExpiry < 1) {
      return res.status(400).json({ error: 'Days until expiry must be at least 1' });
    }
    const createdBy = session?.user?.email || 'admin';
    const expiresAt = () => {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(daysUntilExpiry));
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    };
    const coupons = await Promise.all(
      links.map(async (claimLink: string) => {
        const coupon = await Coupon.create({
          code: nanoid(10),
          claimLink,
          name: name || 'general',
          expiresAt: expiresAt(),
          createdBy,
          source: 'added',
        });
        return coupon;
      })
    );
    res.status(201).json(coupons);
  } catch (error) {
    console.error('Error creating bulk coupons:', error);
    res.status(500).json({ error: 'Failed to create bulk coupons' });
  }
} 