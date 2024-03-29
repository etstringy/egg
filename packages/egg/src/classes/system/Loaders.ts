import * as fs from "fs";
import * as path from "path";
import * as Discord from "discord.js";
import { YarnGlobals } from "../../utils/types.bot"
import Command from "../commands/Command";
import Log from "./Log";
import { getFluteGangId, getPermissionRoles } from "../../static/fluteGang";
import { handleErr } from "../../utils/ErrorHandler";

/**
 * @classdesc Command & event loader for Yarn
 * @param client Discord Client instance
 */

class Loaders {
  private globals: YarnGlobals;
  private client: Discord.Client;
  private log: Log;

  constructor(client: Discord.Client, globals: YarnGlobals) {
    this.client = client;
    this.globals = globals;
    this.log = new Log({ prefix: "Loaders", color: 'blue', shardId: this.globals.shardId })
  }

  /**
   * Loads interactions (commands v2) with .js and .ts extension in folder recursively
   * @param directory Directory of commands (usually "commands")
   */
  loadInteractions = async (directory: string): Promise<Map<string, Command>> => {
    let interactions: Map<string, Command> = new Map;
    let loaded: number = 0;
    if(!fs.existsSync(directory)){
      this.log.log(`Directory ${directory} does not exist`)
      return interactions;
    }

    return new Promise((res, rej) => {

      try {
        const files = fs.readdirSync(directory, { withFileTypes: true })
        files.forEach(async f => {
          if (f.isDirectory()) {
            const recursion = await this.loadInteractions(path.join(directory, f.name));
            recursion.forEach((v, k) => { interactions.set(k, v) })
          }

          let fileExtension = f.name.split(".")[f.name.split(".").length - 1]
          let moduleName = f.name.replace(".js", "").replace(".ts", "")
          if (!f.name.endsWith(".js") && !f.name.endsWith(".ts")) return;
          if (f.name.split("")[0] == "_") return;

          try {
            const interaction: { default: Command } = await import(path.join(directory, moduleName))
            if (!interaction.default.meta.enabled) return "disabled";
            interactions.set(interaction.default.meta.name, interaction.default);
            this.log.log(`Loaded interaction ${f.name}`);
          } catch (err) {
            this.log.log(`Error loading interaction ${f.name}!`)
            handleErr(err)
          }
        })
        res(interactions)
      } catch (err) {
        this.log.log("Error loading interactions!")
        handleErr(err)
        rej(err)
      }
    })
  }

  updateSlashCommands = async (commands: Map<string, Command>): Promise<void> => {
    const log = new Log({ prefix: "SlashManager", color: 'blue', shardId: this.globals.shardId })

    try {
      if (!this.client.application?.owner) await this.client.application?.fetch();

      let data: Discord.ApplicationCommandData[] = []
      let dev_data: Discord.ApplicationCommandData[] = []

      // map commands
      commands.forEach((value: Command, key: string) => {
        data.push({
          name: value.meta.name,
          description: value.meta.description,
          options: value.meta.options,
          type: value.meta.type || "CHAT_INPUT",
          defaultPermission: (value.meta.restrict == undefined)
        })
      })

      // push commands
      if (this.globals.env === "development") {
        const devsrv = await this.client.guilds.fetch(this.globals.config.serverId)
        await devsrv.commands.set(data.concat(dev_data));
        await this.client.application?.commands.set([]);
      } else {
        await this.client.application?.commands.set(data);
      }

      // map permissions
      const fg = await this.client.guilds.fetch(getFluteGangId())
      const fgCommands = await fg.commands.fetch();
      
      // fgCommands.forEach(async (c) => {
      //   let perms: Discord.ApplicationCommandPermissionData[] = [
      //     {
      //       id: "577743466940071949",
      //       permission: true,
      //       type: "USER",
      //     },
      //     {
      //       id: "455160065050148865",
      //       permission: true,
      //       type: "USER",
      //     },
      //   ]

      //   const localCommand = commands.get(c.name)
      //   if(!localCommand.meta.restrict) return;

      //   getPermissionRoles()[localCommand.meta.restrict].forEach(r => {
      //     if(!r) return;
      //     perms.push({
      //       id: r,
      //       permission: true,
      //       type: "ROLE",
      //     })
      //   })

      //   await c.permissions.set({
      //     permissions: perms
      //   })
      //   log.log(`Set permissions for /${c.name}`)
      // })

      log.log(`Updated ${commands.size} slash commands!`)
    } catch (err) {
      log.log("Error updating slash commands! Retrying in 2 seconds")
      console.log(err);
      setTimeout(() => this.updateSlashCommands(commands), 2000)
    }
  }

  /**
   * Loads events from .js or .ts files in one folder.
   * @param directory Directory of events (usually "events")
   */
  loadEvents = async (directory: string): Promise<void> => {
    if (!fs.existsSync(directory)) {
      this.log.log(`Directory ${directory} does not exist`)
      return;
    }
    let processed = 0, loaded = 0;

    fs.readdir(directory, { withFileTypes: true }, async (err, files: fs.Dirent[]) => {
      if (err) throw err;
      if (files.length === 0) return this.log.log(`No events to load`)

      files.forEach(async (f: fs.Dirent) => {
        if (f.isDirectory()) {
          await this.loadEvents(path.join(directory, f.name));
        }

        let fileExtension = f.name.split(".")[f.name.split(".").length - 1]
        let moduleName = f.name.replace(".js", "").replace(".ts", "")
        if (!f.name.endsWith(".js") && !f.name.endsWith(".ts")) return;
        if (f.name.split("")[0] == "_") return;

        try {
          // { default: (args: any, client: Discord.Client, globals: YarnGlobals) => any }
          const event: {default: (...args: any[]) => any} = await import(path.join(directory, moduleName))
          this.client.on(moduleName, (...args) => {
            args.push(this.client, this.globals)
            event.default.apply(this, args)
          });
          this.log.log(`Loaded event ${f.name}`);
        } catch (err) {
          this.log.log(`Error loading event ${f.name}!`)
          handleErr(err)
        }
      })
    })
  }

  /**
  * Loads jobs from .js or .ts files in one folder.
  * @param directory Directory of events (usually "events")
  */
  loadJobs = async (directory: string): Promise<void> => {
    if (!fs.existsSync(directory)) {
      this.log.log(`Directory ${directory} does not exist`)
      return;
    }

    fs.readdir(directory, { withFileTypes: true }, async (err, files: fs.Dirent[]) => {
      if (err) throw err;
      if (files.length === 0) return this.log.log(`No jobs to load`)

      let loaded = 0;

      files.forEach((f: fs.Dirent) => {
        let fileExtension = f.name.split(".")[f.name.split(".").length - 1]
        let moduleName = f.name.replace(".js", "").replace(".ts", "")

        if (f.isDirectory()) return;
        if (!f.name.endsWith(".js") && !f.name.endsWith(".ts")) return;

        this.log.log(`Loading event ${f.name}`)
        let relativePath = directory.split(path.sep).slice(directory.split(path.sep).indexOf("commands")).join("/")

        import("./" + path.join(relativePath, moduleName))
          .then((job) => {
            setInterval(job.run, job.delay, [this.client, this.globals])
            this.log.log(`Loaded job ${f.name}`)
          })
          .catch((err) => {
            this.log.log(`Job ${f.name} failed to load!`)
            handleErr(err);
          })

        loaded++;
      })
    })
  }
}

export default Loaders;