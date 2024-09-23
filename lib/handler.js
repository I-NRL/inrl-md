const database = require('./database/init');
const {DisconnectReason} = require('@whiskeysockets/baileys');
const {Boom} = require('@hapi/boom');
const { makeInMemory } = require("./store");
const serialize = require('./serialize');
let commands = [];
function plugin(info, func) {
  commands.push({...info, function: func});
  return info;
};
const config = require('../config');
function binarySearch(array, targetPattern) {
    let left = 0;
    let right = array.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midPattern = array[mid].pattern;

        if (midPattern === targetPattern) {
            return mid;
        } else if (midPattern < targetPattern) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return -1;
};

const handler = async(conn) => {
  const store = makeInMemory(conn);
  commands.sort((a, b) => a.pattern.localeCompare(b.pattern));
  conn.ev.on('connection.update',(c)=> onConnection(c, conn));
  conn.ev.on('messages.upsert', (m)=> onMessage(m, conn, store));
};

async function onMessage(messages, conn, store) {
  if (messages.type !== "notify") return;
  const m = new serialize(messages.messages[0], conn,"", store);
  console.log('[MESSAGE]:', m.body && m.body.length ? m.body : m.type);
  const isWithPrefix = m.body.startsWith(config.PREFIX);
  if(isWithPrefix) {
  const info = binarySearch(commands, m.body.replace(config.PREFIX, '').trim().toLowerCase());
  if(info == -1) return;
  await commands[info].function(m, m.body);
  } else {
    for(const a in commands) {
      if(commands[a].on && commands[a].on == m.mediaType) {
        commands[a].function(m, m.body);
        break;
      }
    }
  }
}
async function onConnection({connection}, conn) {
  if(connection == 'closed') {
    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
    
    if (reason === DisconnectReason.connectionClosed) {
            console.log('[Connection closed, reconnecting....!]');
          } else if (reason === DisconnectReason.connectionLost) {
            console.log('[Connection Lost from Server, reconnecting....!]');
          } else if (reason === DisconnectReason.loggedOut) {
            console.log('[Device Logged Out, Please Try to Login Again....!]');
          } else if (reason === DisconnectReason.restartRequired) {
            console.log('[Server Restarting....!]')
            process.exit();
          } else if (reason === DisconnectReason.timedOut) {
            console.log('[Connection Timed Out, Trying to Reconnect....!]');
          } else if (reason === DisconnectReason.badSession) {
            console.log('[BadSession exists, Trying to Reconnect....!]');
          } else if (reason === DisconnectReason.connectionReplaced) {
            console.log(`[Connection Replaced, Trying to Reconnect....!]`);
          } else {
            console.log('[Server Disconnected: Maybe Your WhatsApp Account got Fucked....!]');
    }
  } else if(connection == 'open') {
    const info = await database.findOne();
    if(info.started) return await conn.sendMessage(conn.user.id, {text: 'service restarted'});
    await info.update({started: true});
    await conn.sendMessage(conn.user.id, {text: 'record saved'});
    return console.log('bot connected');
  } else if(connection == 'connecting') return console.log('connecting please wait');
}
module.exports = {commands, plugin, handler};