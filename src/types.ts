import { Context as BaseContext } from 'grammy';
import { SessionFlavor } from 'grammy';

// Define the structure of user settings
export interface UserSettings {
  username?: string;
  picture?: string;
  email_alerts?: boolean;
  push_notifications?: boolean;
  two_factor?: boolean;
  updated_at?: Date;
}

export interface SessionData {
  isUpdatingUsername: boolean;
  isUpdatingProfilePicture: boolean;
  isResettingPassword: boolean;
  username?: string;
}


// Define the custom context type for the bot
export type MyContext = BaseContext & SessionFlavor<SessionData>;
