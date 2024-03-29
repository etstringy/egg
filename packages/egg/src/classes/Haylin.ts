import Discord, { Intents } from "discord.js";
import fs from "fs";
import path from "path";
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { PrismaClient } from '@prisma/client'

import { YarnGlobals, YarnShardMessage } from "../utils/types.bot"
import Loaders from "./system/Loaders";
import Log from "./system/Log";
import notifications from "./system/Notifications";


export default class Haylin {
  private loader: Loaders;
  client: Discord.Client;
  globals: YarnGlobals;

  constructor(){
    // Globals
    this.globals = {}
    this.globals.log = new Log({ prefix: "Bot", color: 'magenta', shardId: this.globals.shardId });

    // Sentry
    if(process.env.SENTRY){
      Sentry.init({
        dsn: process.env.SENTRY,
        tracesSampleRate: 1.0,
        environment: process.env.NODE_ENV,
        integrations: [
          new Sentry.Integrations.Console(),
        ],
        debug: true
      });
      this.globals.log.log("Sentry enabled")
    }

    this.globals.commands = new Map;
    this.globals.aliases = new Map;
    this.globals.config = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), '..', '..', 'config', 'conf.json'), 
        { encoding: 'utf-8' }
      )
    ) as any;

    // Environment
    (process.env.NODE_ENV === "production") ? this.globals.env = "production" : this.globals.env = "development";

    // Client
    this.client = new Discord.Client({ 
      intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS
      ],
      partials: [
        "REACTION",
        "MESSAGE"
      ],
      ws: {
        properties: {
          $browser: "Discord iOS"
        }
      }
    });

    // Other Globals
    this.globals.db = new PrismaClient()
    this.globals.notifications = notifications;
    this.init();
  }

  async init(){
    this.loader = new Loaders(this.client, this.globals)
    this.globals.log.log("Loading Haylin")
    if(this.globals.env == "production") this.globals.log.log("RUNNING IN PRODUCTION MODE")

    // Load events and jobs
    await this.loader.loadEvents(path.join(__dirname, '..', 'events'))
    await this.loader.loadJobs(path.join(__dirname, '..', 'jobs'))

    await this.client.login(process.env.AUTH_TOKEN)
    this.client.user.setPresence({
      "activities": [
        {"type": "PLAYING", "name": "🔃 starting up.."}
      ]
    })

    // Load commands from multiple folders and merge maps
    const dirs = [
      path.join(__dirname, '..', 'interactions', 'commands'),
      path.join(__dirname, '..', 'interactions', 'ctx')
    ];

    for await (const dir of dirs){
      const ints = await this.loader.loadInteractions(dir);
      ints.forEach((v, k) => { 
        this.globals.commands.set(k, v) 
      })
    }

    await this.loader.updateSlashCommands(this.globals.commands)

    this.client.user.setPresence({
      "activities": [
        {"type": "LISTENING", "name": `Ping! 2`},
      ]
    })
    this.globals.log.log("Initialization complete");
  }
}