import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import authOptions from '../auth/[...nextauth]';
import connectDB from '@/lib/mongoose';
import Coupon from '@/models/Coupon';
import { nanoid } from 'nanoid';
import type { Session } from 'next-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions) as Session & { user?: { email?: string } };

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await connectDB();

    if (req.method === 'GET') {
      const coupons = await Coupon.find().sort({ createdAt: -1 });
      res.status(200).json(coupons);
    } 
    else if (req.method === 'POST') {
      const { claimLink, name, daysUntilExpiry } = req.body;

      if (!claimLink) {
        return res.status(400).json({ error: 'Claim link is required' });
      }

      if (!daysUntilExpiry || daysUntilExpiry < 1) {
        return res.status(400).json({ error: 'Days until expiry must be at least 1' });
      }

      const code = nanoid(10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(daysUntilExpiry));
      expiresAt.setHours(23, 59, 59, 999);

      const coupon = await Coupon.create({
        code,
        claimLink,
        name: name || 'general',
        expiresAt: expiresAt.toISOString(),
        createdBy: session.user?.email || 'admin',
      });

      res.status(201).json(coupon);
    } 
    else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 