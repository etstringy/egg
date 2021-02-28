import Discord from "discord.js";
import dayjs from "dayjs";
import Command from "../../classes/Command";
import { Feedback, User } from '../../db/models';
import getUser from "../../utils/eggRetrievalService";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const Cmd = new Command({
    enabled: true,
    name: "give",
    trigger: ["f", "givefeedback", "give", "feedback"],
    description: "Give feedback!",
    usage: "givefeedback [id] [feedback]",
    category: "Egg"
}, async (client, message, args, config) => {
    if(!args[0]) return message.channel.send("Please provide a feedback ID. &givefeedback [id] [feedback]")
    
    let egg = await getUser(message.author.id, message.guild.id)

    let feedbackId = await Feedback.findOne({ where: { messageId: args[0], guildId: message.guild.id }})
    if(!feedbackId) return message.channel.send("Invalid feedback ID.")


    try {
        await message.channel.messages.fetch(feedbackId.messageId)
    } catch(err) {
        message.channel.send("This submission has been deleted by a moderator and will now be removed from database.")
        await feedbackId.destroy();
        return;
    }
    
    let fbMsg = await message.channel.messages.fetch(feedbackId.messageId)
    let fbUsr = await message.guild.members.fetch(fbMsg.author.id)

    if(fbMsg.deleted || !fbMsg) {
        message.channel.send("This submission has been deleted by a moderator and will now be removed from database.")
        await feedbackId.destroy();
        return;
    }

    if(fbMsg.author.id == message.author.id) return message.channel.send("You can't give feedback to yourself!")

    // Length check + parse out emojis
    let customEmojiRE = /<a?:.+?:.+?>/gm // MAKE IT STOP PLEASE PLEASE HELP AAAAAAAA
    let minLength = 150;
    let feedback = args.slice(1).join(" ");
    feedback = feedback.replace(customEmojiRE, "_")
    if(feedback.length < minLength) return message.channel.send(`Please don't give lazy feedback. Be more descriptive (${minLength} characters minimum)`)

    // Time check
    let lastsFor = 7 // ( ͡° ͜ʖ ͡°)
    let currentTime = dayjs().unix()
    let expireTime = dayjs(fbMsg.createdTimestamp).add(lastsFor, 'day').unix()
    if(currentTime > expireTime) return message.channel.send(`This submission is over ${lastsFor} days old and cannot be feedbacked anymore.`)

    // Deletion check
    await delay(500)
    if(message.deleted) return;

    // Add pass
    if(egg.points < 3) egg.points++;
    egg.lifetime++;
    await egg.save()

    // Set feedback given
    feedbackId.given = true;
    await feedbackId.save()

    // Send messages
    let mbed = new Discord.MessageEmbed()
        .setTitle("Success! :white_check_mark:")
        .setDescription(`${message.author.tag}, Your feedback was given. You can now use the &submit command once.`)
        .setColor(config.config.embedColors.default)

    let feedbackMbed = new Discord.MessageEmbed()
        .setTitle("New feedback")
        .setDescription(`**${message.author.tag}** gave feedback on your submission! [Click here to view](${message.url})`)
        .setColor("#42f554")

    fbUsr.send({embed: feedbackMbed})
    message.channel.send(`<@${message.author.id}>`, {embed: mbed})
})

export default Cmd