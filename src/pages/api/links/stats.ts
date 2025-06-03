import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get total links in storage (like total money in bank)
    const totalLinks = await db.collection('storedLinks').countDocuments({
      userId: session.user.id
    });

    // Get available links (not used in coupons yet)
    const availableLinks = await db.collection('storedLinks').countDocuments({
      userId: session.user.id,
      usedInCoupon: false
    });

    return res.status(200).json({
      totalLinks,
      availableLinks
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 