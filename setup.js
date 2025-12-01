const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

console.log(chalk.cyan(`
╔══════════════════════════════════════════════╗
║      CYBER-GUARDIAN Setup Wizard             ║
║      Developed by: KING_BLESS XMD            ║
╚══════════════════════════════════════════════╝
`));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(chalk.yellow(`❓ ${question}`), resolve);
    });
}

async function setup() {
    console.log(chalk.green('\n📝 Setting up CYBER-GUARDIAN...\n'));
    
    // Ask for configuration
    const botName = await askQuestion('Bot Name (default: CYBER-GUARDIAN): ') || 'CYBER-GUARDIAN';
    const prefix = await askQuestion('Command Prefix (default: .): ') || '.';
    const ownerNumber = await askQuestion('Your WhatsApp Number (with country code, e.g., 233XXXXXXXXX): ');
    const openaiKey = await askQuestion('OpenAI API Key (get from https://platform.openai.com): ');
    
    // Create config
    const config = {
        bot_name: botName,
        developer: "KING_BLESS XMD",
        version: "2.0.0",
        prefix: prefix,
        owner_number: ownerNumber,
        github: "https://github.com/KING_BLESS_XMD",
        openai_key: openaiKey,
        messages: {
            welcome: `🤖 *${botName} Activated*\\n\\nHello! I'm ${botName}, your AI-powered WhatsApp assistant.\\nDeveloped by: *KING_BLESS XMD*\\n\\nType *${prefix}menu* to see all commands`,
            error: "❌ An error occurred. Please try again later.",
            wait: "⏳ Please wait...",
            success: "✅ Operation successful!"
        },
        features: {
            ai_enabled: true,
            auto_reply: true,
            downloaders: true,
            stickers: true,
            games: true,
            nsfw: false
        },
        apis: {
            weather: "",
            youtube: "",
            news: ""
        }
    };
    
    // Create directories
    const dirs = ['sessions', 'commands', 'lib', 'assets', 'temp'];
    dirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(chalk.green(`📁 Created directory: ${dir}`));
        }
    });
    
    // Save config
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(chalk.green('✅ Configuration saved to config.json'));
    
    // Install dependencies
    console.log(chalk.yellow('\n📦 Installing dependencies...'));
    const { execSync } = require('child_process');
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log(chalk.green('✅ Dependencies installed successfully!'));
    } catch (error) {
        console.log(chalk.red('❌ Failed to install dependencies'));
    }
    
    // Create sample command files
    const commands = ['ai.js', 'menu.js', 'tools.js', 'downloader.js', 'fun.js', 'admin.js'];
    commands.forEach(cmd => {
        const cmdPath = path.join(__dirname, 'commands', cmd);
        if (!fs.existsSync(cmdPath)) {
            fs.writeFileSync(cmdPath, `// ${cmd} command\nmodule.exports = {\n    name: '${cmd.replace('.js', '')}',\n    description: 'Command description',\n    async execute(sock, msg, args, bot) {\n        await bot.sendMessage(msg.key.remoteJid, 'Command under development!');\n    }\n};`);
        }
    });
    
    console.log(chalk.green('\n🎉 Setup complete!'));
    console.log(chalk.cyan('\n🚀 To start the bot:'));
    console.log(chalk.white('1. node index.js'));
    console.log(chalk.white('2. Scan the QR code with WhatsApp'));
    console.log(chalk.white('3. Enjoy your bot!\n'));
    
    console.log(chalk.yellow('💡 Tips:'));
    console.log(chalk.white('• Add more API keys in config.json for additional features'));
    console.log(chalk.white('• Customize commands in the commands/ folder'));
    console.log(chalk.white('• Join our community for support\n'));
    
    rl.close();
}

setup();
