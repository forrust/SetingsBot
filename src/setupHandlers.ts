import { Bot, InlineKeyboard } from 'grammy';
import { MyContext } from './types';
import { getUserSettings, updateUserSettings } from './supabase';

export const setupHandlers = (bot: Bot<MyContext>) => {

  bot.command('start', async (ctx) => {
    await handleStart(ctx);
  });

  bot.command('settings', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    let userSettings;
    try {
      userSettings = await getUserSettings(userId);
    } catch (error) {
      // console.log('User does not exist, creating user...');
      await updateUserSettings(userId, { updated_at: now() });
      userSettings = await getUserSettings(userId);
    }

    if (userSettings.username) {
      ctx.session.username = userSettings.username;
    } else {
      ctx.session.username = 'User'
    }

    const keyboard = new InlineKeyboard()
      .text('Profile', 'profile')
      .row()
      .text('Notifications', 'notifications')
      .row()
      .text('Security', 'security');

    await ctx.reply(`Hi ${ctx.session.username}, welcome to our settings bot, please make a choice.`, {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery('profile', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const profileKeyboard = new InlineKeyboard()
      .text('Update Username', 'update_username')
      .row()
      .text('Update Profile Picture', 'update_profile_picture')
      .row()
      .text('Back', 'back');

    await ctx.editMessageText('Profile settings', {
      reply_markup: profileKeyboard,
    });
  });

  bot.callbackQuery('notifications', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userSettings = await getUserSettings(userId);

    const notificationsKeyboard = new InlineKeyboard()
      .text(userSettings.email_alerts ? 'Disable Email Alerts' : 'Enable Email Alerts', 'email_alerts')
      .row()
      .text(userSettings.push_notifications ? 'Disable Push Notifications' : 'Enable Push Notifications', 'push_notifications')
      .row()
      .text('Back', 'back');

    await ctx.editMessageText('Notification preferences', {
      reply_markup: notificationsKeyboard,
    });
  });

  bot.callbackQuery('security', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userSettings = await getUserSettings(userId);

    const securityKeyboard = new InlineKeyboard()
      .text(userSettings.two_factor ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication', 'two_factor')
      .row()
      .text('Reset Password', 'reset_password')
      .row()
      .text('Back', 'back');

    await ctx.editMessageText('Security settings:', {
      reply_markup: securityKeyboard,
    });
  });

  bot.callbackQuery('back', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage();
    await showMainMenu(ctx);
  });

  bot.callbackQuery('update_username', async (ctx) => {
    await ctx.editMessageText(`Update your username (${ctx.session.username})`, {
      reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
    });
    ctx.session.isUpdatingUsername = true;
  });

  bot.callbackQuery('update_profile_picture', async (ctx) => {
    await ctx.editMessageText('Send your new profile picture', {
      reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
    });
    ctx.session.isUpdatingProfilePicture = true;
  });

  bot.callbackQuery('email_alerts', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    let userSettings = await getUserSettings(userId);
    const newSetting = !userSettings.email_alerts;
    await updateUserSettings(userId, { email_alerts: newSetting, updated_at: now() });

    await ctx.answerCallbackQuery(`Email alerts ${newSetting ? 'enabled' : 'disabled'}`);
    await showMainMenu(ctx);
  });

  bot.callbackQuery('push_notifications', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    let userSettings = await getUserSettings(userId);
    const newSetting = !userSettings.push_notifications;
    await updateUserSettings(userId, { push_notifications: newSetting, updated_at: now() });

    await ctx.answerCallbackQuery(`Push notifications ${newSetting ? 'enabled' : 'disabled'}`);
    await showMainMenu(ctx);
  });

  bot.callbackQuery('two_factor', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    let userSettings = await getUserSettings(userId);
    const newSetting = !userSettings.two_factor;
    await updateUserSettings(userId, { two_factor: newSetting, updated_at: now() });

    await ctx.answerCallbackQuery(`Two-factor authentication ${newSetting ? 'enabled' : 'disabled'}`);
    await showMainMenu(ctx);
  });

  bot.callbackQuery('reset_password', async (ctx) => {
    await ctx.editMessageText('Send your new password', {
      reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
    });
    ctx.session.isResettingPassword = true;
  });

  bot.callbackQuery('cancel', async (ctx) => {
    await ctx.editMessageText('Action cancelled.');
    resetSessionState(ctx);
    await showMainMenu(ctx);
  });

  bot.on('message:text', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (ctx.session.isUpdatingUsername) {
      const username = ctx.message.text;
      if (username) {
        await updateUserSettings(userId, { username, updated_at: now() });
        await ctx.reply(`Username updated to ${username}`);
        ctx.session.username = username;
        resetSessionState(ctx);
        await showMainMenu(ctx);
      }
    } else if (ctx.session.isResettingPassword) {
      const password = ctx.message.text;
      if (password) {
        // Implement password update logic here
        await ctx.reply('Password reset not yet implemented.');
        resetSessionState(ctx);
        await showMainMenu(ctx);
      }
    }
  });

  bot.on('message:photo', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (ctx.session.isUpdatingProfilePicture) {
      const fileId = ctx.message.photo?.[ctx.message.photo.length - 1]?.file_id;
      if (fileId) {
        await updateUserSettings(userId, { picture: fileId, updated_at: now() });
        await ctx.reply('Profile picture updated.');
        resetSessionState(ctx);
        await showMainMenu(ctx);
      }
    }
  });

  const now = () => new Date();

  const handleStart = async (ctx: MyContext) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply('Welcome! Use /settings to update your profile.');
  };

  const showMainMenu = async (ctx: MyContext) => {
    const mainMenuKeyboard = new InlineKeyboard()
      .text('Profile', 'profile')
      .row()
      .text('Notifications', 'notifications')
      .row()
      .text('Security', 'security');

    await ctx.reply('Main menu', {
      reply_markup: mainMenuKeyboard,
    });
  };

  const resetSessionState = (ctx: MyContext) => {
    ctx.session.isUpdatingUsername = false;
    ctx.session.isUpdatingProfilePicture = false;
    ctx.session.isResettingPassword = false;
  };
};
