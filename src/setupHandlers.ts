import { Bot, InlineKeyboard } from 'grammy';
import { MyContext } from './types';
import { getUserSettings, updateUserSettings } from './supabase';
import bcrypt from 'bcrypt';

const saltRounds = 10;

export const setupHandlers = (bot: Bot<MyContext>) => {

  bot.command('start', async (ctx) => {
    await handleStart(ctx);
  });

  bot.command('settings', async (ctx) => {
    await ensureUserRegistered(ctx);
    await showMainMenu(ctx);
  });

  bot.callbackQuery('profile', async (ctx) => {
    await ensureUserRegistered(ctx);
    await showProfileMenu(ctx);
  });

  bot.callbackQuery('notifications', async (ctx) => {
    await ensureUserRegistered(ctx);
    await showNotificationsMenu(ctx);
  });

  bot.callbackQuery('security', async (ctx) => {
    await ensureUserRegistered(ctx);
    await showSecurityMenu(ctx);
  });

  bot.callbackQuery('back', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMainMenu(ctx);
  });

  bot.callbackQuery('update_username', async (ctx) => {
    await ensureUserRegistered(ctx);
    await ctx.editMessageText('Please send your new username.', {
      reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
    }).catch(async () => {
      await ctx.reply('Please send your new username.', {
        reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
      });
    });
    ctx.session.isUpdatingUsername = true;
  });

  bot.callbackQuery('update_profile_picture', async (ctx) => {
    await ensureUserRegistered(ctx);
    await ctx.editMessageText('Please send your new profile picture.', {
      reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
    }).catch(async () => {
      await ctx.reply('Please send your new profile picture.', {
        reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
      });
    });
    ctx.session.isUpdatingProfilePicture = true;
  });

  bot.callbackQuery('email_alerts', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ensureUserRegistered(ctx);

    let userSettings = await getUserSettings(userId);
    const newSetting = !userSettings.email_alerts;
    await updateUserSettings(userId, { email_alerts: newSetting });

    await ctx.answerCallbackQuery(`Email alerts ${newSetting ? 'enabled' : 'disabled'}`);
    await showNotificationsMenu(ctx);
  });

  bot.callbackQuery('push_notifications', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ensureUserRegistered(ctx);

    let userSettings = await getUserSettings(userId);
    const newSetting = !userSettings.push_notifications;
    await updateUserSettings(userId, { push_notifications: newSetting });

    await ctx.answerCallbackQuery(`Push notifications ${newSetting ? 'enabled' : 'disabled'}`);
    await showNotificationsMenu(ctx);
  });

  bot.callbackQuery('two_factor', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ensureUserRegistered(ctx);

    let userSettings = await getUserSettings(userId);
    const newSetting = !userSettings.two_factor;
    await updateUserSettings(userId, { two_factor: newSetting });

    await ctx.answerCallbackQuery(`Two-factor authentication ${newSetting ? 'enabled' : 'disabled'}`);
    await showSecurityMenu(ctx);
  });

  bot.callbackQuery('reset_password', async (ctx) => {
    await ensureUserRegistered(ctx);
    await ctx.editMessageText('Please send your new password.', {
      reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
    }).catch(async () => {
      await ctx.reply('Please send your new password.', {
        reply_markup: new InlineKeyboard().text('Cancel', 'cancel'),
      });
    });
    ctx.session.isResettingPassword = true;
  });

  bot.callbackQuery('cancel', async (ctx) => {
    await ctx.editMessageText('Action cancelled.').catch(async () => {
      await ctx.reply('Action cancelled.');
    });
    resetSessionState(ctx);
    await showMainMenu(ctx);
  });

  bot.on('message:text', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ensureUserRegistered(ctx);

    if (ctx.session.isUpdatingUsername) {
      const username = ctx.message.text;
      if (username) {
        await updateUserSettings(userId, { username });
        await ctx.reply(`Username updated to ${username}`);
        resetSessionState(ctx);
        await showProfileMenu(ctx);
      }
    } else if (ctx.session.isResettingPassword) {
      const password = ctx.message.text;
      if (password) {
        const hash = await bcrypt.hash(password, saltRounds);
        await updateUserSettings(userId, { password: hash });
        await ctx.reply('Password changed.');
        resetSessionState(ctx);
        await showSecurityMenu(ctx);
      }
    }
  });

  bot.on('message:photo', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ensureUserRegistered(ctx);

    if (ctx.session.isUpdatingProfilePicture) {
      const fileId = ctx.message.photo?.[ctx.message.photo.length - 1]?.file_id;
      if (fileId) {
        await updateUserSettings(userId, { picture: fileId });
        await ctx.reply('Profile picture updated.');
        resetSessionState(ctx);
        await showProfileMenu(ctx);
      }
    }
  });

  const ensureUserRegistered = async (ctx: MyContext) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      // Attempt to get user settings, if not found, create a new user entry
      await getUserSettings(userId);
    } catch (error) {
      // If error, assume user doesn't exist and create new user settings
      await updateUserSettings(userId, {});
    }
  };

  const now = () => new Date();

  const handleStart = async (ctx: MyContext) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ensureUserRegistered(ctx);
    await ctx.reply('Welcome! Use /settings to update your profile.');
  };

  const showMainMenu = async (ctx: MyContext) => {
    const mainMenuKeyboard = new InlineKeyboard()
      .text('Profile', 'profile')
      .row()
      .text('Notifications', 'notifications')
      .row()
      .text('Security', 'security');

    await ctx.editMessageText('Main menu', {
      reply_markup: mainMenuKeyboard,
    }).catch(async () => {
      await ctx.reply('Main menu', {
        reply_markup: mainMenuKeyboard,
      });
    });
  };

  const showProfileMenu = async (ctx: MyContext) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userSettings = await getUserSettings(userId);
    const profileKeyboard = new InlineKeyboard()
      .text('Update Username', 'update_username')
      .row()
      .text('Update Profile Picture', 'update_profile_picture')
      .row()
      .text('Back', 'back');

    let title = 'Profile settings';
    if (userSettings.username) {
      title = `Profile settings for ${userSettings.username}`;
    }

    if (userSettings.picture) {
      await ctx.editMessageMedia({
        type: 'photo',
        media: userSettings.picture,
        caption: title,
      }, {
        reply_markup: profileKeyboard,
      }).catch(async () => {
        await ctx.replyWithPhoto(userSettings.picture, {
          caption: title,
          reply_markup: profileKeyboard,
        });
      });
    } else {
      await ctx.editMessageText(title, {
        reply_markup: profileKeyboard,
      }).catch(async () => {
        await ctx.reply(title, {
          reply_markup: profileKeyboard,
        });
      });
    }
  };

  const showNotificationsMenu = async (ctx: MyContext) => {
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
    }).catch(async () => {
      await ctx.reply('Notification preferences', {
        reply_markup: notificationsKeyboard,
      });
    });
  };

  const showSecurityMenu = async (ctx: MyContext) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userSettings = await getUserSettings(userId);

    const securityKeyboard = new InlineKeyboard()
      .text(userSettings.two_factor ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication', 'two_factor')
      .row()
      .text('Reset Password', 'reset_password')
      .row()
      .text('Back', 'back');

    await ctx.editMessageText('Security settings', {
      reply_markup: securityKeyboard,
    }).catch(async () => {
      await ctx.reply('Security settings', {
        reply_markup: securityKeyboard,
      });
    });
  };

  const resetSessionState = (ctx: MyContext) => {
    ctx.session.isUpdatingUsername = false;
    ctx.session.isUpdatingProfilePicture = false;
    ctx.session.isResettingPassword = false;
  };

  bot.catch((err) => {
    console.error('Error in middleware:', err);
  });
};
