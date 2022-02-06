import axios from "axios";
import Discord, { ButtonInteraction, Constants, GuildMember, MessageEmbed } from "discord.js"
import Command from "../../../classes/Commands/Command"
import dayjs from "dayjs";
import getGuild from "../../../db/utils/getGuild";
import { deleteBtn, noBtn } from "../../../utils/buttons";
import { lastRatioTimestamp, ratioCooldown } from "../../../utils/ratio";

const Cmd = new Command({
    enabled: true,
    name: "reactwords",
    description: "Configure reaction words",
    options: [
    {
      name: "toggle",
      type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
      description: "Toggle reaction words from being picked up"
    },
    ]
}, async (client, interaction, globals) => {
  if(!(interaction.member as Discord.GuildMember).permissions.has("MANAGE_GUILD"))
    return interaction.reply({"content": ":x: You must have the **Manage Guild** permission to use this command!"})

  const guild = await getGuild(interaction.guild);

  switch(interaction.options.getSubcommand()){
    case "toggle":
      let newState = !guild.rwEnabled
      await globals.db.guild.update({
        where: { id: guild.id },
        data: {
          rbEnabled: {
            set: newState
          }
        }
      })
      interaction.reply(`✅ Reaction words are now ${(newState) ? "enabled": "disabled"}`)
      break;
    default:
      interaction.reply(`nah it brokey`)
  }
})

export default Cmd