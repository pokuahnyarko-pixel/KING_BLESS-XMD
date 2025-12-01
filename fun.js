const axios = require('axios');
const config = require('../config.json');

module.exports = {
    name: 'fun',
    description: 'Fun and entertainment commands',
    category: 'fun',
    
    async execute(sock, msg, args, bot) {
        const jid = msg.key.remoteJid;
        const command = args[0]?.toLowerCase();
        
        if (!command) {
            const funMenu = `
🎮 *FUN & ENTERTAINMENT*

1. *Jokes*: .joke
2. *Quotes*: .quote
3. *Memes*: .meme
4. *Facts*: .fact
5. *Riddles*: .riddle
6. *Trivia*: .trivia
7. *Would You Rather*: .wyr
8. *Truth or Dare*: .tod

Example: .fun joke`;
            
            await sock.sendMessage(jid, { text: funMenu });
            return;
        }
        
        switch(command) {
            case 'joke':
                await this.getJoke(sock, jid);
                break;
                
            case 'quote':
                await this.getQuote(sock, jid);
                break;
                
            case 'meme':
                await this.getMeme(sock, jid);
                break;
                
            case 'fact':
                await this.getFact(sock, jid);
                break;
                
            default:
                await sock.sendMessage(jid, { 
                    text: '❌ Invalid fun command' 
                });
        }
    },
    
    async getJoke(sock, jid) {
        try {
            const response = await axios.get('https://v2.jokeapi.dev/joke/Any');
            const data = response.data;
            
            if (data.type === 'single') {
                await sock.sendMessage(jid, { 
                    text: `😂 *Joke*\n\n${data.joke}` 
                });
            } else {
                await sock.sendMessage(jid, { 
                    text: `😂 *Joke*\n\n${data.setup}\n\n...\n\n${data.delivery}` 
                });
            }
        } catch (error) {
            await sock.sendMessage(jid, { 
                text: '❌ Failed to fetch joke' 
            });
        }
    },
    
    async getQuote(sock, jid) {
        try {
            const response = await axios.get('https://api.quotable.io/random');
            const data = response.data;
            
            await sock.sendMessage(jid, { 
                text: `💬 *Inspirational Quote*\n\n"${data.content}"\n\n— ${data.author}` 
            });
        } catch (error) {
            await sock.sendMessage(jid, { 
                text: '❌ Failed to fetch quote' 
            });
        }
    },
    
    async getMeme(sock, jid) {
        try {
            const response = await axios.get('https://meme-api.com/gimme');
            const data = response.data;
            
            await sock.sendMessage(jid, {
                image: { url: data.url },
                caption: `📸 *Meme*\n\n${data.title}\n\nSubreddit: r/${data.subreddit}`
            });
        } catch (error) {
            await sock.sendMessage(jid, { 
                text: '❌ Failed to fetch meme' 
            });
        }
    },
    
    async getFact(sock, jid) {
        try {
            const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
            const data = response.data;
            
            await sock.sendMessage(jid, { 
                text: `📚 *Random Fact*\n\n${data.text}` 
            });
        } catch (error) {
            await sock.sendMessage(jid, { 
                text: '❌ Failed to fetch fact' 
            });
        }
    },
    
    aliases: ['entertainment', 'games']
};
