import { Bot } from 'grammy';
import { BOT_TOKEN } from './config';
import { setupHandlers } from './setupHandlers';
import { sessionMiddleware } from './session';
import { MyContext } from './types';

const bot = new Bot<MyContext>(BOT_TOKEN);

// Setup and start the bot
bot.use(sessionMiddleware);
setupHandlers(bot);
bot.start();
console.debug('bot is running...')