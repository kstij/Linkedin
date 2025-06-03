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

    console.log('Session user ID:', session.user.id); // Debug log

    const client = await clientPromise;
    const db = client.db();

    // Get total links
    const totalLinks = await db.collection('storedLinks').countDocuments({
      userId: session.user.id
    });

    // Get available links (not used in any coupon)
    const availableLinks = await db.collection('storedLinks').countDocuments({
      userId: session.user.id,
      usedInCoupon: false
    });

    console.log('Stats query results:', { totalLinks, availableLinks }); // Debug log

    // Get some sample links for debugging
    const sampleLinks = await db.collection('storedLinks')
      .find({ userId: session.user.id })
      .limit(5)
      .toArray();

    console.log('Sample links:', sampleLinks); // Debug log

    const response = {
      storedLinks: {
        total: totalLinks,
        available: availableLinks
      },
      debug: {
        userId: session.user.id,
        sampleLinks
      }
    };

    console.log('Sending response:', response); // Debug log

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 