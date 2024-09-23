const { SESSION_ID } = require("../config");
const { proto, initAuthCreds, BufferJSON } = require("@whiskeysockets/baileys");

const config = require("../config");
const { DataTypes } = require("sequelize");

const sessionDB = config.DATABASE.define("store-session-json", {
  prekey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  session: {
    type: DataTypes.JSONB,
    allowNull: false
  }
});

const setSession = async (sessionData, prekey, sessionId) => {
  const existingSession = await sessionDB.findAll({
    where: {
      prekey: prekey,
      session_id: sessionId
    }
  });

  if (existingSession.length < 1) {
    await sessionDB.create({
      prekey: prekey,
      session_id: sessionId,
      session: sessionData
    });
    return true;
  } else {
    await existingSession[0].update({
      session: sessionData
    });
    return true;
  }
};
const getSession = async (prekey, sessionId) => {
  const sessionRecord = await sessionDB.findAll({
    where: {
      prekey: prekey,
      session_id: sessionId
    }
  });

  return sessionRecord.length < 1 ? false : sessionRecord[0].dataValues.session;
};

const delSession = async (prekey, sessionId) => {
  const sessionRecord = await sessionDB.findAll({
    where: {
      prekey: prekey,
      session_id: sessionId
    }
  });

  return sessionRecord.length < 1 ? false : await sessionRecord[0].destroy();
};


const MultiFileAuthState = async () => {
  // Function to get session data and parse it
  const getSessionData = async (fileName) => {
    try {
      const sessionData = await getSession(fileName, SESSION_ID);
      return JSON.parse(sessionData, BufferJSON.reviver);
    } catch (error) {
      return null;
    }
  };

  // Function to delete a session
  const deleteSessionData = async (fileName) => {
    try {
      await deleteSession(fileName, SESSION_ID);
    } catch (error) {
      // Handle error if necessary
    }
  };

  // Initialize credentials or retrieve existing ones
  const credentials = (await getSessionData("creds.json")) || initAuthCreds();

  return {
    state: {
      creds: credentials,
      keys: {
        // Function to get keys based on provided parameters
        get: async (type, ids) => {
          const keyData = {};
          await Promise.all(ids.map(async (id) => {
            let key = await getSessionData(`${type}-${id}.json`);
            if (type === "app-state-sync-key" && key) {
              key = proto.Message.AppStateSyncKeyData.fromObject(key);
            }
            keyData[id] = key;
          }));
          return keyData;
        },
        // Function to set keys
        set: async (keyObject) => {
          const tasks = [];
          for (const type in keyObject) {
            for (const id in keyObject[type]) {
              const data = keyObject[type][id];
              const fileName = `${type}-${id}.json`;
              if (data) {
                tasks.push(setSession(JSON.stringify(data, BufferJSON.replacer), fileName, SESSION_ID));
              } else {
                tasks.push(deleteSessionData(fileName));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    // Function to save credentials
    saveCreds: () => {
      return setSession(JSON.stringify(credentials, BufferJSON.replacer), "creds.json", SESSION_ID);
    }
  };
};

module.exports = {
  MultiFileAuthState,
  setSession
};
