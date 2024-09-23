const {
       plugin,
       mode
} = require('../lib');


plugin({
    pattern: 'ping',
    desc: 'check bot speed',
    fromMe: mode,
    type: 'info'
}, async (message, match) => {
    const start = new Date().getTime()
    const msg = await message.send('Ping!')
    const end = new Date().getTime()
    return await msg.edit('*⚡PONG!* ' + (end - start) + ' ms');
});