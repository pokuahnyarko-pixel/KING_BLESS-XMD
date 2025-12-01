const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const figlet = require('figlet');

// Load configuration
const config = require('./config.json');

// ASCII Art Banner
console.log(chalk.cyan(figlet.textSync('CYBER-GUARDIAN', { font: 'Standard' })));
console.log(chalk.yellow('╔════════════════════════════════════════╗'));
console.log(chalk.yellow('║   Developed by: KING_BLESS XMD         ║'));
console.log(chalk.yellow('║   Version: 2.0.0                      ║'));
console.log(chalk.yellow('║   GitHub: KING_BLESS XMD              ║'));
console.log(chalk.yellow('╚════════════════════════════════════════╝\n'));

class CyberGuardian {
    constructor() {
        this.sock = null;
        this.commands = new Map();
        this.loadCommands();
        this.init();
    }

    async init() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState('./sessions');
            const { version } = await fetchLatestBaileysVersion();
            
            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                auth: state,
                browser: ['CYBER-GUARDIAN', 'Chrome', '3.0'],
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: true,
            });

            // QR Code Handler
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    console.log(chalk.green('\n🔐 Scan QR Code with WhatsApp:'));
                    qrcode.generate(qr, { small: true });
                    this.saveQR(qr);
                }

                if (connection === 'open') {
                    console.log(chalk.green('\n✅ Bot connected successfully!'));
                    this.updateStatus('🤖 CYBER-GUARDIAN is Online | Developed by KING_BLESS XMD');
                    this.sendOwnerAlert();
                }

                if (connection === 'close') {
                    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                    if (reason === DisconnectReason.loggedOut) {
                        console.log(chalk.red('❌ Device logged out. Delete sessions folder and restart.'));
                        process.exit();
                    } else {
                        console.log(chalk.yellow('🔄 Connection lost. Reconnecting...'));
                        setTimeout(() => this.init(), 5000);
                    }
                }
            });

            // Credentials Save
            this.sock.ev.on('creds.update', saveCreds);

            // Message Handler
            this.sock.ev.on('messages.upsert', async (m) => {
                const msg = m.messages[0];
                if (!msg.message || msg.key.fromMe) return;

                await this.handleMessage(msg);
            });

            // Auto-reconnect
            setInterval(() => {
                if (!this.sock?.user) {
                    console.log(chalk.yellow('🔄 Attempting to reconnect...'));
                    this.init();
                }
            }, 30000);

        } catch (error) {
            console.error(chalk.red('❌ Initialization error:'), error);
            setTimeout(() => this.init(), 10000);
        }
    }

    async handleMessage(msg) {
        try {
            const messageType = Object.keys(msg.message)[0];
            const text = messageType === 'conversation' 
                ? msg.message.conversation 
                : messageType === 'extendedTextMessage' 
                    ? msg.message.extendedTextMessage.text 
                    : '';

            const sender = msg.key.remoteJid;
            const isGroup = sender.endsWith('@g.us');
            const prefix = config.prefix || '.';
            
            // Ignore if not text or doesn't start with prefix
            if (!text || !text.startsWith(prefix)) {
                // Auto-reply to hi/hello
                if (['hi', 'hello', 'hey'].includes(text.toLowerCase())) {
                    await this.sendMessage(sender, config.messages.welcome);
                }
                return;
            }

            const args = text.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            // Log command usage
            console.log(chalk.blue(`📩 Command: ${command} from ${sender}`));

            // Execute command
            if (this.commands.has(command)) {
                const cmd = this.commands.get(command);
                await cmd.execute(this.sock, msg, args, this);
            } else {
                await this.sendMessage(sender, `❌ Unknown command. Type ${prefix}menu for help.`);
            }

        } catch (error) {
            console.error(chalk.red('❌ Message handler error:'), error);
        }
    }

    loadCommands() {
        const commandsDir = path.join(__dirname, 'commands');
        
        if (!fs.existsSync(commandsDir)) {
            fs.mkdirSync(commandsDir, { recursive: true });
            this.createDefaultCommands();
        }

        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsDir, file));
                if (command.name && command.execute) {
                    this.commands.set(command.name, command);
                    if (command.aliases) {
                        command.aliases.forEach(alias => this.commands.set(alias, command));
                    }
                }
            } catch (error) {
                console.error(chalk.red(`❌ Error loading command ${file}:`), error);
            }
        }

        console.log(chalk.green(`✅ Loaded ${this.commands.size} commands`));
    }

    createDefaultCommands() {
        const defaultCommands = {
            'ai.js': `
module.exports = {
    name: 'ai',
    description: 'Chat with AI',
    category: 'ai',
    async execute(sock, msg, args, bot) {
        const text = args.join(' ');
        if (!text) return bot.sendMessage(msg.key.remoteJid, 'Please provide a message for AI.');
        
        const response = await bot.getAIResponse(text);
        await bot.sendMessage(msg.key.remoteJid, response);
    },
    aliases: ['ask', 'gpt']
};`,
            'menu.js': `
module.exports = {
    name: 'menu',
    description: 'Show bot menu',
    category: 'general',
    async execute(sock, msg, args, bot) {
        await bot.sendMenu(msg.key.remoteJid);
    },
    aliases: ['help', 'commands']
};`
        };

        Object.entries(defaultCommands).forEach(([filename, content]) => {
            fs.writeFileSync(path.join(__dirname, 'commands', filename), content);
        });
    }

    async getAIResponse(prompt) {
        try {
            // Using OpenAI API
            const { OpenAI } = require('openai');
            const openai = new OpenAI({ apiKey: config.openai_key });
            
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are CYBER-GUARDIAN, a helpful WhatsApp assistant created by KING_BLESS XMD. Provide concise, accurate responses."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('AI Error:', error);
            return "I apologize, but I'm having trouble connecting to the AI service. Please try again later.";
        }
    }

    async sendMessage(jid, text) {
        try {
            await this.sock.sendMessage(jid, { text: text });
        } catch (error) {
            console.error('Send message error:', error);
        }
    }

    async sendMenu(jid) {
        const menu = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃    🤖 CYBER-GUARDIAN MENU v2.0    ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Developed by: KING_BLESS XMD  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🤖 *AI COMMANDS*
• .ai <text> - Chat with AI
• .img <prompt> - Generate image
• .code <lang> <task> - Generate code
• .translate <lang> <text>

📥 *DOWNLOADERS*
• .yt <url> - YouTube video
• .ytmp3 <url> - YouTube audio
• .ig <url> - Instagram
• .tt <url> - TikTok

🛠️ *TOOLS*
• .sticker - Create sticker
• .toimg - Convert sticker to image
• .qr <text> - Generate QR
• .weather <city> - Weather info
• .calc <expression> - Calculator

🎮 *ENTERTAINMENT*
• .joke - Random joke
• .quote - Inspirational quote
• .meme - Send meme
• .song <name> - Search song

🔧 *BOT CONTROLS*
• .ping - Check bot speed
• .status - Bot info
• .owner - Contact developer
• .donate - Support project

📚 *EDUCATION*
• .define <word> - Dictionary
• .wiki <topic> - Wikipedia
• .math <problem> - Solve math

🔐 *ADMIN COMMANDS*
• .broadcast <msg> - Broadcast
• .backup - Backup chats
• .block <number> - Block user
• .eval <code> - Execute code

💡 *Tip:* Use .help <command> for details
📞 *Support:* Contact developer`;

        await this.sendMessage(jid, menu);
    }

    updateStatus(status) {
        if (this.sock) {
            this.sock.updateProfileStatus(status);
        }
    }

    saveQR(qr) {
        const qrPath = path.join(__dirname, 'qr.txt');
        fs.writeFileSync(qrPath, qr);
        console.log(chalk.yellow('📁 QR code saved to qr.txt'));
    }

    async sendOwnerAlert() {
        if (config.owner_number) {
            const message = `✅ CYBER-GUARDIAN is now online!\n🕐 ${new Date().toLocaleString()}\n🤖 Version: 2.0.0`;
            await this.sendMessage(`${config.owner_number}@s.whatsapp.net`, message);
        }
    }
}

// Start the bot
const bot = new CyberGuardian();

// Handle process events
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
});

process.on('unhandledRejection', (error) => {
    console.error(chalk.red('❌ Unhandled Rejection:'), error);
});

// Keep alive
setInterval(() => {}, 1000);
