const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const config = require('../config.json');

module.exports = {
    name: 'ai',
    description: 'Chat with AI',
    category: 'ai',
    cooldown: 5,
    
    async execute(sock, msg, args, bot) {
        const jid = msg.key.remoteJid;
        const text = args.join(' ');
        
        if (!text) {
            await sock.sendMessage(jid, { 
                text: '❌ Please provide a message.\nExample: .ai What is artificial intelligence?' 
            });
            return;
        }
        
        // Send wait message
        const waitMsg = await sock.sendMessage(jid, { text: '🤖 *AI Thinking...*' });
        
        try {
            const openai = new OpenAI({ apiKey: config.openai_key });
            
            // Load conversation history
            const history = await this.loadHistory(jid);
            history.push({ role: "user", content: text });
            
            // Limit history to last 10 messages
            if (history.length > 20) {
                history.splice(0, history.length - 20);
            }
            
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are CYBER-GUARDIAN, a WhatsApp assistant created by KING_BLESS XMD. 
                        Be helpful, concise, and accurate. Format responses with markdown for readability.
                        Current time: ${new Date().toLocaleString()}`
                    },
                    ...history
                ],
                max_tokens: 1000,
                temperature: 0.7,
                presence_penalty: 0.6,
                frequency_penalty: 0.3
            });
            
            const aiResponse = response.choices[0].message.content;
            
            // Save to history
            history.push({ role: "assistant", content: aiResponse });
            await this.saveHistory(jid, history);
            
            // Delete wait message and send response
            await sock.sendMessage(jid, { 
                text: `🤖 *AI Response*\n\n${aiResponse}\n\n💡 *Tip:* Ask follow-up questions naturally` 
            });
            
        } catch (error) {
            console.error('AI Error:', error);
            await sock.sendMessage(jid, { 
                text: '❌ AI service error. Please try again later.' 
            });
        }
    },
    
    async loadHistory(jid) {
        const historyFile = path.join(__dirname, '../sessions/history', `${jid}.json`);
        if (fs.existsSync(historyFile)) {
            return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
        return [];
    },
    
    async saveHistory(jid, history) {
        const historyDir = path.join(__dirname, '../sessions/history');
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }
        
        const historyFile = path.join(historyDir, `${jid}.json`);
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    },
    
    aliases: ['ask', 'gpt', 'chat', 'brain']
};
