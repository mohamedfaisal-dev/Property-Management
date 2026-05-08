import { NextApiRequest, NextApiResponse } from 'next';
import app from '../../server/app';

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return app(req as any, res as any);
}
