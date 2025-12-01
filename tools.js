const axios = require('axios');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

module.exports = {
    name: 'tools',
    description: 'Various utility tools',
    category: 'tools',
    
    async execute(sock, msg, args, bot) {
        const jid = msg.key.remoteJid;
        const tool = args[0]?.toLowerCase();
        
        if (!tool) {
            const toolsMenu = `
🔧 *CYBER-GUARDIAN TOOLS*

1. *QR Generator*: .qr <text>
2. *Weather*: .weather <city>
3. *Calculator*: .calc <expression>
4. *Currency*: .currency <amount> <from> <to>
5. *Time*: .time <city>
6. *Dictionary*: .define <word>
7. *Wikipedia*: .wiki <topic>
8. *News*: .news <topic>

Example: .tools qr Hello World`;
            
            await sock.sendMessage(jid, { text: toolsMenu });
            return;
        }
        
        switch(tool) {
            case 'qr':
                await this.generateQR(sock, jid, args.slice(1).join(' '));
                break;
                
            case 'weather':
                await this.getWeather(sock, jid, args[1]);
                break;
                
            case 'calc':
                await this.calculator(sock, jid, args.slice(1).join(' '));
                break;
                
            case 'time':
                await this.getTime(sock, jid, args[1]);
                break;
                
            default:
                await sock.sendMessage(jid, { 
                    text: '❌ Invalid tool. Type .tools for list' 
                });
        }
    },
    
    async generateQR(sock, jid, text) {
        if (!text) {
            await sock.sendMessage(jid, { 
                text: '❌ Please provide text for QR code' 
            });
            return;
        }
        
        try {
            const qrPath = path.join(__dirname, '../temp/qr.png');
            await qrcode.toFile(qrPath, text);
            
            await sock.sendMessage(jid, {
                image: { url: qrPath },
                caption: `📱 QR Code Generated\n🔤 Text: ${text.substring(0, 100)}`
            });
            
            fs.unlinkSync(qrPath);
            
        } catch (error) {
            await sock.sendMessage(jid, { 
                text: '❌ Failed to generate QR code' 
            });
        }
    },
    
    async getWeather(sock, jid, city) {
        if (!city) {
            await sock.sendMessage(jid, { 
                text: '❌ Please specify city' 
            });
            return;
        }
        
        try {
            const API_KEY = config.apis?.weather;
            if (!API_KEY) {
                await sock.sendMessage(jid, { 
                    text: '❌ Weather API not configured' 
                });
                return;
            }
            
            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
            );
            
            const data = response.data;
            const weather = `
🌤️ *Weather in ${data.name}, ${data.sys.country}*
━━━━━━━━━━━━━━━━━━━━━━
🌡️ Temperature: ${data.main.temp}°C
🤔 Feels like: ${data.main.feels_like}°C
📈 Min/Max: ${data.main.temp_min}°C / ${data.main.temp_max}°C
💧 Humidity: ${data.main.humidity}%
💨 Wind: ${data.wind.speed} m/s
🌫️ Pressure: ${data.main.pressure} hPa
☁️ Condition: ${data.weather[0].description}
👀 Visibility: ${(data.visibility / 1000).toFixed(1)} km
☀️ Sunrise: ${new Date(data.sys.sunrise * 1000).toLocaleTimeString()}
🌇 Sunset: ${new Date(data.sys.sunset * 1000).toLocaleTimeString()}
            `;
            
            await sock.sendMessage(jid, { text: weather });
            
        } catch (error) {
            await sock.sendMessage(jid, { 
                text: '❌ City not found or API error' 
            });
        }
    },
    
    async calculator(sock, jid, expression) {
        if (!expression) {
            await sock.sendMessage(jid, { 
                text: '❌ Please provide calculation' 
            });
            return;
        }
        
        try {
            // Safe evaluation
            const allowed = /^[\d+\-*/().\s]+$/;
            if (!allowed.test(expression)) {
                await sock.sendMessage(jid, { 
                    text: '❌ Invalid characters' 
                });
                return;
            }
            
            const result = eval(expression);
            await sock.sendMessage(jid, { 
                text: `🧮 *Calculator*\n\nExpression: ${expression}\nResult: *${result}*` 
            });
            
        } catch (error) {
            await sock.sendMessage(jid, { 
                text: '❌ Invalid mathematical expression' 
            });
        }
    },
    
    async getTime(sock, jid, city) {
        const timezones = {
            'accra': 'Africa/Accra',
            'london': 'Europe/London',
            'newyork': 'America/New_York',
            'tokyo': 'Asia/Tokyo',
            'dubai': 'Asia/Dubai',
            'paris': 'Europe/Paris',
            'berlin': 'Europe/Berlin',
            'moscow': 'Europe/Moscow',
            'beijing': 'Asia/Shanghai',
            'sydney': 'Australia/Sydney'
        };
        
        const tz = timezones[city?.toLowerCase()] || 'UTC';
        const time = new Date().toLocaleString('en-US', { 
            timeZone: tz,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        await sock.sendMessage(jid, { 
            text: `🕐 *Time in ${city || 'UTC'}*\n\n${time}` 
        });
    },
    
    aliases: ['tool', 'utility']
};
