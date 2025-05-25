import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import Coupon from '@/models/Coupon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await connectDB();

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid code' });
    }

    if (coupon.isClaimed) {
      return res.status(400).json({ error: 'Code has already been claimed' });
    }

    // Get IP address and user agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Update coupon with claim details
    coupon.isClaimed = true;
    coupon.claimedAt = new Date();
    coupon.claimedBy = {
      ip: ip as string,
      userAgent: userAgent as string,
    };

    await coupon.save();

    res.status(200).json({ claimLink: coupon.claimLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to redeem coupon' });
  }
} 