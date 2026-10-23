import { User } from '../users/index.js';

declare module 'express' {
  interface Request {
    user: User;
  }
}

declare module 'express-session' {
  interface SessionData {
    user?: User | null;
  }
}

export {};
