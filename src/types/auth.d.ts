declare namespace Express {
    interface Request {
      user?: {
        uid: string;
        role: 'admin' | 'user';
        email?: string;
      };
    }
  }
  