import { session } from 'grammy';
import { MyContext, SessionData } from './types';


const initialSessionData: SessionData = {
  isUpdatingUsername: false,
  isUpdatingProfilePicture: false,
  isResettingPassword: false
};

export const sessionMiddleware = session<SessionData, MyContext>({
  initial: () => initialSessionData,
});
