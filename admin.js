const fs = require('fs');
const path = require('path');
const config = require('../config.json');

module.exports = {
    name: 'admin',
    description: 'Admin commands',
    category: 'admin',
    
    async execute(sock, msg, args, bot) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // Check if sender is owner
        const owner = `${config.owner_number}@s.whatsapp.net`;
        if (!sender.includes(config.owner_number.replace('+', ''))) {
            await sock.sendMessage(jid, { 
                text: '❌ This command is for owner only!' 
            });
            return;
        }
        
        const command = args[0]?.toLowerCase();
        
        if (!command) {
            const adminMenu = `
👑 *ADMIN COMMANDS*

• .admin broadcast <message> - Broadcast to all chats
• .admin backup - Backup chat data
• .admin stats - Show bot statistics
• .admin restart - Restart bot
• .admin shutdown - Shutdown bot
• .admin eval <code> - Execute code
• .admin ban <number> - Ban user
• .admin unban <number> - Unban user
• .admin chats - List all chats
• .admin broadcastimage <caption> - Broadcast image`;
            
            await sock.sendMessage(jid, { text: adminMenu });
            return;
        }
        
        switch(command) {
            case 'broadcast':
                await this.broadcast(sock, args.slice(1).join(' '));
                break;
                
            case 'stats':
                await this.showStats(sock, jid);
                break;
                
            case 'restart':
                await this.restartBot(sock, jid);
                break;
                
            case 'eval':
                await this.evalCode(sock, jid, args.slice(1).join(' '));
                break;
                
            default:
                await sock.sendMessage(jid, { 
                    text: '❌ Invalid admin command' 
                });
        }
    },
    
    async broadcast(sock, message) {
        if (!message) {
            return;
        }
        
        try {
            // Get all chats
            const chats = sock.chats.all();
            let success = 0;
            let failed = 0;
            
            for (const chat of chats) {
                if (chat.id.endsWith('@g.us') || chat.id.endsWith('@s.whatsapp.net')) {
                    try {
                        await sock.sendMessage(chat.id, { 
                            text: `📢 *BROADCAST*\n\n${message}\n\n- CYBER-GUARDIAN Admin` 
                        });
                        success++;
                        // Delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        failed++;
                    }
                }
            }
            
            await sock.sendMessage(`${config.owner_number}@s.whatsapp.net`, { 
                text: `📊 *Broadcast Complete*\n✅ Success: ${success}\n❌ Failed: ${failed}` 
            });
            
        } catch (error) {
            console.error('Broadcast error:', error);
        }
    },
    
    async showStats(sock, jid) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const stats = `
📊 *BOT STATISTICS*
━━━━━━━━━━━━━━━━━━━━━━
🤖 Bot Name: ${config.bot_name}
👨‍💻 Developer: ${config.developer}
🔄 Version: ${config.version}
⏱️ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s
💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
📁 Commands: ${bot.commands.size}
👥 Chats: ${sock.chats.all().length}
🚀 Node.js: ${process.version}
📦 Platform: ${process.platform}
━━━━━━━━━━━━━━━━━━━━━━
        `;
        
        await sock.sendMessage(jid, { text: stats });
    },
    
    async restartBot(sock, jid) {
        await sock.sendMessage(jid, { 
            text: '🔄 Restarting bot...' 
        });
        
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    },
    
    async evalCode(sock, jid, code) {
        if (!code) {
            await sock.sendMessage(jid, { 
                text: '❌ Please provide code to evaluate' 
            });
            return;
        }
        
        try {
            let evaled = eval(code);
            
            if (typeof evaled !== 'string') {
                evaled = require('util').inspect(evaled);
            }
            
            await sock.sendMessage(jid, { 
                text: `💻 *EVAL RESULT*\n\n${evaled.substring(0, 1500)}` 
            });
            
        } catch (error) {
            await sock.sendMessage(jid, { 
                text: `❌ EVAL ERROR\n\n${error.message}` 
            });
        }
    },
    
    aliases: ['owner', 'sudo']
};
