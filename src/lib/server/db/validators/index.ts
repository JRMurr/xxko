import { createSelectSchema } from 'drizzle-arktype';
import * as schema from '../schema';

export const player = createSelectSchema(schema.player);

export const character = createSelectSchema(schema.character);

export const team = createSelectSchema(schema.team);

export const videoSource = createSelectSchema(schema.videoSource);
