// Tạo một Discord Bot bằng OpenAI API để tương tác trên Discord Server.
require('dotenv/config');
const {Client, IntentsBitField} = require('discord.js');
const {Configuration, OpenAIApi} = require('openai');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

const configuration = new Configuration({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

client.on('ready', (c) => {
    console.log(`Xin chào ${c.user.tag}`);
});

// const msgLengthLimit = 2000;

// Check for when message on Discord is sent
client.on('messageCreate', async (message) => {
    // console.log(message);
    try {
        if (message.author.bot) return;
        if (message.channel.id !== process.env.CHAT_BOT_CHANNEL) return;
        if (message.content.startsWith('!')) return;

        await message.channel.sendTyping();

        // if (message.content.length > msgLengthLimit) {
        //     message.reply("Woa nhiều zậy, Không đọc hết được, Tóm tắt đeee!");
        //     return;
        // }

        let prevMessages = await message.channel.messages.fetch({limit: 15});
        prevMessages = prevMessages.sort((a, b) => a - b);

        let conversationLog = [{role: 'system', content: 'Bạn là một chatbot thân thiện trong Discord.'}];

        prevMessages.forEach((msg) => {
            if (message.content.startsWith('!')) return;
            if (msg.author.id !== client.user.id && message.author.bot) return;

            if (msg.author.id == client.user.id) {
                conversationLog.push({
                    role: 'assistant',
                    content: msg.content,
                    name: msg.author.username
                        .replace(/\s+/g, '_')
                        .replace(/[^\w\s]/gi, ''),
                });
            } else {
                if (msg.author.id == message.author.id) {
                    conversationLog.push({
                        role: 'user',
                        content: msg.content,
                        name: message.author.username
                            .replace(/\s+/g, '_')
                            .replace(/[^\w\s]/gi, ''),
                    });
                }
            }
        });

        const res = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: conversationLog,
        });

        let reply = res.data.choices[0].message?.content;

        if (reply?.length > 2000) {
            // If the reply length is over 2000 characters, send a txt file.
            const buffer = Buffer.from(reply, 'utf8');
            const txtFile = new AttachmentBuilder(buffer, {name: `${message.author.tag}_response.txt`});

            message.reply({files: [txtFile]}).catch(() => {
                message.channel.send({content: `${message.author}`, files: [txtFile]});
            });
        } else {
            message.reply(reply).catch(() => {
                message.channel.send(`${message.author} ${reply}`);
            });
        }
        // message.reply(res.data.choices[0].message);
    } catch (error) {
        message.reply(`Something went wrong. Try again in a bit.`).then((msg) => {
            setTimeout(async () => {
                await msg.delete().catch(() => null);
            }, 5000);
        });

        console.log(`Error: ${error}`);
    }
});

client.login(process.env.TOKEN);
