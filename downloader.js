const ytdl = require('ytdl-core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
    name: 'yt',
    description: 'Download YouTube videos',
    category: 'downloader',
    cooldown: 15,
    
    async execute(sock, msg, args, bot) {
        const jid = msg.key.remoteJid;
        const url = args[0];
        
        if (!url || !ytdl.validateURL(url)) {
            await sock.sendMessage(jid, { 
                text: '❌ Invalid YouTube URL.\nUsage: .yt <url> [audio/video]' 
            });
            return;
        }
        
        const type = args[1] || 'video';
        
        try {
            // Get video info
            await sock.sendMessage(jid, { text: '📥 Fetching video information...' });
            
            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
            const duration = parseInt(info.videoDetails.lengthSeconds);
            
            if (duration > 1800) { // 30 minutes
                await sock.sendMessage(jid, { 
                    text: '❌ Video too long. Maximum 30 minutes.' 
                });
                return;
            }
            
            // Show video info
            const videoInfo = `
🎬 *Video Information*
📝 Title: ${info.videoDetails.title}
⏱️ Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}
👁️ Views: ${parseInt(info.videoDetails.viewCount).toLocaleString()}
👍 Likes: ${info.videoDetails.likes || 'N/A'}
👤 Channel: ${info.videoDetails.author.name}

🔧 *Select Quality:*
1. 360p (Low)
2. 720p (Medium) 
3. Best Quality
Type 1, 2, or 3 to continue:`;
            
            await sock.sendMessage(jid, { text: videoInfo });
            
            // Wait for quality selection
            const quality = await this.waitForResponse(sock, jid);
            const qualityMap = {
                '1': '360p',
                '2': '720p', 
                '3': 'highest'
            };
            
            const selectedQuality = qualityMap[quality] || 'highest';
            
            // Start download
            await this.downloadVideo(sock, jid, url, title, selectedQuality, type);
            
        } catch (error) {
            console.error('Download Error:', error);
            await sock.sendMessage(jid, { 
                text: '❌ Download failed. Try again later.' 
            });
        }
    },
    
    async downloadVideo(sock, jid, url, title, quality, type) {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const filename = `${title}_${Date.now()}`;
        const videoPath = path.join(tempDir, `${filename}.mp4`);
        const audioPath = path.join(tempDir, `${filename}.mp3`);
        
        try {
            await sock.sendMessage(jid, { text: '⏬ Downloading... This may take a while.' });
            
            if (type === 'audio') {
                // Download audio
                const ytdlProcess = ytdl(url, { quality: 'highestaudio' });
                const writeStream = fs.createWriteStream(audioPath);
                
                ytdlProcess.pipe(writeStream);
                
                await new Promise((resolve, reject) => {
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
                
                // Send audio
                await sock.sendMessage(jid, {
                    audio: { url: audioPath },
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`
                });
                
                fs.unlinkSync(audioPath);
                
            } else {
                // Download video
                const ytdlProcess = ytdl(url, { quality: quality });
                const writeStream = fs.createWriteStream(videoPath);
                
                ytdlProcess.pipe(writeStream);
                
                await new Promise((resolve, reject) => {
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
                
                // Compress if too large
                const stats = fs.statSync(videoPath);
                if (stats.size > 40 * 1024 * 1024) { // 40MB
                    await this.compressVideo(videoPath);
                }
                
                // Send video
                await sock.sendMessage(jid, {
                    video: { url: videoPath },
                    caption: `🎬 ${title}\n📥 Downloaded by CYBER-GUARDIAN`
                });
                
                fs.unlinkSync(videoPath);
            }
            
            await sock.sendMessage(jid, { text: '✅ Download complete!' });
            
        } catch (error) {
            throw error;
        }
    },
    
    async compressVideo(videoPath) {
        const compressedPath = videoPath.replace('.mp4', '_compressed.mp4');
        
        await execPromise(`ffmpeg -i "${videoPath}" -vcodec libx264 -crf 28 -preset fast "${compressedPath}" -y`);
        
        fs.unlinkSync(videoPath);
        fs.renameSync(compressedPath, videoPath);
    },
    
    async waitForResponse(sock, jid) {
        return new Promise((resolve) => {
            const listener = async (m) => {
                const msg = m.messages[0];
                if (msg.key.remoteJid === jid && !msg.key.fromMe) {
                    const text = msg.message?.conversation || 
                                msg.message?.extendedTextMessage?.text || '';
                    
                    if (['1', '2', '3'].includes(text.trim())) {
                        sock.ev.off('messages.upsert', listener);
                        resolve(text.trim());
                    }
                }
            };
            
            sock.ev.on('messages.upsert', listener);
            
            // Timeout after 30 seconds
            setTimeout(() => {
                sock.ev.off('messages.upsert', listener);
                resolve('3');
            }, 30000);
        });
    },
    
    aliases: ['youtube', 'download', 'ytdl']
};
