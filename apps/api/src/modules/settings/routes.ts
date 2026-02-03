import { Router } from 'express';
import * as controller from './controller.js';

export const settingsRouter = Router();

settingsRouter.get('/settings/:key', controller.get);
settingsRouter.put('/settings/:key', controller.put);
