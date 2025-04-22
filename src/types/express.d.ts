import { Request } from 'express';
import { IUser } from '../models/user.model';
import { IOrganization } from '../models/organization.model';
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      organization?: IOrganization;
      paginatedResults?: any;
    }
  }
} 
