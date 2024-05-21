import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
import { UserSettings } from './types';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const getUserSettings = async (userId: number) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const updateUserSettings = async (userId: number, settings: UserSettings) => {
  console.log(userId, settings);
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...settings, updated_at: new Date() });

  if (error) throw error;
  return data;
};
