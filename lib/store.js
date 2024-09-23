const {
  isJidGroup,
  jidNormalizedUser,
  getContentType
} = require("@whiskeysockets/baileys");
const PhoneNumber = require("awesome-phonenumber");

async function makeInMemory(socket) {
  let memoryStore = {
    state: {
      connection: "close"
    },
    messages: {},
    votes: {
      poll: {},
      reaction: {}
    },
    contacts: {},
    groupMetadata: {}
  };

  memoryStore.bind = async (connection) => {
    connection.on("connection.update", async ({ connection: connState }) => {
      memoryStore.state.connection = "open";
      if (!memoryStore.contacts[socket.user.jid]) {
        memoryStore.contacts[socket.user.jid] = {
          number: socket.user.number || '',
          name: socket.user.name || ''
        };
      }
    });

    connection.on("group-participants.update", async ({ id: groupId, action }) => {
      if (action !== "promote" && action !== "demote") {
        memoryStore.groupMetadata[groupId] = await socket.groupMetadata(groupId);
      }
    });

    connection.on("messages.upsert", async (messageUpdate) => {
      const message = messageUpdate.messages[0];
      if (message.key.remoteJid === "status@broadcast") {
        return;
      }
      const remoteJid = message.key.remoteJid || message.key.participant;
      const normalizedUser = jidNormalizedUser(message.key.fromMe && socket.user?.jid || message.key.participant || remoteJid || '');
      const messageType = await getContentType(message.message);
      const isGroup = await isJidGroup(remoteJid);

      if (messageType === "protocolMessage") {
        return;
      }

      if (!memoryStore.contacts[normalizedUser]) {
        memoryStore.contacts[normalizedUser] = {
          number: normalizedUser.replace(/[^0-9]/g, '') || '',
          name: message.pushName || ''
        };
      }

      if (isGroup) {
        if (!memoryStore.groupMetadata[remoteJid]) {
          const groupMeta = await socket.groupMetadata(remoteJid);
          if (groupMeta) {
            memoryStore.groupMetadata[remoteJid] = groupMeta;
          }
        }
      }

      if (messageType === "reactionMessage") {
        const messageId = message.message.reactionMessage.key.id;
        if (memoryStore.votes.reaction[messageId]) {
          const reactionText = message.message.reactionMessage.text;
          if (!memoryStore.votes.reaction[messageId].allowedEmoji || !memoryStore.votes.reaction[messageId].allowedEmoji.includes(reactionText)) {
            return;
          }
          if (!memoryStore.votes.reaction[messageId].vote) {
            memoryStore.votes.reaction[messageId].vote = [];
          }
          const voteIndex = memoryStore.votes.reaction[messageId].vote.findIndex(vote => vote.personJid === normalizedUser);
          if (voteIndex !== -1) {
            memoryStore.votes.reaction[messageId].vote[voteIndex].vote = reactionText;
          } else {
            memoryStore.votes.reaction[messageId].vote.push({
              personJid: normalizedUser,
              vote: reactionText
            });
          }
        }
      }

      if (!memoryStore.messages[remoteJid]) {
        memoryStore.messages[remoteJid] = {
          array: [],
          get: function (messageId) {
            const foundMessage = this.array.find(msg => msg.key.id === messageId);
            return foundMessage ? foundMessage : false;
          },
          clear: function () {
            this.array = [];
          },
          remove: function (messageId) {
            this.array = this.array.filter(msg => msg.key.id !== messageId);
          },
          upsert: function (newMessage) {
            const messageIndex = this.array.findIndex(msg => msg.key.id === newMessage.key.id);
            if (messageIndex !== -1) {
              this.array[messageIndex] = newMessage;
            } else {
              this.array.push(newMessage);
            }
          }
        };
      }
      memoryStore.messages[remoteJid].upsert(message);
    });
  };

  memoryStore.loadMessage = async (jid, messageId) => {
    return memoryStore.messages[jid]?.get(messageId) || null;
  };

  memoryStore.getName = async (jid) => {
    const normalizedUser = jidNormalizedUser(jid);
    if (normalizedUser.endsWith("@g.us")) {
      const groupMeta = await memoryStore.fetchGroupMetadata(normalizedUser).catch(() => ({}));
      return groupMeta.subject || "undefined";
    }
    if (!memoryStore.contacts[normalizedUser]) {
      try {
        const phoneNumber = PhoneNumber('+' + normalizedUser.replace("@s.whatsapp.net", ''));
        return phoneNumber ? phoneNumber.getNumber("international") : null;
      } catch (error) {
        console.error("Error parsing phone number:", error);
        return "unknown";
      }
    }
    const { name } = memoryStore.contacts[normalizedUser];
    return name || "unknown";
  };

  memoryStore.groupStatus = async (groupId, statusType) => {
    const messages = memoryStore.messages[groupId]?.array || [];
    const participantsMap = messages.reduce((acc, { key: { participant }, pushName }) => {
      if (acc.has(participant)) {
        acc.get(participant).messageCount++;
      } else {
        acc.set(participant, {
          jid: participant,
          pushName: pushName,
          messageCount: 1
        });
      }
      return acc;
    }, new Map());

    const activeParticipants = Array.from(participantsMap.values()).filter(({ jid }) => jid);

    const { participants } = await memoryStore.fetchGroupMetadata(groupId).catch(() => ({}));
    const activeJids = new Set(activeParticipants.map(({ jid }) => jid));
    const inactiveParticipants = (participants || []).filter(({ id }) => !activeJids.has(id)).map(({ id, admin }) => ({
      jid: id,
      role: admin === "admin" ? "admin" : "member"
    }));

    return statusType === "active" ? activeParticipants : inactiveParticipants;
  };

  memoryStore.fetchGroupMetadata = async (groupId) => {
    if (!(await isJidGroup(groupId))) {
      return {};
    }
    if (!memoryStore.groupMetadata[groupId]) {
      const groupMeta = await socket.groupMetadata(groupId);
      if (groupMeta) {
        memoryStore.groupMetadata[groupId] = groupMeta;
      }
    }
    return memoryStore.groupMetadata[groupId];
  };

  return memoryStore;
}

module.exports = {
  makeInMemory
};