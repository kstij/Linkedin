import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import authOptions from '../auth/[...nextauth]';
import connectDB from '@/lib/db';
import Coupon from '@/models/Coupon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await connectDB();
    const { couponId, daysToAdd } = req.body;

    if (!couponId || !daysToAdd) {
      return res.status(400).json({ error: 'Coupon ID and days to add are required' });
    }

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Calculate new expiration date
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + parseInt(daysToAdd));
    newExpiryDate.setHours(23, 59, 59, 999);

    // Update coupon
    coupon.expiresAt = newExpiryDate.toISOString();
    await coupon.save();

    res.status(200).json({ 
      message: 'Coupon expiration extended successfully',
      coupon 
    });
  } catch (error) {
    console.error('Error extending coupon:', error);
    res.status(500).json({ error: 'Failed to extend coupon expiration' });
  }
} 