import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Session user ID:', session.user.id); // Debug log

    const { links } = req.body;

    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({ error: 'No links provided' });
    }

    console.log('Importing links:', links); // Debug log

    const client = await clientPromise;
    const db = client.db();

    // Create stored links
    const storedLinks = await Promise.all(
      links.map(async (url) => {
        const result = await db.collection('storedLinks').insertOne({
          url,
          userId: session.user.id,
          usedInCoupon: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('Stored link result:', result); // Debug log
        return result;
      })
    );

    console.log('Total links stored:', storedLinks.length); // Debug log

    // Get updated counts
    const totalLinks = await db.collection('storedLinks').countDocuments({
      userId: session.user.id
    });
    const availableLinks = await db.collection('storedLinks').countDocuments({
      userId: session.user.id,
      usedInCoupon: false
    });

    console.log('Updated counts:', { totalLinks, availableLinks }); // Debug log

    return res.status(200).json({ 
      count: storedLinks.length,
      stats: {
        total: totalLinks,
        available: availableLinks
      },
      message: 'Links imported successfully'
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 