const toBool = (x) => x == 'true'
const { existsSync } = require('fs')
const { Sequelize } = require('sequelize');
if (existsSync('config.env')) require('dotenv').config({ path: './config.env' })
process.env.NODE_OPTIONS = '--max_old_space_size=2560'//2.5
const DB_URL =  process.env.DATABASE_URL || '';

module.exports = {
    SESSION_ID: process.env.SESSION_ID || 'inrl~ed94dUhin37d884ae2bbe305189dcc8ef454::11', //your ssid to run bot
    PORT: process.env.PORT || 3000,
    BASE_URL : "https://explicit-keely-webapi-55411c7e.koyeb.app/",
    PREFIX: '.',
    SUDO: '',
    REPO: "inr-l/inrl-bot-md",
    DATABASE: DB_URL ? new Sequelize(DB_URL,{dialect:'postgres',ssl:true,protocol: 'postgres', dialectOptions: {native: true,ssl:{require: true,rejectUnauthorized: false}}, logging: false}) : new Sequelize({dialect:'sqlite',storage:'./database.db',logging:false}) 
};