import dayjs from "dayjs";
import Discord from "discord.js";
import getGuild from "../db/utils/getGuild";
import { YarnGlobals } from "../utils/types.bot";

const unicodeEmoji = new RegExp("[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]", "ug")

export default async (_reaction: Discord.MessageReaction, user: Discord.User, client: Discord.Client, globals: YarnGlobals) => {
  let reaction = _reaction;

	if (reaction.partial) {
		try {
			reaction = await reaction.fetch();
		} catch (_) { null }
	}

  const message = await reaction.message.fetch();
  const guildProfile = await getGuild(message.guild)
  
  if(guildProfile.lgChReact != "") {
    const logChannelId = guildProfile.lgChReact;
    let logChannel = message.guild.channels.cache.get(logChannelId) as Discord.TextChannel;

    const link = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`
    const emojiLink = (reaction.emoji.id != null) ? `https://cdn.discordapp.com/emojis/${reaction.emoji.id}.png` : "";

    const formattedEmojiName = (reaction.emoji.name.match(unicodeEmoji)) ? `${reaction.emoji.name}` : `[\:${reaction.emoji.name}\:](${emojiLink})`; 
    const _content = `<@${user.id}> \`${user.id}\` reacted with ${formattedEmojiName} on [this message](${link}) at <t:${dayjs().unix()}>` 

    const content = new Discord.MessageEmbed().setDescription(_content)

    logChannel.send({embeds: [content], allowedMentions: {parse: []}})
      .catch(console.log)
  }
}