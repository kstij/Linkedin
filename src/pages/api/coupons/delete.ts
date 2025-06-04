import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { couponId } = req.body;
    if (!couponId) {
      return res.status(400).json({ error: 'Coupon ID is required' });
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('coupons').deleteOne({ _id: new ObjectId(couponId) });

    if (result.deletedCount === 1) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ error: 'Coupon not found' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
} 