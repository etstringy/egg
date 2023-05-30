import { YarnGlobals } from "../utils/types.bot"
import Discord from 'discord.js';
import { imgur } from "../utils/apis";
import { Haylin } from '../index';
import { handleErr } from "../utils/ErrorHandler";

const updateBannerForGuild = async (guildProfile: any) => {
  if(guildProfile.bannerAlbumId == null) return;

  let req;
  try {
    req = await imgur.get<any>(`/album/${guildProfile.bannerAlbumId}`)
  } catch(_) { null }

  if(req.status != 200) return;
  
  const images = req.data.data.images
    .filter((image: any) => {
      if(image.type == "image/jpeg") return true;
      if(image.type == "image/png") return true;
      return false;
    })
    .map((image:any) => (image.link))

  if(images.length < 1) return;

  // select a random image and set it as the banner of the Discord Guild
  const randomImage = images[Math.floor(Math.random() * images.length)];
  const guild = Haylin.client.guilds.cache.get(guildProfile.guildId);

  try {
    await guild.setBanner(randomImage, `Randomly from Imgur album: https://imgur.com/a/${guildProfile.bannerAlbumId}`)
  } catch(err) {
    handleErr("error setting banner: " + err)
  }

}

const delay = 60000 * 30 // every 30 minutes
const run = async (client: Discord.Client, globals: YarnGlobals) => {
  const guilds = await Haylin.globals.db.guild.findMany({
    where: {
      bannerEnabled: true
    }
  })

  guilds.forEach(async (guild: any) => {
    updateBannerForGuild(guild)
  })
}

export { delay, run, updateBannerForGuild }