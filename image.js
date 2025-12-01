const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

module.exports = {
    name: 'img',
    description: 'Generate AI image',
    category: 'ai',
    cooldown: 10,
    
    async execute(sock, msg, args, bot) {
        const jid = msg.key.remoteJid;
        const prompt = args.join(' ');
        
        if (!prompt) {
            await sock.sendMessage(jid, { 
                text: '❌ Please provide a prompt.\nExample: .img A cyberpunk city at night' 
            });
            return;
        }
        
        if (prompt.length > 500) {
            await sock.sendMessage(jid, { 
                text: '❌ Prompt too long. Maximum 500 characters.' 
            });
            return;
        }
        
        const waitMsg = await sock.sendMessage(jid, { 
            text: '🎨 *Generating image...*\nThis may take 20-30 seconds.' 
        });
        
        try {
            const openai = new OpenAI({ apiKey: config.openai_key });
            
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: "vivid"
            });
            
            const imageUrl = response.data[0].url;
            
            // Download image
            const imagePath = await this.downloadImage(imageUrl, jid);
            
            // Send image
            await sock.sendMessage(jid, {
                image: { url: imagePath },
                caption: `🎨 *AI Generated Image*\n\n📝 Prompt: ${prompt}\n👨‍🎨 By: CYBER-GUARDIAN\n⚡ Powered by DALL-E 3`
            });
            
            // Cleanup
            fs.unlinkSync(imagePath);
            
        } catch (error) {
            console.error('Image Generation Error:', error);
            await sock.sendMessage(jid, { 
                text: '❌ Failed to generate image. Try a different prompt.' 
            });
        }
    },
    
    async downloadImage(url, jid) {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const imagePath = path.join(tempDir, `${jid}_${Date.now()}.png`);
        const writer = fs.createWriteStream(imagePath);
        
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(imagePath));
            writer.on('error', reject);
        });
    },
    
    aliases: ['image', 'generate', 'dalle']
};
