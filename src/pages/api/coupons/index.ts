import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import authOptions from '../auth/[...nextauth]';
import connectDB from '@/lib/db';
import Coupon from '@/models/Coupon';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      console.log('No session found in API route');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Session found in API route:', session);

    await connectDB();

    if (req.method === 'GET') {
      try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.status(200).json(coupons);
      } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
      }
    } else if (req.method === 'POST') {
      try {
        const { claimLink } = req.body;

        if (!claimLink) {
          return res.status(400).json({ error: 'Claim link is required' });
        }

        const code = nanoid(10); // Generate a unique 10-character code
        const coupon = await Coupon.create({
          code,
          claimLink,
          createdBy: session?.user?.email || 'admin',
        });

        res.status(201).json(coupon);
      } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ error: 'Failed to create coupon' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 