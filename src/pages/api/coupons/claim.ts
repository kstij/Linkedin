import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongoose';
import Coupon from '@/models/Coupon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await connectDB();
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    if (coupon.isClaimed) {
      return res.status(400).json({ error: 'Coupon has already been claimed' });
    }

    const now = new Date();
    if (new Date(coupon.expiresAt) < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    // Get client IP and user agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Update coupon
    coupon.isClaimed = true;
    coupon.claimedAt = now;
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
    console.error('Claim error:', error);
    res.status(500).json({ 
      error: 'Failed to claim coupon',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 