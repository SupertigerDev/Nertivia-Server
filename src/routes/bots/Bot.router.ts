import {Router} from 'express'

import {botCreate} from './botCreate.route';
import {botGetAll} from './botGetAll.route';
import {botGet} from './botGet.route';
import {botJoin} from './botJoin.route';
import {botUpdate} from './botUpdate.route';
import {botDelete} from './botDelete.route';
import {botCommands} from './botCommands.route';
import {botResetToken} from './botResetToken.route';

const BotRouter = Router()

botCreate(BotRouter)
botGetAll(BotRouter)
botGet(BotRouter)
botJoin(BotRouter)
botUpdate(BotRouter)
botDelete(BotRouter)
botCommands(BotRouter)
botResetToken(BotRouter)

export {BotRouter}
