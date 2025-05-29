import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import authOptions from '../auth/[...nextauth]';
import connectDB from '@/lib/db';
import Coupon from '@/models/Coupon';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('API route started');
    const session = await getServerSession(req, res, authOptions);
    console.log('Session:', session);

    if (!session) {
      console.log('No session found in API route');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected');

    if (req.method === 'GET') {
      try {
        console.log('Fetching coupons...');
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        console.log('Coupons fetched:', coupons);
        res.status(200).json(coupons);
      } catch (error) {
        console.error('Error fetching coupons:', error);
        // Send more detailed error information
        res.status(500).json({ 
          error: 'Failed to fetch coupons',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else if (req.method === 'POST') {
      try {
        const { claimLink, name, daysUntilExpiry } = req.body;
        console.log('Received claim link:', claimLink, 'name:', name, 'days until expiry:', daysUntilExpiry);

        if (!claimLink) {
          return res.status(400).json({ error: 'Claim link is required' });
        }

        if (!daysUntilExpiry || daysUntilExpiry < 1) {
          return res.status(400).json({ error: 'Days until expiry must be at least 1' });
        }

        const code = nanoid(10); // Generate a unique 10-character code
        console.log('Generated code:', code);

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(daysUntilExpiry));
        // Set time to end of day (23:59:59)
        expiresAt.setHours(23, 59, 59, 999);

        const coupon = await Coupon.create({
          code,
          claimLink,
          name: name || 'general',
          expiresAt: expiresAt.toISOString(),
          createdBy: session?.user?.email || 'admin',
        });
        console.log('Coupon created:', coupon);

        res.status(201).json(coupon);
      } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ 
          error: 'Failed to create coupon',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 