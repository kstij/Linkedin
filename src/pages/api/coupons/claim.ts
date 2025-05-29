import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import Coupon from '@/models/Coupon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }

    if (coupon.isClaimed) {
      return res.status(400).json({ error: 'Coupon has already been claimed' });
    }

    // Check if coupon is expired
    if (new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ 
        error: 'Coupon has expired. Please contact the admin for more info.' 
      });
    }

    // Get client IP and user agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Update coupon
    coupon.isClaimed = true;
    coupon.claimedAt = new Date();
    coupon.claimedBy = {
      ip: ip as string,
      userAgent: userAgent as string,
    };

    await coupon.save();

    res.status(200).json({ 
      message: 'Coupon claimed successfully',
      claimLink: coupon.claimLink 
    });
  } catch (error) {
    console.error('Error claiming coupon:', error);
    res.status(500).json({ error: 'Failed to claim coupon' });
  }
} 