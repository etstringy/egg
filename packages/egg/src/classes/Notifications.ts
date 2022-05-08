import { GuildMember, MessageEmbed } from "discord.js";
import { bot } from "..";
import achievements, { DummyAchievement } from "../classes/Achievements";
import Log from "./Log";

class Notifications {
  private log: Log
  constructor() {
    this.log = new Log({ prefix: "Notification" })
  }

  async send(member: GuildMember, title: string, body: string) {
    const NotifEmbed = new MessageEmbed()
      .setTitle(title)
      .setDescription(body)
      .setFooter({ text: `From ${member.guild.name}`, iconURL: member.guild.iconURL({ format: "png" })})

    try {
      await member.send({ embeds: [NotifEmbed] })
    } catch(err) { 
      this.log.log("Error pushing notification");
      console.log(err)
     }
  }
}
const notifications = new Notifications();

achievements.events.on('achievementGet', async (member, achievementId) => {
  let targetAch = achievements.data.find((a) => a.id == achievementId);
  if(!targetAch) targetAch = DummyAchievement;

  await notifications.send(
    member, 
    `:trophy: Achievement unlocked!`, 
    `${targetAch.badge || ":crown:"} **${targetAch.name}**
    *${targetAch.description}*
    `
  )
})

export default notifications