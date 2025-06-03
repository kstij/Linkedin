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

    // Links Statistics
    const totalLinks = await db.collection('storedLinks').countDocuments({
      userId: session.user.id
    });

    const availableLinks = await db.collection('storedLinks').countDocuments({
      userId: session.user.id,
      usedInCoupon: false
    });

    const usedLinks = totalLinks - availableLinks;

    // Coupons Statistics
    const totalCoupons = await db.collection('coupons').countDocuments({
      createdBy: session.user.email
    });

    const claimedCoupons = await db.collection('coupons').countDocuments({
      createdBy: session.user.email,
      isClaimed: true
    });

    const activeCoupons = await db.collection('coupons').countDocuments({
      createdBy: session.user.email,
      isClaimed: false,
      expiresAt: { $gt: new Date() }
    });

    const expiredCoupons = await db.collection('coupons').countDocuments({
      createdBy: session.user.email,
      isClaimed: false,
      expiresAt: { $lte: new Date() }
    });

    // Recent Activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentImports = await db.collection('storedLinks').countDocuments({
      userId: session.user.id,
      createdAt: { $gte: sevenDaysAgo }
    });

    const recentGenerated = await db.collection('coupons').countDocuments({
      createdBy: session.user.email,
      createdAt: { $gte: sevenDaysAgo }
    });

    const recentClaims = await db.collection('coupons').countDocuments({
      createdBy: session.user.email,
      isClaimed: true,
      claimedAt: { $gte: sevenDaysAgo }
    });

    return res.status(200).json({
      links: {
        total: totalLinks,
        available: availableLinks,
        used: usedLinks
      },
      coupons: {
        total: totalCoupons,
        claimed: claimedCoupons,
        active: activeCoupons,
        expired: expiredCoupons
      },
      recentActivity: {
        imports: recentImports,
        generated: recentGenerated,
        claims: recentClaims
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 