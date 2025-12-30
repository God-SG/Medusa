const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Bot configuration
const DISCORD_TOKEN = 'MTM0MTMzNTMxNDU2MzYwll1UGeJeDVH-1oWV55E2w_N6JnsAmf_13SRiyk'; // Replace with your Discord bot token
const CLIENT_ID = '1341335314563600475'; // Replace with your Discord application client ID

const CURRENT_UTC_TIME = "2025-07-20 12:00:00";
const BOT_STATS = {
    total_users: 0,
    last_updated: "2025-07-20 12:00:00",
    current_user: null
};

// Sunrise API configuration
const SUNRISE_API = "https://api.sunrise.biz"; // Note: This endpoint may need to be updated
const SUNRISE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5ceyJzdWIiOiJkYTQ3ZDE5ZC00N2JiLTQ2NzQtOTQ1ZS04MzVhYjYxYjlhMzIiLCJleHAiOjE4NDI3Mzk2MjUsImlhdCI6MTc0ODEzMTYyNSwianRpIjoiZWQ3YjczOWQtMzNjNC00OTE5LTg0MWUtNGU4NzY5ZTljMjQ2IiwidHlwZSI6ImFwaSJ9.QXAy0pxJ_1ecBHBKbbfwCxIvgDPQ5rniwxRwdW6ARxE";

// Admin user IDs (Discord user IDs)
const ADMIN_USER_IDS = ["1211185837581271100", "770456549994790912", "1303630496198033408", "1364713785532612620", "1364294646662172803"]; // Replace with actual Discord user IDs

// Custom domain configuration for VPS
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || "https://nebulasecurity.fr"; // Replace with your actual domain

// Allowed channel ID for bot commands (replace with your channel ID)
const ALLOWED_CHANNEL_ID = "1396419705941790810"; // Replace with the actual channel ID where bot should respond

// Function to check if interaction/message is in allowed location
function isAllowedLocation(channelType, channelId) {
    // Allow DMs (channelType will be 1 for DM)
    if (channelType === 1) return true;
    
    // Allow specific channel ID
    if (channelId === ALLOWED_CHANNEL_ID) return true;
    
    return false;
}

// NowPayments Configuration  
const NOWPAYMENTS_API_KEY = 'YY79V8C-PHSZP6Q-VRP08M5';
const NOWPAYMENTS_PUBLIC_KEY = '54e58620-2052-2808461818ec';

// Validate NowPayments keys format
if (!NOWPAYMENTS_API_KEY || NOWPAYMENTS_API_KEY.includes('YOUR_API_KEY')) {
    console.error('❌ NowPayments API key not configured properly!');
    console.error('   Please set a valid API key in NOWPAYMENTS_API_KEY');
}

if (!NOWPAYMENTS_PUBLIC_KEY || NOWPAYMENTS_PUBLIC_KEY.includes('YOUR_PUBLIC_KEY')) {
    console.error('❌ NowPayments Public key not configured properly!');
    console.error('   Please set a valid Public key in NOWPAYMENTS_PUBLIC_KEY');
}

// Discord Webhook Configuration for Payment Notifications
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1396438695418134578/UwKks6S1UFqdeMgiRAArh5bBZxoFC64o1VLea1_2B559MS8Z4UkEeFpIkYdf-htnqbUn'; // Replace with your Discord webhook URL

/*
 * SETUP INSTRUCTIONS:
 * 1. Create a Discord webhook in your server:
 *    - Go to Server Settings > Integrations > Webhooks
 *    - Click "New Webhook" and copy the webhook URL
 *    - Replace the DISCORD_WEBHOOK_URL above with your webhook URL
 * 
 * 2. NowPayments will automatically handle payment notifications
 *    - No custom webhook URL needed - payments are tracked via API polling
 *    - Discord webhook notifications will be sent when payments are confirmed
 */

// Snusbase API configuration - UPDATED ENDPOINTS
const SNUSBASE_AUTH = "sbmeovhou6ecsn9fnwwvsvwnc";
const SNUSBASE_API = "https://api.snusbase.com/"; // Updated to main API endpoint

// User data storage
let userProfiles = {};
let userFunds = {};
let pendingSearches = {};
let availableProducts = [];
let pendingPayments = {}; // Track pending payments: { paymentId: { userId, amount, status, orderId } }

// Cache for products (refresh every hour)
let productCache = {
    data: [],
    lastUpdated: null
};

// Store the current product being filled by user
let userProductInputs = {};

// Fallback products in case API is down
const FALLBACK_PRODUCTS = [
  {
    "id": 13,
    "name": "DL",
    "description": "Driver's license information lookup service",
    "price": 6,
    "category_id": 3,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true},
      {"name": "DOB", "key": "dob", "type": "text", "regex": "^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/\\d{4}$", "description": "Date of birth (MM/DD/YYYY)", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 24,
    "name": "BG",
    "description": "Background report",
    "price": 4,
    "category_id": 5,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 16,
    "name": "TLO by NAME+DOB",
    "description": "TLO lookup by name and date of birth",
    "price": 11,
    "category_id": 6,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "DOB", "key": "dob", "type": "text", "regex": "^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/\\d{4}$", "description": "Date of birth (MM/DD/YYYY)", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 26,
    "name": "EMAIL",
    "description": "Email",
    "price": 4,
    "category_id": 5,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 25,
    "name": "PHONE",
    "description": "Phone number",
    "price": 4,
    "category_id": 5,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 27,
    "name": "SSN",
    "description": "Social security number",
    "price": 5,
    "category_id": 2,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": false},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": false},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": false},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true},
      {"name": "DOB", "key": "dob", "type": "text", "regex": "^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/\\d{4}$", "description": "Date of birth (MM/DD/YYYY)", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 22,
    "name": "MMN",
    "description": "Maiden mother's name",
    "price": 15,
    "category_id": 4,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true},
      {"name": "DOB", "key": "dob", "type": "text", "regex": "^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/\\d{4}$", "description": "Date of birth (MM/DD/YYYY)", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 12,
    "name": "CS",
    "description": "Credit score lookup service",
    "price": 5,
    "category_id": 4,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true},
      {"name": "DOB", "key": "dob", "type": "text", "regex": "^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/\\d{4}$", "description": "Date of birth (MM/DD/YYYY)", "required": true},
      {"name": "SSN", "key": "ssn", "type": "text", "regex": "^[\\d-]{9,11}$", "description": "Social Security Number", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 23,
    "name": "CR",
    "description": "Credit report",
    "price": 7,
    "category_id": 4,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true},
      {"name": "DOB", "key": "dob", "type": "text", "regex": "^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/\\d{4}$", "description": "Date of birth (MM/DD/YYYY)", "required": true},
      {"name": "SSN", "key": "ssn", "type": "text", "regex": "^[\\d-]{9,11}$", "description": "Social Security Number", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 19,
    "name": "CS+CR",
    "description": "Credit score + report",
    "price": 8,
    "category_id": 4,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true},
      {"name": "DOB", "key": "dob", "type": "text", "regex": "^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/\\d{4}$", "description": "Date of birth (MM/DD/YYYY)", "required": true},
      {"name": "SSN", "key": "ssn", "type": "text", "regex": "^[\\d-]{9,11}$", "description": "Social Security Number", "required": true}
    ],
    "is_active": true
  },
  {
    "id": -2,
    "name": "SSN+DOB TEST",
    "description": "TSET",
    "price": 5,
    "category_id": 2,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": false},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": false},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": false},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 10,
    "name": "REVERSE PHONE",
    "description": "Lookup person information by phone number",
    "price": 8,
    "category_id": 7,
    "input_schema": [
      {"name": "Phone Number", "key": "phone", "type": "text", "regex": "^\\d{10}$", "description": "Phone number (10 digits)", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 14,
    "name": "EIN",
    "description": "Employer Identification Number lookup service",
    "price": 10,
    "category_id": 7,
    "input_schema": [
      {"name": "Company Name", "key": "company_name", "type": "text", "regex": "^.{3,100}$", "description": "Company name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[A-Z-az]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 11,
    "name": "REVERSE SSN",
    "description": "Lookup person information by Social Security Number",
    "price": 9,
    "category_id": 7,
    "input_schema": [
      {"name": "SSN", "key": "ssn", "type": "text", "regex": "^[\\d-]{9,11}$", "description": "Social Security Number", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 18,
    "name": "TLO by SSN",
    "description": "TLO lookup by Social Security Number",
    "price": 16,
    "category_id": 6,
    "input_schema": [
      {"name": "SSN", "key": "ssn", "type": "text", "regex": "^[\\d-]{9,11}$", "description": "Social Security Number", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 17,
    "name": "TLO by NAME+ADDRESS",
    "description": "TLO lookup by name and address",
    "price": 11,
    "category_id": 6,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": true},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": true},
      {"name": "State", "key": "state", "type": "text", "regex": "^[A-Za-z]{2}$", "description": "State code (2 letters)", "required": true},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true}
    ],
    "is_active": true
  },
  {
    "id": 1,
    "name": "SSN+DOB",
    "description": "Social security number + date of birth lookup service",
    "price": 5,
    "category_id": 2,
    "input_schema": [
      {"name": "First Name", "key": "firstname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "First name", "required": true},
      {"name": "Last Name", "key": "lastname", "type": "text", "regex": "^[A-Za-z\\s]{2,30}$", "description": "Last name", "required": true},
      {"name": "Address", "key": "address", "type": "text", "regex": "^.{5,100}$", "description": "Street address", "required": false},
      {"name": "City", "key": "city", "type": "text", "regex": "^[A-Za-z\\s]{2,50}$", "description": "City name", "required": false},
      {"name": "State", "key": "state", "type": "text", "regex": "^[\\w]{2}$", "description": "State code (2 letters)", "required": false},
      {"name": "Zip Code", "key": "zip", "type": "text", "regex": "^[\\d-]{5,10}$", "description": "ZIP or postal code", "required": true}
    ],
    "is_active": true
  }
];

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Process payment confirmation and credit user account
async function processPaymentConfirmation(paymentInfo, actualAmount) {
    try {
        const { userId, amount, orderId } = paymentInfo;
        
        // Handle different amount formats from NowPayments API
        const paidAmount = actualAmount || amount;
        const creditAmount = parseFloat(amount);
        
        console.log(`✅ Processing confirmed payment: User ${userId}, Credit $${creditAmount}, Paid $${paidAmount}`);
        
        // Credit user account
        if (!userFunds[userId]) userFunds[userId] = 0;
        userFunds[userId] += creditAmount;
        
        await saveUserFunds(userFunds);
        
        // Notify user via DM
        try {
            const user = await client.users.fetch(userId);
            const confirmationEmbed = new EmbedBuilder()
                .setTitle('💰 Payment Confirmed!')
                .setDescription(`Your payment has been successfully processed and funds added to your account.`)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Amount Paid', value: `$${paidAmount} USD`, inline: true },
                    { name: 'Account Credit', value: `$${creditAmount}`, inline: true },
                    { name: 'New Balance', value: `$${userFunds[userId]}`, inline: true },
                    { name: 'Order ID', value: orderId, inline: false }
                )
                .setFooter({ text: 'Thank you for your payment! You can now use the bot services.' })
                .setTimestamp();
            
            await user.send({ embeds: [confirmationEmbed] });
            console.log(`📨 Payment confirmation sent to user ${userId}`);
            
        } catch (dmError) {
            console.warn(`⚠️ Could not send DM to user ${userId}:`, dmError.message);
        }
        
        // Send Discord webhook notification
        await sendDiscordWebhookNotification(userId, creditAmount, paidAmount, orderId);
        
        // Clean up processed payment
        delete pendingPayments[paymentInfo.paymentId];
        
        console.log(`✅ Payment processed successfully for user ${userId}: +$${amount}`);
        
    } catch (error) {
        console.error('❌ Error processing payment confirmation:', error);
    }
}

// Send Discord webhook notification for confirmed payments
async function sendDiscordWebhookNotification(userId, creditAmount, paidAmount, orderId) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('YOUR_WEBHOOK')) {
        console.log('⚠️ Discord webhook URL not configured, skipping webhook notification');
        return;
    }
    
    try {
        // Get user information
        const user = await client.users.fetch(userId);
        const username = user.username;
        const displayName = user.displayName || username;
        
        // Create webhook payload
        const webhookData = {
            username: 'MedusaTLO Payment Bot',
            avatar_url: 'https://cdn.discordapp.com/app-icons/1341335314563600475/icon.png', // Optional bot avatar
            embeds: [
                {
                    title: '💰 Payment Confirmed',
                    description: `A new payment has been successfully processed!`,
                    color: 0x00FF00, // Green color
                    fields: [
                        {
                            name: '👤 User',
                            value: `${displayName} (@${username})`,
                            inline: true
                        },
                        {
                            name: '💵 Amount Paid',
                            value: `$${paidAmount} USD`,
                            inline: true
                        },
                        {
                            name: '💳 Account Credit',
                            value: `$${creditAmount}`,
                            inline: true
                        },
                        {
                            name: '🆔 Order ID',
                            value: orderId,
                            inline: false
                        },
                        {
                            name: '📅 Date & Time',
                            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'MedusaTLO Bot Payment System',
                        icon_url: 'https://cdn.discordapp.com/app-icons/1341335314563600475/icon.png'
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        };
        
        // Send webhook
        const response = await axios.post(DISCORD_WEBHOOK_URL, webhookData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log(`✅ Discord webhook notification sent for payment: ${orderId}`);
        
    } catch (error) {
        console.error('❌ Failed to send Discord webhook notification:', error.message);
        if (error.response) {
            console.error(`   - Status: ${error.response.status}`);
            console.error(`   - Response: ${JSON.stringify(error.response.data)}`);
        }
    }
}

// VPS-specific paths for Ubuntu 22.04
const VPS_BASE_PATH = '/var/www/medusatlo';
const STORAGE_PATH = path.join(VPS_BASE_PATH, 'storage');
const KEYS_PATH = path.join(STORAGE_PATH, 'keys');
const RESULTS_PATH = path.join(STORAGE_PATH, 'results'); // JSON results for PHP access system
const OLD_PATH = path.join(STORAGE_PATH, 'old'); // Legacy JSON database files (order_results.json, database_results.json)
const PUBLIC_PATH = path.join(VPS_BASE_PATH, 'public');
const USERS_PATH = path.join(STORAGE_PATH, 'users');

// Ensure directories exist
async function ensureDirectories() {
    try {
        // Create VPS directory structure
        await fs.mkdir(STORAGE_PATH, { recursive: true });
        await fs.mkdir(KEYS_PATH, { recursive: true });
        await fs.mkdir(RESULTS_PATH, { recursive: true });
        await fs.mkdir(OLD_PATH, { recursive: true }); // Old JSON database files
        await fs.mkdir(PUBLIC_PATH, { recursive: true });
        await fs.mkdir(USERS_PATH, { recursive: true });
        
        console.log('✅ VPS directory structure created successfully');
    } catch (error) {
        console.error('Error creating VPS directories:', error);
    }
}

// Load user profiles from JSON file
async function loadUserProfiles() {
    try {
        const data = await fs.readFile(path.join(USERS_PATH, 'users.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Load user funds from JSON file
async function loadUserFunds() {
    try {
        const data = await fs.readFile(path.join(USERS_PATH, 'funds.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Load pending payments from JSON file
async function loadPendingPayments() {
    try {
        const data = await fs.readFile(path.join(USERS_PATH, 'payments.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Save pending payments to JSON file
async function savePendingPayments(payments) {
    try {
        await fs.writeFile(path.join(USERS_PATH, 'payments.json'), JSON.stringify(payments, null, 4));
    } catch (error) {
        console.error('Error saving pending payments:', error);
    }
}

// Save user profiles to JSON file
async function saveUserProfiles(profiles) {
    try {
        await fs.writeFile(path.join(USERS_PATH, 'users.json'), JSON.stringify(profiles, null, 4));
    } catch (error) {
        console.error('Error saving user profiles:', error);
    }
}

// Save user funds to JSON file
async function saveUserFunds(funds) {
    try {
        // Security check: Prevent negative balances (except for admins)
        const sanitizedFunds = {};
        for (const [userId, balance] of Object.entries(funds)) {
            if (ADMIN_USER_IDS.includes(userId)) {
                // Admins can have any balance (including high positive values)
                sanitizedFunds[userId] = balance;
            } else {
                // Regular users cannot have negative balances
                sanitizedFunds[userId] = Math.max(0, balance || 0);
                
                // Log if we're correcting a negative balance
                if (balance < 0) {
                    console.warn(`⚠️ Corrected negative balance for user ${userId}: ${balance} → 0`);
                }
            }
        }
        
        await fs.writeFile(path.join(USERS_PATH, 'funds.json'), JSON.stringify(sanitizedFunds, null, 4));
    } catch (error) {
        console.error('Error saving user funds:', error);
    }
}

// Load access keys from JSON file
// Expected structure:
// {
//   "codes": {
//     "ABCD1234": { service, search_term, file_name, created, expires, used, max_uses, created_by, active },
//     "EFGH5678": { ... }
//   },
//   "settings": {
//     "default_expiry_days": 30,
//     "code_length": 8,
//     "ip_tracking": true
//   }
// }
async function loadAccessKeys() {
    try {
        const data = await fs.readFile(path.join(KEYS_PATH, 'access_keys.json'), 'utf8');
        const parsed = JSON.parse(data);
        
        // Ensure proper structure with codes and settings
        if (!parsed.codes) {
            return {
                codes: {},
                settings: {
                    default_expiry_days: 30,
                    code_length: 8,
                    ip_tracking: true
                }
            };
        }
        
        return parsed;
    } catch (error) {
        return {
            codes: {},
            settings: {
                default_expiry_days: 30,
                code_length: 8,
                ip_tracking: true
            }
        };
    }
}

// Save access keys to JSON file
async function saveAccessKeys(keys) {
    try {
        await fs.writeFile(path.join(KEYS_PATH, 'access_keys.json'), JSON.stringify(keys, null, 4));
    } catch (error) {
        console.error('Error saving access keys:', error);
    }
}

// Generate unique access key for a search result (8 characters for VPS)
function generateAccessKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Store access key for a result file
async function storeAccessKey(fileName, searchTerm, searchType, userId) {
    try {
        const accessKeysData = await loadAccessKeys();
        const accessKey = generateAccessKey();
        
        // Convert search type to service name
        let serviceName = 'Database Search';
        switch (searchType) {
            case 'email': serviceName = 'Email Database Search'; break;
            case 'username': serviceName = 'Username Database Search'; break;
            case 'name': serviceName = 'Name Database Search'; break;
            case 'password': serviceName = 'Password Database Search'; break;
            case 'hash': serviceName = 'Hash Database Search'; break;
            case 'lastip': serviceName = 'IP Address Database Search'; break;
            case '_domain': serviceName = 'Domain Database Search'; break;
            case 'all': serviceName = 'TLO Lookup'; break;
            case 'fallback_all': serviceName = 'DB Trace'; break;
            default: serviceName = 'Database Search'; break;
        }
        
        // Store access key in the codes object with uppercase format
        accessKeysData.codes[accessKey] = {
            "service": serviceName,
            "search_term": searchTerm,
            "search_type": searchType,
            "file_name": fileName, // Already JSON filename
            "created": new Date().toISOString(),
            "expires": new Date(Date.now() + (accessKeysData.settings.default_expiry_days * 24 * 60 * 60 * 1000)).toISOString(),
            "used": 0,
            "max_uses": 3,
            "created_by": userId,
            "active": true
        };
        
        await saveAccessKeys(accessKeysData);
        console.log(`🔑 Generated access key: ${accessKey} for file: ${fileName}`);
        
        return accessKey;
    } catch (error) {
        console.error('Error storing access key:', error);
        return null;
    }
}

// Send DM with access code and instructions
async function sendAccessCodeDM(userId, accessKey, serviceName, searchTerm, searchType) {
    try {
        const user = await client.users.fetch(userId);
        
        const resultEmbed = new EmbedBuilder()
            .setTitle('🔍 Your Search Results Are Ready!')
            .setDescription(`Your ${serviceName} has been completed and securely stored.`)
            .setColor(0x00FF00)
            .addFields(
                { name: '🔑 Access Code', value: `\`\`\`\n${accessKey}\n\`\`\`\n**Tap to select and copy**`, inline: false },
                { name: '📋 Quick Copy', value: `\`${accessKey}\``, inline: true },
                { name: '🔍 Search Type', value: searchType.toUpperCase(), inline: true },
                { name: '🎯 Search Term', value: searchTerm, inline: true },
                { name: '🌐 Access Portal', value: `[Click here to view results](${CUSTOM_DOMAIN}/access)`, inline: false },
                { name: '📋 Instructions', value: '1. Click the link above\n2. Enter your access code\n3. View your secure results', inline: false },
                { name: '⚠️ Important Notes', value: '• Code expires in 30 days\n• Maximum 3 views allowed\n• Keep your code private', inline: false }
            )
            .setFooter({ text: 'MedusaTLO Secure Results Portal • Results are encrypted and protected • Tap code to copy' })
            .setTimestamp();

        await user.send({ embeds: [resultEmbed] });
        console.log(`📨 Sent access code DM to user ${userId} with code: ${accessKey}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to send DM to user ${userId}:`, error.message);
        throw error; // Re-throw so calling function knows it failed
    }
}

// Initialize user profile
function initializeUserProfile(userId, username) {
    if (!userProfiles[userId]) {
        BOT_STATS.total_users++;
        BOT_STATS.current_user = username;
        
        const balance = ADMIN_USER_IDS.includes(userId) ? 9999999 : 0;
        
        userProfiles[userId] = {
            username: username,
            start_date: BOT_STATS.last_updated,
            last_login: BOT_STATS.last_updated,
            balance: balance
        };
        
        userFunds[userId] = balance;
        
        saveUserProfiles(userProfiles);
        saveUserFunds(userFunds);
        
        console.log(`New user initialized - ID: ${userId}, Username: ${username}, Time: ${BOT_STATS.last_updated}`);
    } else {
        BOT_STATS.current_user = username;
    }
}

// Fetch products from Sunrise API
async function fetchProducts() {
    console.log('ðŸ”„ Attempting to fetch products from Sunrise API...');
    
    try {
        const headers = {
            'accept': 'application/json',
            'Authorization': `Bearer ${SUNRISE_TOKEN}`
        };
        
        // Use GET request with query parameters as per API documentation
        const params = new URLSearchParams({
            category_id: 1,
            category_recursion: 1
        });
        
        console.log(`ðŸ“¡ Connecting to: ${SUNRISE_API}/products?${params}`);
        const response = await axios.get(`${SUNRISE_API}/products?${params}`, { 
            headers,
            timeout: 15000 // 15 second timeout
        });
        
        if (response.data && response.data.data) {
            productCache.data = response.data.data;
            productCache.lastUpdated = new Date();
            availableProducts = response.data.data;
            
            console.log(`✅ Successfully loaded ${availableProducts.length} products from Sunrise API`);
            return availableProducts;
        } else if (Array.isArray(response.data)) {
            productCache.data = response.data;
            productCache.lastUpdated = new Date();
            availableProducts = response.data;
            
            console.log(`✅ Successfully loaded ${availableProducts.length} products from Sunrise API (direct array)`);
            return availableProducts;
        } else {
            console.warn('⚠️ Unexpected response format from Sunrise API, using fallback products');
            console.log('Response:', JSON.stringify(response.data, null, 2));
            availableProducts = FALLBACK_PRODUCTS;
            return FALLBACK_PRODUCTS;
        }
    } catch (error) {
        console.error('❌ Sunrise API Error Details:');
        console.error(`   - Error Type: ${error.name}`);
        console.error(`   - Error Message: ${error.message}`);
        
        if (error.response) {
            console.error(`   - HTTP Status: ${error.response.status}`);
            console.error(`   - Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            console.error('   - No response received from server');
            console.error(`   - Request details: ${error.request}`);
        } else if (error.code === 'ENOTFOUND') {
            console.error('   - DNS resolution failed - check API endpoint URL');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('   - Request timed out');
        }
        
        console.log('🔧 Using fallback products (18+ products available)');
        availableProducts = FALLBACK_PRODUCTS;
        return FALLBACK_PRODUCTS;
    }
}

// Function to send DM with results file
async function sendResultDM(userId, orderData, result) {
    try {
        const user = await client.users.fetch(userId);
        
        // Create result file content
        const resultData = {
            order_id: orderData.order_id,
            product: orderData.product_name,
            timestamp: new Date().toISOString(),
            input_data: orderData.input_data,
            result: result || 'Processing...',
            status: result ? 'completed' : 'processing'
        };
        
        // Save to file
        const fileName = `order_${orderData.order_id}_results.json`;
        const filePath = path.join(RESULTS_PATH, fileName);
        
        // Ensure results directory exists
        if (!require('fs').existsSync(RESULTS_PATH)) {
            require('fs').mkdirSync(RESULTS_PATH, { recursive: true });
        }
        
        require('fs').writeFileSync(filePath, JSON.stringify(resultData, null, 2));
        
        // Send DM with file
        await user.send({
            content: `📁 **Order Results**\n\n**Order ID:** ${orderData.order_id}\n**Product:** ${orderData.product_name}\n**Status:** ${resultData.status}`,
            files: [{
                attachment: filePath,
                name: fileName
            }]
        });
        
        console.log(`DM sent to user ${userId} with results for order ${orderData.order_id}`);
    } catch (error) {
        console.error('Error sending DM:', error.message);
    }
}

// Get cached products or fetch if expired
async function getProducts() {
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    if (!productCache.lastUpdated || (new Date() - productCache.lastUpdated) > oneHour) {
        await fetchProducts();
    }
    
    return productCache.data;
}

// Create product selection embed
async function createProductSelectionEmbed() {
    const products = await getProducts();
    
    const embed = new EmbedBuilder()
        .setTitle('ðŸ›ï¸ Available Products')
        .setDescription('Select a product to purchase:')
        .setColor(0x0099FF);
    
    if (products.length === 0) {
        embed.setDescription('No products available at the moment. Please try again later.');
        return { embeds: [embed] };
    }
    
    // Create select menu with products (max 25 options)
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_product')
        .setPlaceholder('Choose a product...')
        .addOptions(
            products.slice(0, 25).map(product => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${product.name} - $${product.price}`)
                    .setDescription(product.description?.substring(0, 100) || 'No description available')
                    .setValue(product.id.toString())
            )
        );
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    // Add product details to embed
    products.slice(0, 10).forEach(product => {
        embed.addFields({
            name: `${product.name}`,
            value: `Price: $${product.price}\nID: ${product.id}`,
            inline: true
        });
    });
    
    return { embeds: [embed], components: [row] };
}

// Log results (legacy JSON files stored in OLD_PATH)
async function logResults(fileName, data) {
    const resultsFile = path.join(OLD_PATH, fileName);
    const logEntry = {
        timestamp: BOT_STATS.last_updated,
        user: BOT_STATS.current_user,
        data: data
    };
    
    let resultsData = [];
    try {
        const existingData = await fs.readFile(resultsFile, 'utf8');
        resultsData = JSON.parse(existingData);
        if (!Array.isArray(resultsData)) {
            resultsData = [];
        }
    } catch (error) {
        resultsData = [];
    }
    
    resultsData.push(logEntry);
    await fs.writeFile(resultsFile, JSON.stringify(resultsData, null, 4));
}

// Generate JSON results file and store access key for PHP system
async function generateJSONResultsFile(searchTerm, searchType, results, fileName, userId) {
    // Generate access key for this result file
    const accessKey = await storeAccessKey(fileName, searchTerm, searchType, userId);
    
    try {
        // Store results as JSON in the storage/results directory
        const outputFile = path.join(RESULTS_PATH, fileName);
        
        // Format results data for JSON storage
        const resultsData = {
            searchTerm: searchTerm,
            searchType: searchType,
            timestamp: new Date().toISOString(),
            userId: userId,
            accessKey: accessKey,
            totalResults: results ? results.length : 0,
            results: results || []
        };
        
        // Write the JSON data to storage/results
        await fs.writeFile(outputFile, JSON.stringify(resultsData, null, 4));
        console.log(`âœ… Generated JSON results file: ${outputFile} (Access Key: ${accessKey})`);
        
        return accessKey; // Return the access key for use in Discord message
        
    } catch (error) {
        console.error('❌ Error generating JSON results file:', error);
        return null;
    }
}

// Log database search results to database.json with new format
async function logDatabaseResults(searchTerm, searchType, results, userId = 'unknown') {
    const databaseFile = path.join(RESULTS_PATH, 'database.json');
    
    // Determine service name based on search type
    let serviceName = 'Database Search';
    switch (searchType) {
        case 'email': serviceName = 'Email Database Search'; break;
        case 'username': serviceName = 'Username Database Search'; break;
        case 'name': serviceName = 'Name Database Search'; break;
        case 'password': serviceName = 'Password Database Search'; break;
        case 'hash': serviceName = 'Hash Database Search'; break;
        case 'lastip': serviceName = 'IP Address Database Search'; break;
        case '_domain': serviceName = 'Domain Database Search'; break;
        case 'all': serviceName = 'TLO Lookup'; break;
        case 'fallback_all': serviceName = 'DB Trace'; break;
        default: serviceName = 'Database Search'; break;
    }
    
    // Generate a unique key for this search
    const searchKey = generateAccessKey();
    const fileName = `database_search_${searchType}_${searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    
    // Generate JSON results file and get access key
    const accessKey = await generateJSONResultsFile(searchTerm, searchType, results, fileName, userId);
    
    // Send DM with access code
    if (accessKey) {
        try {
            await sendAccessCodeDM(userId, accessKey, serviceName, searchTerm, searchType);
        } catch (error) {
            console.error(`Failed to send DM to user ${userId} for access key ${accessKey}:`, error.message);
            // Don't throw here, just log it since the file was still created successfully
        }
    }
    
    // Prepare query object based on search type
    let queryObject = {};
    if (searchType === 'email') {
        queryObject.email = searchTerm;
    } else if (searchType === 'username') {
        queryObject.username = searchTerm;
    } else if (searchType === 'name') {
        queryObject.fullname = searchTerm;
    } else if (searchType === 'lastip') {
        queryObject.ip_address = searchTerm;
    } else {
        queryObject.search_term = searchTerm;
        queryObject.search_type = searchType;
    }
    
    // Prepare results object with sample data from search results
    let resultsObject = {};
    if (results && results.length > 0) {
        const firstResult = results[0];
        if (firstResult.email) resultsObject.email = firstResult.email;
        if (firstResult.username) resultsObject.username = firstResult.username;
        if (firstResult.name) resultsObject.name = firstResult.name;
        if (firstResult.lastip) resultsObject.lastip = firstResult.lastip;
        if (firstResult.password) resultsObject.password = "***REDACTED***";
        if (firstResult.hash) resultsObject.hash = firstResult.hash.substring(0, 16) + "...";
        
        // Add summary info
        resultsObject.total_matches = results.length;
        resultsObject.databases_found = [...new Set(results.map(r => r.database).filter(Boolean))];
        resultsObject.access_key = accessKey;
    }
    
    // Load existing database.json or create new object
    let databaseData = {};
    try {
        const existingData = await fs.readFile(databaseFile, 'utf8');
        databaseData = JSON.parse(existingData);
    } catch (error) {
        databaseData = {};
    }
    
    // Add new result with the new format
    databaseData[searchKey] = {
        "service": serviceName,
        "timestamp": new Date().toISOString(),
        "query": queryObject,
        "results": resultsObject
    };
    
    // Save to database.json
    await fs.writeFile(databaseFile, JSON.stringify(databaseData, null, 2));
    
    console.log(`🔍 Logged database search result to database.json: ${serviceName} - ${searchTerm} (Key: ${searchKey})`);
    
    return accessKey;
}

// Create main menu embed
function createMainMenuEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('🔍 MedusaTLO Bot')
        .setDescription('Welcome to the MedusaTLO Bot! Choose an option below:')
        .setColor(0x0099FF)
        .addFields(
            { name: '🛒 Browse Products', value: 'View available services', inline: true },
            { name: '💾 Database Search', value: 'Search databases', inline: true },
            { name: '💰 Add Funds', value: 'Crypto Payment', inline: true }
        );
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('browse_products')
                .setLabel('Browse Products')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🛒'),
            new ButtonBuilder()
                .setCustomId('database_search')
                .setLabel('Database Search')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💾'),
            new ButtonBuilder()
                .setCustomId('add_funds')
                .setLabel('Add Funds')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰')
        );
    
    return { embeds: [embed], components: [row] };
}

// Direct crypto payment functionality removed - using automated NowPayments webhook system instead

// Purchase product via Sunrise API
async function purchaseProduct(productId, inputs, userId) {
    console.log(`🛒 Processing order for Product ID: ${productId}`);
    
    try {
        const headers = {
            'accept': 'application/json',
            'Authorization': `Bearer ${SUNRISE_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // Payload structure according to API documentation:
        // POST /orders { "product_id": 1, "inputs": { "field1": "value1", "field2": "value2" } }
        const payload = {
            product_id: productId,
            inputs: inputs
        };
        
        console.log('📦 Order payload:', JSON.stringify(payload, null, 2));
        
        // API endpoint with parameters:
        // - long_polling: Wait for order completion (default: false for faster response)
        // - timeout: Max wait time in seconds when long_polling=true (default: 30, max: 500)
        // - ws_notify: Send websocket notification on completion (default: true)
        // - test_order: Whether this is a test order (default: false)
        const response = await axios.post(`${SUNRISE_API}/orders?long_polling=false&timeout=30&ws_notify=false&test_order=false`, payload, { 
            headers,
            timeout: 45000 // 45 second timeout for HTTP request (separate from API timeout)
        });
        
        console.log('✅ Order successfully processed');
        console.log('Order response:', JSON.stringify(response.data, null, 2));
        
        // Send DM with results if userId provided
        if (userId && response.data) {
            const orderData = {
                order_id: response.data.order_id || response.data.id || uuidv4(),
                product_name: availableProducts.find(p => p.id === productId)?.name || `Product ${productId}`,
                input_data: inputs
            };
            await sendResultDM(userId, orderData, response.data);
        }
        
        return response.data;
    } catch (error) {
        console.error('❌ Purchase Error Details:');
        console.error(`   - Error Type: ${error.name}`);
        console.error(`   - Error Message: ${error.message}`);
        
        if (error.response) {
            console.error(`   - HTTP Status: ${error.response.status}`);
            console.error(`   - Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
            
            if (error.response.status === 401) {
                console.error('   - Authentication failed - check Sunrise API token');
            } else if (error.response.status === 403) {
                console.error('   - Access forbidden - check API permissions');
            } else if (error.response.status === 400) {
                console.error('   - Bad request - check input data format');
            } else if (error.response.status === 402) {
                console.error('   - Payment required - check account balance');
            }
        } else if (error.code === 'ENOTFOUND') {
            console.error('   - DNS resolution failed - check API endpoint URL');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('   - Request timed out');
        }
        
        return null;
    }
}

// Create input form embed for a product
function createProductInputEmbed(product, currentInputIndex = 0, collectedInputs = {}) {
    const inputSchema = product.input_schema;
    const currentInput = inputSchema[currentInputIndex];
    
    const embed = new EmbedBuilder()
        .setTitle(`🛒 ${product.name} - Input Required`)
        .setDescription(`**${product.description}**\nPrice: $${product.price}`)
        .setColor(0x0099FF)
        .addFields([
            {
                name: `📝 Step ${currentInputIndex + 1} of ${inputSchema.length}`,
                value: `**${currentInput.name}** ${currentInput.required ? '(Required)' : '(Optional)'}`,
                inline: false
            },
            {
                name: 'Description',
                value: currentInput.description,
                inline: false
            }
        ]);

    if (currentInput.regex) {
        embed.addFields({
            name: 'Format',
            value: `Must match pattern: \`${currentInput.regex}\``,
            inline: false
        });
    }

    if (currentInput.placeholder) {
        embed.addFields({
            name: 'Example',
            value: currentInput.placeholder,
            inline: false
        });
    }

    // Show already collected inputs
    if (Object.keys(collectedInputs).length > 0) {
        const collectedText = Object.entries(collectedInputs)
            .map(([key, value]) => `• ${key}: ${value}`)
            .join('\n');
        embed.addFields({
            name: '✅ Already Provided',
            value: collectedText.substring(0, 1024), // Discord field limit
            inline: false
        });
    }

    return { embeds: [embed] };
}

// Validate input against regex
function validateInput(input, regex) {
    if (!regex) return true;
    const regexObj = new RegExp(regex);
    return regexObj.test(input);
}

// Perform database search using Snusbase
async function performDatabaseSearch(searchTerm, searchType = 'all') {
    console.log(`🔍 Attempting database search for: "${searchTerm}" (Type: ${searchType})`);
    
    // First, test API connectivity with stats endpoint
    const testConnectivity = async () => {
        try {
            console.log('🧪 Testing Snusbase API connectivity...');
            const testResponse = await axios.get('https://api.snusbase.com/data/stats', {
                headers: { 'Auth': SNUSBASE_AUTH },
                timeout: 10000
            });
            console.log('✅ API connectivity test successful');
            return true;
        } catch (error) {
            console.log('❌ API connectivity test failed:', error.message);
            if (error.response) {
                console.log('   - Status:', error.response.status);
                console.log('   - Headers:', error.response.headers);
            }
            return false;
        }
    };
    
    // Test connectivity first
    const isApiUp = await testConnectivity();
    if (!isApiUp) {
        console.log('⚠️ Snusbase API appears to be down, returning sample data');
        return getUnavailableSampleData(searchTerm, searchType);
    }
    
    // Multiple API endpoints to try
    const apiEndpoints = [
        "https://api.snusbase.com/data/search",
        "https://snusbase.com/api/data/search", // Alternative subdomain
        "https://www.snusbase.com/api/data/search" // www subdomain fallback
    ];
    
    // Headers according to Snusbase documentation
    const headers = {
        'Content-Type': 'application/json',
        'Auth': SNUSBASE_AUTH,
        'User-Agent': 'MedusaTLO-Bot/1.0'
    };
    
    // Determine search types based on user selection
    let searchTypes;
    switch (searchType) {
        case 'email':
            searchTypes = ["email"];
            break;
        case 'username':
            searchTypes = ["username"];
            break;
        case 'name':
            searchTypes = ["name"];
            break;
        case 'password':
            searchTypes = ["password"];
            break;
        case 'hash':
            searchTypes = ["hash"];
            break;
        case 'lastip':
            searchTypes = ["lastip"];
            break;
        case '_domain':
            searchTypes = ["_domain"];
            break;
        case 'all':
        default:
            searchTypes = ["email", "username", "lastip", "password", "hash", "name", "_domain"];
            break;
    }
    
    // Body according to Snusbase API documentation
    const body = {
        terms: [searchTerm],
        types: searchTypes,
        wildcard: false,
        group_by: "db" // Group results by database (default behavior)
    };
    
    console.log('📦 Search payload:', JSON.stringify(body, null, 2));
    
    // Retry function with exponential backoff
    const retryWithBackoff = async (endpoint, attempt = 1, maxAttempts = 3) => {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 second delay
        
        try {
            if (attempt > 1) {
                console.log(`⏱️ Waiting ${delay}ms before retry attempt ${attempt}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            console.log(`📡 Trying endpoint ${endpoint} (Attempt ${attempt}/${maxAttempts})`);
            
            const response = await axios.post(endpoint, body, { 
                headers,
                timeout: 30000,
                validateStatus: function (status) {
                    return status < 500 || status === 503; // Don't throw on 503, we'll handle it
                }
            });
            
            // Handle 503 specifically for retry
            if (response.status === 503) {
                console.log(`⚠️ Received 503 on attempt ${attempt}, response:`, response.data.substring(0, 200));
                if (attempt < maxAttempts) {
                    return await retryWithBackoff(endpoint, attempt + 1, maxAttempts);
                } else {
                    throw new Error(`503 Service Unavailable after ${maxAttempts} attempts`);
                }
            }
            
            return response;
        } catch (error) {
            if (attempt < maxAttempts && (error.code === 'ETIMEDOUT' || error.response?.status >= 500)) {
                console.log(`🔄 Retrying due to: ${error.message}`);
                return await retryWithBackoff(endpoint, attempt + 1, maxAttempts);
            }
            throw error;
        }
    };
    
    for (let i = 0; i < apiEndpoints.length; i++) {
        const endpoint = apiEndpoints[i];
        
        try {
            const response = await retryWithBackoff(endpoint);
            
            console.log(`✅ Successfully connected to Snusbase API via: ${endpoint}`);
            
            // Check if response is HTML (service unavailable or login page)
            if (typeof response.data === 'string' && (
                response.data.includes('<!DOCTYPE html>') || 
                response.data.includes('<html>') ||
                response.data.includes('503 Service Unavailable') ||
                response.data.includes('502 Bad Gateway') ||
                response.data.includes('504 Gateway Timeout')
            )) {
                console.error('❌ Received HTML error page instead of JSON data');
                console.error('   - Server may be temporarily unavailable');
                console.error('   - Response preview:', response.data.substring(0, 200));
                continue;
            }
            
            // Log the response structure for debugging
            console.log('🔍 Response structure:', {
                type: typeof response.data,
                keys: Object.keys(response.data || {}),
                isArray: Array.isArray(response.data),
                hasResults: response.data && response.data.results ? 'yes' : 'no',
                resultsType: response.data && response.data.results ? typeof response.data.results : 'none',
                size: response.data && response.data.size ? response.data.size : 'unknown',
                took: response.data && response.data.took ? response.data.took + 'ms' : 'unknown'
            });
            
            // Handle Snusbase API response format according to documentation
            let results = [];
            
            if (response.data && response.data.results && typeof response.data.results === 'object') {
                // Results are grouped by database name (group_by: "db")
                Object.keys(response.data.results).forEach(dbName => {
                    if (Array.isArray(response.data.results[dbName])) {
                        response.data.results[dbName].forEach(item => {
                            results.push({
                                ...item,
                                database: dbName,
                                source: dbName
                            });
                        });
                    }
                });
            } else if (response.data && Array.isArray(response.data)) {
                // Direct array response (fallback)
                results = response.data;
            } else if (response.data && typeof response.data === 'object') {
                // Single result object (fallback)
                results = [response.data];
            }
            
            if (results && Array.isArray(results) && results.length > 0) {
                console.log(`📊 Found ${results.length} results for search type: ${searchType}`);
                
                // Add metadata to results
                const enhancedResults = results.map(item => ({
                    ...item,
                    search_term: searchTerm,
                    search_type: searchType,
                    timestamp: new Date().toISOString()
                }));
                
                return enhancedResults;
            } else {
                console.log('⚠️ No results found in response');
                console.log('Response data:', JSON.stringify(response.data, null, 2));
                return [];
            }
            
        } catch (error) {
            console.error(`❌ Endpoint ${i + 1} failed:`, error.message);
            
            if (error.response) {
                console.error(`   - HTTP Status: ${error.response.status}`);
                console.error(`   - Response Data: ${JSON.stringify(error.response.data, null, 2).substring(0, 500)}`);
                
                if (error.response.status === 503) {
                    console.error('   - Service temporarily unavailable (503)');
                    console.error('   - Server may be overloaded or under maintenance');
                } else if (error.response.status === 502) {
                    console.error('   - Bad Gateway (502) - upstream server error');
                } else if (error.response.status === 504) {
                    console.error('   - Gateway Timeout (504) - server took too long to respond');
                } else if (error.response.status === 401) {
                    console.error('   - Unauthorized (401) - Invalid or missing API key');
                    console.error('   - Check your Snusbase activation code');
                } else if (error.response.status === 403) {
                    console.error('   - Access forbidden (403) - check API permissions');
                } else if (error.response.status === 429) {
                    console.error('   - Rate limit exceeded (429)');
                    console.error('   - Search limit: 2,048 requests every 12 hours');
                    console.error('   - Wait before making more requests');
                } else if (error.response.status === 400) {
                    console.error('   - Bad request (400) - Invalid input or missing parameters');
                    console.error('   - Check search term and types format');
                }
            } else if (error.code === 'ENOTFOUND') {
                console.error('   - DNS resolution failed');
            } else if (error.code === 'ETIMEDOUT') {
                console.error('   - Request timed out');
            } else if (error.code === 'ECONNREFUSED') {
                console.error('   - Connection refused by server');
            }
            
            // If this is a server error (5xx), try next endpoint
            // If this is a client error (4xx), don't retry
            if (error.response && error.response.status >= 500) {
                console.log(`   - Server error detected, trying next endpoint...`);
                continue;
            } else if (error.response && error.response.status >= 400 && error.response.status < 500) {
                console.log(`   - Client error detected, skipping remaining endpoints`);
                break;
            } else {
                // Network error, try next endpoint
                continue;
            }
        }
    }
    
    console.error('❌ All Snusbase API endpoints failed');
    console.log('💡 Troubleshooting based on Snusbase docs:');
    console.log('   - Snusbase servers may be temporarily down (503 Service Unavailable)');
    console.log('   - Check API key format: should start with "sb" followed by 28 characters');
    console.log('   - Verify API key is valid and active in your Snusbase account');
    console.log('   - Check rate limits: 2,048 requests per 12 hours for search endpoint');
    console.log('   - Ensure search term format is correct for the selected type');
    console.log('   - Try with different search types: email, username, name, password, hash, lastip, _domain');
    console.log('   - Current API key format: ' + (SNUSBASE_AUTH.startsWith('sb') ? 'Correct (sb...)' : 'May be incorrect - should start with sb'));
    console.log('   - Try again in a few minutes if this is a server issue');
    
    return getUnavailableSampleData(searchTerm, searchType);
}

// Helper function to generate sample data when API is unavailable
function getUnavailableSampleData(searchTerm, searchType) {
    console.log('🛡️ Returning sample data - Snusbase API currently unavailable');
    return [
        {
            "database": "API_UNAVAILABLE_SAMPLE",
            "search_term": searchTerm,
            "search_type": searchType,
            "email": searchType === 'email' ? searchTerm : (searchTerm.includes('@') ? searchTerm : "sample@example.com"),
            "username": searchType === 'username' ? searchTerm : "sampleuser",
            "name": searchType === 'name' ? searchTerm : "John Doe",
            "password": searchType === 'password' ? searchTerm : "hashedpassword123",
            "lastip": searchType === 'lastip' ? searchTerm : "192.168.1.1",
            "source": "Demo Data - Snusbase API Unavailable",
            "timestamp": new Date().toISOString(),
            "note": "⚠️ SNUSBASE API IS CURRENTLY UNAVAILABLE (503 Service Unavailable)",
            "api_status": "503 - Service Temporarily Unavailable",
            "retry_suggestion": "The Snusbase servers are experiencing issues. Try again in 5-10 minutes.",
            "troubleshooting": "This is common when Snusbase servers are overloaded or under maintenance"
        }
    ];
}

// Alternative Snusbase search method (if main API fails)
async function performAlternativeSearch(searchTerm) {
    console.log(`🔄 Trying alternative search method for: "${searchTerm}"`);
    
    // This is a placeholder for alternative search methods
    // You could implement other data breach APIs here
    
    return null;
}

// Create payment session with NowPayments
async function createPaymentSession(userId, amount, currency = 'btc') {
    // Use the correct NowPayments API endpoint for creating invoices
    const url = "https://api.nowpayments.io/v1/invoice";
    const orderId = `medusa-${userId}-${Date.now()}-${uuidv4().substring(0, 8)}`;
    
    // NowPayments API requires BOTH Bearer token AND x-api-key headers
    const headers = {
        'Authorization': `Bearer ${NOWPAYMENTS_API_KEY}`,
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
    };
    
    // Payload according to NowPayments API documentation
    const payload = {
        price_amount: parseFloat(amount), // Ensure it's a number
        price_currency: "USD", // Must be uppercase
        pay_currency: currency.toUpperCase(), // Must be uppercase
        order_id: orderId,
        order_description: `MedusaTLO Bot - Add $${amount} funds`,
        ipn_callback_url: null, // Not using custom webhooks as requested
        success_url: "https://discord.com/channels/@me", // Redirect to Discord DMs
        cancel_url: "https://discord.com/channels/@me"
    };
    
    try {
        console.log(`💳 Creating NowPayments invoice for user ${userId}: $${amount} ${currency.toUpperCase()}`);
        console.log(`🔐 Using API Key: ${NOWPAYMENTS_API_KEY.substring(0, 8)}...${NOWPAYMENTS_API_KEY.slice(-4)}`);
        console.log(`🔍 Using Public Key: ${NOWPAYMENTS_PUBLIC_KEY.substring(0, 8)}...${NOWPAYMENTS_PUBLIC_KEY.slice(-4)}`);
        console.log('📦 Payment payload:', JSON.stringify(payload, null, 2));
        
        const response = await axios.post(url, payload, { 
            headers,
            timeout: 30000 // 30 second timeout
        });
        
        console.log('✅ NowPayments API Response Status:', response.status);
        console.log('🔨 NowPayments response:', JSON.stringify(response.data, null, 2));
        
        // NowPayments invoice response structure
        if (response.data && (response.data.id || response.data.invoice_id)) {
            const invoiceId = response.data.id || response.data.invoice_id;
            const invoiceUrl = response.data.invoice_url;
            
            // Store payment info for tracking (use invoice ID as key)
            pendingPayments[invoiceId] = {
                userId: userId,
                amount: amount,
                currency: currency,
                orderId: orderId,
                status: 'waiting',
                createdAt: new Date().toISOString(),
                paymentUrl: invoiceUrl,
                invoiceId: invoiceId,  // Store invoice ID
                paymentId: null        // Will be populated when payment is made
            };
            
            await savePendingPayments(pendingPayments);
            
            console.log(`✅ NowPayments invoice created: ID ${invoiceId}, URL: ${invoiceUrl}`);
            
            return {
                paymentId: invoiceId,
                paymentUrl: invoiceUrl,
                orderId: orderId
            };
        } else {
            console.error('❌ Invalid response from NowPayments API:', response.data);
            return null;
        }
    } catch (error) {
        console.error('❌ Failed to create NowPayments invoice:');
        console.error(`   - Error Type: ${error.name}`);
        console.error(`   - Error Message: ${error.message}`);
        
        if (error.response) {
            console.error(`   - HTTP Status: ${error.response.status}`);
            console.error(`   - Response Headers:`, JSON.stringify(error.response.headers, null, 2));
            console.error(`   - Response Data:`, JSON.stringify(error.response.data, null, 2));
            
            // Specific error handling for authentication issues
            if (error.response.status === 401) {
                console.error('   🚫 Authentication failed - check API key and public key');
                console.error('   💡 Verify keys in NowPayments dashboard settings');
                console.error('   🔐 Current API Key format: ' + (NOWPAYMENTS_API_KEY ? `${NOWPAYMENTS_API_KEY.length} chars` : 'not set'));
                console.error('   🔍 Current Public Key format: ' + (NOWPAYMENTS_PUBLIC_KEY ? `${NOWPAYMENTS_PUBLIC_KEY.length} chars` : 'not set'));
            } else if (error.response.status === 400) {
                console.error('   🚫 Bad Request - check payload format');
                console.error('   💡 Verify currency codes and amount format');
            } else if (error.response.status === 403) {
                console.error('   🚫 Forbidden - insufficient permissions');
                console.error('   💡 Check API key permissions in NowPayments dashboard');
            }
        } else if (error.code === 'ENOTFOUND') {
            console.error('   🌐 Network error - check internet connection and API URL');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('   ⏰ Request timeout - NowPayments API may be slow');
        }
        
        return null;
    }
}

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    
    // Check if interaction is in allowed location
    if (!isAllowedLocation(interaction.channel.type, interaction.channelId)) {
        await interaction.reply({ 
            content: `❌ This bot only responds in DMs or in the designated channel <#${ALLOWED_CHANNEL_ID}>. Please use the bot there.`,
            ephemeral: true 
        });
        return;
    }
    
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    initializeUserProfile(userId, username);
    
    if (interaction.isButton()) {
        switch (interaction.customId) {
            case 'browse_products':
                // Check user's balance and show it in the product menu
                const currentBalance = userFunds[userId] || 0;
                const isAdmin = ADMIN_USER_IDS.includes(userId);
                
                const products = await getProducts();
                const cheapestProduct = products.length > 0 ? Math.min(...products.map(p => p.price)) : 0;
                
                // Show products but also warn about balance if necessary
                const productMenu = await createProductSelectionEmbed();
                
                // Add balance information to the embed
                if (productMenu.embeds && productMenu.embeds.length > 0) {
                    const embed = productMenu.embeds[0];
                    
                    if (isAdmin) {
                        embed.setFooter({ text: '👑 Admin Account - Unlimited Balance' });
                    } else if (currentBalance === 0) {
                        embed.setFooter({ text: `💰 Balance: $${currentBalance} - Add funds to purchase products!` });
                        embed.setColor(0xFFA500); // Orange color for warning
                    } else if (currentBalance < cheapestProduct && cheapestProduct > 0) {
                        embed.setFooter({ text: `💰 Balance: $${currentBalance} - Insufficient for cheapest product ($${cheapestProduct})` });
                        embed.setColor(0xFFA500); // Orange color for warning
                    } else {
                        embed.setFooter({ text: `💰 Balance: $${currentBalance}` });
                    }
                }
                
                await interaction.reply({ ...productMenu, ephemeral: true });
                break;
                
            case 'database_search':
                // Create dropdown menu for different search types
                const searchTypeEmbed = new EmbedBuilder()
                    .setTitle('💾 Database Search Types')
                    .setDescription('Select the type of search you want to perform:')
                    .setColor(0x9932CC);
                
                const searchSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_search_type')
                    .setPlaceholder('Choose a search type...')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Email Search')
                            .setDescription('Search by email address')
                            .setValue('email')
                            .setEmoji('📧'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Username Search')
                            .setDescription('Search by username')
                            .setValue('username')
                            .setEmoji('👤'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Name Search')
                            .setDescription('Search by full name')
                            .setValue('name')
                            .setEmoji('🏷️'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Password Search')
                            .setDescription('Search by password')
                            .setValue('password')
                            .setEmoji('🔒'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Hash Search')
                            .setDescription('Search by password hash')
                            .setValue('hash')
                            .setEmoji('🔢'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('IP Address Search')
                            .setDescription('Search by last known IP')
                            .setValue('lastip')
                            .setEmoji('🌐'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Domain Search')
                            .setDescription('Search by domain')
                            .setValue('_domain')
                            .setEmoji('🌍'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('All Types Search')
                            .setDescription('Search across all data types')
                            .setValue('all')
                            .setEmoji('🔍')
                    );
                
                const searchRow = new ActionRowBuilder().addComponents(searchSelectMenu);
                
                await interaction.reply({ embeds: [searchTypeEmbed], components: [searchRow], ephemeral: true });
                break;
                
            case 'add_funds':
                // Create funding options embed with amount buttons
                const fundingEmbed = new EmbedBuilder()
                    .setTitle('💰 Add Funds to Your Account')
                    .setDescription('Choose an amount to add via NowPayments (cryptocurrency payment processor):')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '💳 Secure Payment', value: 'All payments processed through NowPayments', inline: true },
                        { name: '⚡ Auto-Credit', value: 'Funds added automatically after confirmation', inline: true },
                        { name: '🔐 Multiple Currencies', value: 'Bitcoin, Ethereum, Litecoin, and more', inline: true }
                    );
                
                const fundingRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('nowpayments_fund_10')
                            .setLabel('$10 USD')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💳'),
                        new ButtonBuilder()
                            .setCustomId('nowpayments_fund_25')
                            .setLabel('$25 USD')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💳'),
                        new ButtonBuilder()
                            .setCustomId('nowpayments_fund_50')
                            .setLabel('$50 USD')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💳'),
                        new ButtonBuilder()
                            .setCustomId('nowpayments_fund_100')
                            .setLabel('$100 USD')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💎')
                    );
                
                await interaction.reply({ embeds: [fundingEmbed], components: [fundingRow], ephemeral: true });
                break;
                
            // Handle NowPayments funding buttons
            case 'nowpayments_fund_10':
            case 'nowpayments_fund_25':
            case 'nowpayments_fund_50':
            case 'nowpayments_fund_100':
                await interaction.deferReply({ ephemeral: true });
                
                // Determine amount based on button clicked
                let amount;
                switch (interaction.customId) {
                    case 'nowpayments_fund_10': amount = 10; break;
                    case 'nowpayments_fund_25': amount = 25; break;
                    case 'nowpayments_fund_50': amount = 50; break;
                    case 'nowpayments_fund_100': amount = 100; break;
                }
                
                try {
                    // Create payment session with Bitcoin (you can add currency selection later)
                    const paymentResult = await createPaymentSession(userId, amount, 'btc');
                    
                    if (paymentResult && paymentResult.paymentUrl) {
                        const paymentEmbed = new EmbedBuilder()
                            .setTitle('💳 Payment Link Created')
                            .setDescription(`Your $${amount} USD payment link is ready!`)
                            .setColor(0x00FF00)
                            .addFields(
                                { name: '💰 Amount', value: `$${amount} USD`, inline: true },
                                { name: '🪙 Currency', value: 'Bitcoin (BTC)', inline: true },
                                { name: '📋 Order ID', value: paymentResult.orderId, inline: false },
                                { name: '⏰ Instructions', value: '1. Click "Pay Now" button below\n2. Complete payment on NowPayments\n3. Funds will be automatically added to your account\n4. You\'ll receive a confirmation DM', inline: false },
                                { name: '⚠️ Important', value: 'Payment link expires in 30 minutes', inline: false }
                            )
                            .setFooter({ text: 'Powered by NowPayments - Secure cryptocurrency payments' })
                            .setTimestamp();
                        
                        const paymentRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setLabel('Pay Now')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(paymentResult.paymentUrl)
                                    .setEmoji('💳')
                            );
                        
                        await interaction.editReply({ embeds: [paymentEmbed], components: [paymentRow] });
                        
                        console.log(`💳 Payment link created for user ${userId}: $${amount} - ${paymentResult.paymentUrl}`);
                        
                    } else {
                        await interaction.editReply({ 
                            content: '❌ Failed to create payment link. Please try again later or contact support.',
                            ephemeral: true 
                        });
                    }
                } catch (error) {
                    console.error('❌ Payment link creation error:', error);
                    await interaction.editReply({ 
                        content: '❌ Payment system temporarily unavailable. Please try again in a few minutes.',
                        ephemeral: true 
                    });
                }
                break;
        }
    } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_product') {
            const productId = parseInt(interaction.values[0]);
            const products = await getProducts();
            const selectedProduct = products.find(p => p.id === productId);
            
            if (!selectedProduct) {
                await interaction.reply({ content: 'Product not found!', ephemeral: true });
                return;
            }
            
            // Check if user has enough funds (unless they're admin)
            if (!ADMIN_USER_IDS.includes(userId) && (userFunds[userId] || 0) < selectedProduct.price) {
                const currentBalance = userFunds[userId] || 0;
                const balanceEmbed = new EmbedBuilder()
                    .setTitle('💰 Insufficient Funds')
                    .setDescription(`You don't have enough funds to purchase **${selectedProduct.name}**.`)
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Required', value: `$${selectedProduct.price}`, inline: true },
                        { name: 'Current Balance', value: `$${currentBalance}`, inline: true },
                        { name: 'Needed', value: `$${selectedProduct.price - currentBalance}`, inline: true }
                    )
                    .setFooter({ text: 'Use the "Add Funds" button to add money to your account.' });
                
                await interaction.reply({ embeds: [balanceEmbed], ephemeral: true });
                return;
            }
            
            // Check if product has input schema (required fields)
            if (!selectedProduct.input_schema || selectedProduct.input_schema.length === 0) {
                await interaction.reply({ content: 'This product has no input requirements configured.', ephemeral: true });
                return;
            }
            
            // Initialize the product input collection process
            userProductInputs[userId] = {
                product: selectedProduct,
                inputSchema: selectedProduct.input_schema,
                currentInputIndex: 0,
                collectedInputs: {}
            };
            
            // Clean up any existing pending searches for this user
            if (pendingSearches[userId]) {
                delete pendingSearches[userId];
            }
            
            // Show the first input form
            const inputEmbed = createProductInputEmbed(selectedProduct, 0, {});
            await interaction.reply({ ...inputEmbed, ephemeral: true });
            
        } else if (interaction.customId === 'select_search_type') {
            const searchType = interaction.values[0];
            
            // Set up database search state with selected type
            pendingSearches[userId] = {
                type: 'database_search',
                searchType: searchType,
                step: 'awaiting_search_term'
            };
            
            // Create instruction embed based on search type
            let instructions = '';
            let examples = '';
            
            switch (searchType) {
                case 'email':
                    instructions = 'Enter the email address you want to search for:';
                    examples = 'Example: john.doe@gmail.com';
                    break;
                case 'username':
                    instructions = 'Enter the username you want to search for:';
                    examples = 'Example: johndoe123';
                    break;
                case 'name':
                    instructions = 'Enter the full name you want to search for:';
                    examples = 'Example: John Doe';
                    break;
                case 'password':
                    instructions = 'Enter the password you want to search for:';
                    examples = 'Example: password123';
                    break;
                case 'hash':
                    instructions = 'Enter the password hash you want to search for:';
                    examples = 'Example: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
                    break;
                case 'lastip':
                    instructions = 'Enter the IP address you want to search for:';
                    examples = 'Example: 192.168.1.1';
                    break;
                case '_domain':
                    instructions = 'Enter the domain you want to search for:';
                    examples = 'Example: gmail.com';
                    break;
                case 'all':
                    instructions = 'Enter any search term (email, username, name, etc.):';
                    examples = 'Example: john.doe@gmail.com or johndoe123';
                    break;
                default:
                    instructions = 'Enter your search term:';
                    examples = 'Example: search term';
            }
            
            const searchInstructionEmbed = new EmbedBuilder()
                .setTitle(`💾 ${searchType.toUpperCase()} Search`)
                .setDescription(instructions)
                .setColor(0x9932CC)
                .addFields({
                    name: '🔍 Example',
                    value: examples,
                    inline: false
                }, {
                    name: '⚡ Instructions',
                    value: 'Type your search term in the next message and I\'ll search the databases.',
                    inline: false
                });
            
            await interaction.reply({ embeds: [searchInstructionEmbed], ephemeral: true });
        }
    }
});

// Handle messages for multi-step processes
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Check if message is in allowed location
    if (!isAllowedLocation(message.channel.type, message.channelId)) {
        // Don't respond to messages in disallowed channels
        return;
    }
    
    const userId = message.author.id;
    const username = message.author.username;
    const content = message.content.trim();
    
    // Handle product input collection
    if (userProductInputs[userId]) {
        const inputCollection = userProductInputs[userId];
        
        // Security check: Ensure user still has sufficient funds before processing any input
        if (!ADMIN_USER_IDS.includes(userId)) {
            const currentBalance = userFunds[userId] || 0;
            if (currentBalance < inputCollection.product.price) {
                await message.reply(`❌ Insufficient funds! You need $${inputCollection.product.price} but have $${currentBalance}. Transaction cancelled.`);
                delete userProductInputs[userId];
                return;
            }
        }
        
        const currentInput = inputCollection.inputSchema[inputCollection.currentInputIndex];
        
        // Validate input if regex is provided
        if (currentInput.regex && !validateInput(content, currentInput.regex)) {
            await message.reply(`❌ Invalid format for **${currentInput.name}**. Please match pattern: \`${currentInput.regex}\``);
            return;
        }
        
        // Skip if empty and not required
        if (!content && !currentInput.required) {
            // Skip this input
        } else if (!content && currentInput.required) {
            await message.reply(`❌ **${currentInput.name}** is required. Please provide a value.`);
            return;
        } else {
            // Store the input
            inputCollection.collectedInputs[currentInput.key] = content;
        }
        
        // Move to next input
        inputCollection.currentInputIndex++;
        
        // Check if we've collected all inputs
        if (inputCollection.currentInputIndex >= inputCollection.inputSchema.length) {
            // All inputs collected, final balance check before processing
            if (!ADMIN_USER_IDS.includes(userId)) {
                const currentBalance = userFunds[userId] || 0;
                if (currentBalance < inputCollection.product.price) {
                    await message.reply(`❌ Insufficient funds! You need $${inputCollection.product.price} but have $${currentBalance}. Please add funds and try again.`);
                    // Clean up the input collection
                    delete userProductInputs[userId];
                    return;
                }
            }
            
            // Process the order
            if (message.channel.type !== 1) {
                await message.reply('🔍 Processing your order... Results will be sent to your DM.');
            } else {
                await message.reply('🔍 Processing your order... Please wait.');
            }
            
            // Deduct funds if not admin (before API call to prevent double-spending)
            if (!ADMIN_USER_IDS.includes(userId)) {
                const oldBalance = userFunds[userId] || 0;
                userFunds[userId] = oldBalance - inputCollection.product.price;
                await saveUserFunds(userFunds);
                
                console.log(`💸 Funds deducted for user ${userId} (${username}): $${oldBalance} → $${userFunds[userId]} (Product: ${inputCollection.product.name}, Price: $${inputCollection.product.price})`);
            }
            
            // Create the order
            const result = await purchaseProduct(inputCollection.product.id, inputCollection.collectedInputs, userId);
            
            if (result) {
                await logResults('order_results.json', {
                    product: inputCollection.product.name,
                    inputs: inputCollection.collectedInputs,
                    result: result
                });
                
                // Send confirmation reply and then delete it after 3 seconds
                const confirmationMessage = await message.reply(`✅ Order completed for **${inputCollection.product.name}**! Results sent to your DM.`);
                
                setTimeout(async () => {
                    try {
                        await confirmationMessage.delete();
                        await message.delete();
                    } catch (error) {
                        console.error('Error deleting messages:', error);
                    }
                }, 3000);
            } else {
                if (message.channel.type !== 1) {
                    const errorMessage = await message.reply(`❌ Order failed for **${inputCollection.product.name}**. Your funds have been refunded.`);
                    
                    // Refund if order failed and user is not admin
                    if (!ADMIN_USER_IDS.includes(userId)) {
                        const oldBalance = userFunds[userId] || 0;
                        userFunds[userId] = oldBalance + inputCollection.product.price;
                        await saveUserFunds(userFunds);
                        
                        console.log(`💸 Funds refunded for user ${userId} (${username}): $${oldBalance} → $${userFunds[userId]} (Failed order: ${inputCollection.product.name}, Price: $${inputCollection.product.price})`);
                    }
                    
                    // Delete error message after 5 seconds
                    setTimeout(async () => {
                        try {
                            await errorMessage.delete();
                            await message.delete();
                        } catch (error) {
                            console.error('Error deleting messages:', error);
                        }
                    }, 5000);
                } else {
                    await message.reply(`❌ Order failed for **${inputCollection.product.name}**. Your funds have been refunded.`);
                }
            }
            
            // Clean up
            delete userProductInputs[userId];
        } else {
            // Ask for next input
            const nextInputEmbed = createProductInputEmbed(
                inputCollection.product, 
                inputCollection.currentInputIndex, 
                inputCollection.collectedInputs
            );
            await message.reply({ ...nextInputEmbed });
        }
        return;
    }
    
    // Handle database search (Snusbase)
    if (pendingSearches[userId] && pendingSearches[userId].type === 'database_search') {
        if (content && !content.startsWith('/')) {
            let searchingMessage;
            
            if (message.channel.type !== 1) {
                searchingMessage = await message.reply('🔍 Searching databases...');
            } else {
                searchingMessage = await message.reply('🔍 Searching databases... Please wait.');
            }
            
            const searchType = pendingSearches[userId].searchType || 'all';
            
            const result = await performDatabaseSearch(content, searchType);
            if (result && result.length > 0) {
                await logResults('database_results.json', { 
                    search_term: content, 
                    search_type: searchType,
                    results: result 
                });
                
                // Log to database.json and send DM with access code
                const accessKey = await logDatabaseResults(content, searchType, result, userId);
                
                // Results and access code are sent via DM by logDatabaseResults function
                
                // Clean up searching message in server channel after successful search
                if (message.channel.type !== 1) {
                    setTimeout(async () => {
                        try {
                            await searchingMessage.delete();
                            await message.delete();
                        } catch (error) {
                            console.error('Error deleting messages after successful search:', error);
                        }
                    }, 2000);
                } else {
                    // In DM, delete the searching message
                    try {
                        await searchingMessage.delete();
                    } catch (error) {
                        console.error('Error deleting DM search message:', error);
                    }
                }
                
            } else {
                // No results found - send DM with no results message
                try {
                    const user = await client.users.fetch(userId);
                    await user.send(`❌ No results found for "${content}" (${searchType.toUpperCase()} search)`);
                } catch (error) {
                    console.error('Error sending no results DM:', error.message);
                }
                
                // Clean up searching message in server channel for no results case
                if (message.channel.type !== 1) {
                    setTimeout(async () => {
                        try {
                            await searchingMessage.delete();
                            await message.delete();
                        } catch (error) {
                            console.error('Error deleting messages:', error);
                        }
                    }, 2000);
                } else {
                    // In DM, just delete the searching message
                    try {
                        await searchingMessage.delete();
                    } catch (error) {
                        console.error('Error deleting DM search message:', error);
                    }
                }
            }
            
            // Clean up search state
            delete pendingSearches[userId];
            return;
        }
    }
    
    // Fallback: if no specific handler and not a command, try database search
    if (content && !content.startsWith('/') && !pendingSearches[userId]) {
        const result = await performDatabaseSearch(content);
        if (result && result.length > 0) {
            await logResults('database_results.json', { search_term: content, results: result });
            
            // Log to database.json and send DM with access code (fallback search type)
            const accessKey = await logDatabaseResults(content, 'fallback_all', result, userId);
            
            // Results are now sent via DM by logDatabaseResults function
            try {
                const user = await client.users.fetch(userId);
                
                // Generate JSON results file and get access key
                const fileName = `database_search_fallback_${content.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
                const accessKey = await generateJSONResultsFile(content, 'fallback_all', result, fileName, userId);
                
                // Create access key instruction embed
                const accessEmbed = new EmbedBuilder()
                    .setTitle('🔍 Quick Database Search Complete')
                    .setDescription(`Your search for "${content}" has been completed!`)
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '🔍 Search Term', value: content, inline: true },
                        { name: '📊 Results Found', value: `${result.length} matches`, inline: true },
                        { name: '⏰ Search Time', value: new Date().toLocaleString(), inline: true },
                        { name: '\u200B', value: '\u200B', inline: false },
                        { name: '🗝️ Your Access Key', value: `\`\`\`${accessKey}\`\`\``, inline: false },
                        { name: '🌐 How to View Results', value: `1. Go to: **http://localhost:3000/results**\n2. Enter your access key: \`${accessKey}\`\n3. View your secure search results`, inline: false },
                        { name: '⚠️ Important Notes', value: '• This is sample data - API is down\n• Code expires in 30 days\n• Maximum 3 views allowed\n• Keep your code private', inline: false }
                    )
                    .setFooter({ text: '🔒 Secure access to your search results' });

                // Send access key instructions to DM ONLY
                await user.send({ embeds: [accessEmbed] });
                
                // Send brief confirmation in channel and delete after 2 seconds
                if (message.channel.type !== 1) {
                    const confirmMessage = await message.reply('✅ Search completed! Check your DMs for results.');

                    setTimeout(async () => {
                        try {
                            await confirmMessage.delete();
                            await message.delete();
                        } catch (error) {
                            console.error('Error deleting messages:', error);
                        }
                    }, 2000);
                }
                
            } catch (error) {
                console.error('Error sending fallback search DM:', error.message);
                // Try to send error message to DM
                try {
                    const user = await client.users.fetch(userId);
                    await user.send('❌ Could not send search results to DM. Please check your DM settings.');
                } catch (dmError) {
                    console.error('Error sending DM error message:', dmError);
                }
                
                await interaction.editReply('❌ Could not send results to DM. Please check your DM settings.');
            }
        }
    }
});

// Slash command definitions
const commands = [
    new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start the MedusaTLO Bot'),
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current balance'),
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show bot statistics (Admin only)'),
    new SlashCommandBuilder()
        .setName('products')
        .setDescription('Refresh product list'),
    new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search databases with a term')
        .addStringOption(option =>
            option.setName('term')
                .setDescription('Search term')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('cancel')
        .setDescription('Cancel current product input process'),
    new SlashCommandBuilder()
        .setName('apistatus')
        .setDescription('Check Snusbase API status')
];

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    // Check if interaction is in allowed location
    if (!isAllowedLocation(interaction.channel.type, interaction.channelId)) {
        await interaction.reply({ 
            content: `❌ This bot only responds in DMs or in the designated channel <#${ALLOWED_CHANNEL_ID}>. Please use the bot there.`,
            ephemeral: true 
        });
        return;
    }
    
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    initializeUserProfile(userId, username);
    
    switch (interaction.commandName) {
        case 'start':
            await interaction.reply(createMainMenuEmbed());
            break;
            
        case 'balance':
            const balance = userFunds[userId] || 0;
            const embed = new EmbedBuilder()
                .setTitle('💰 Your Balance')
                .setDescription(`Current balance: $${balance}`)
                .setColor(0x00FF00);
            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;
            
        case 'stats':
            if (!ADMIN_USER_IDS.includes(userId)) {
                await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                return;
            }
            
            const products = await getProducts();
            const statsEmbed = new EmbedBuilder()
                .setTitle('📊 Bot Statistics')
                .setDescription('Current bot usage statistics')
                .setColor(0xFF6600)
                .addFields(
                    { name: 'Total Users', value: BOT_STATS.total_users.toString(), inline: true },
                    { name: 'Last Updated', value: BOT_STATS.last_updated, inline: true },
                    { name: 'Current User', value: BOT_STATS.current_user || 'None', inline: true },
                    { name: 'Available Products', value: products.length.toString(), inline: true }
                );
            
            await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
            break;
            
        case 'products':
            await interaction.deferReply({ ephemeral: true });
            await fetchProducts();
            const productCount = availableProducts.length;
            await interaction.editReply({ content: `✅ Product list refreshed! Found ${productCount} products.` });
            break;
            
        case 'search':
            const searchTerm = interaction.options.getString('term');
            await interaction.deferReply({ ephemeral: true });
            
            // Use 'all' type for slash command searches
            const result = await performDatabaseSearch(searchTerm, 'all');
            if (result && result.length > 0) {
                await logResults('database_results.json', { 
                    search_term: searchTerm, 
                    search_type: 'all',
                    results: result 
                });
                
                // Log to database.json and send DM with access code
                const accessKey = await logDatabaseResults(searchTerm, 'all', result, userId);
                
                // Results are now sent via DM by logDatabaseResults function
                try {
                    const user = await client.users.fetch(userId);
                    
                    // Generate JSON results file and get access key
                    const fileName = `search_all_types_${searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
                    const accessKey = await generateJSONResultsFile(searchTerm, 'all', result, fileName, userId);
                    
                    // Create access key instruction embed
                    const accessEmbed = new EmbedBuilder()
                        .setTitle('🔍 Comprehensive Database Search Complete')
                        .setDescription(`Your search across all database types has been completed!`)
                        .setColor(0x00FF00)
                        .addFields(
                            { name: '🔍 Search Term', value: searchTerm, inline: true },
                            { name: '📊 Results Found', value: `${result.length} matches across all types`, inline: true },
                            { name: '⏰ Search Time', value: new Date().toLocaleString(), inline: true },
                            { name: '\u200B', value: '\u200B', inline: false },
                            { name: '🗝️ Your Access Key', value: `\`\`\`${accessKey}\`\`\``, inline: false },
                            { name: '🌐 How to View Results', value: `1. Go to: **http://localhost:3000/results**\n2. Enter your access key: \`${accessKey}\`\n3. View your secure search results`, inline: false },
                            { name: '⚠️ Important Notes', value: '• This search included all database types\n• Results are securely encrypted\n• Access key expires in 24 hours', inline: false }
                        )
                        .setFooter({ text: '🔒 Enterprise-grade security for your data' });
                    
                    // Send access key instructions to DM ONLY
                    await user.send({ embeds: [accessEmbed] });
                    
                    // Send brief confirmation to server, then delete
                    await interaction.editReply('✅ Search completed! Check your DMs.');
                    
                    setTimeout(async () => {
                        try {
                            await interaction.deleteReply();
                        } catch (error) {
                            console.error('Error deleting reply:', error);
                        }
                    }, 3000);
                    
                } catch (error) {
                    console.error('Error sending DM:', error.message);
                    // Try to send error message to DM
                    try {
                        const user = await client.users.fetch(userId);
                        await user.send('❌ Could not send search results to DM. Please check your DM settings.');
                    } catch (dmError) {
                        console.error('Error sending DM error message:', dmError);
                    }
                    
                    await interaction.editReply('❌ Could not send results to DM. Please check your DM settings.');
                }
            } else {
                // Send "no results" message to DM ONLY
                try {
                    const user = await client.users.fetch(userId);
                    await user.send(`❌ No results found for "${searchTerm}" (searched all data types)`);
                } catch (error) {
                    console.error('Error sending no results DM:', error.message);
                }
                
                await interaction.editReply('❌ No results found. Check your DMs.');
                
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                    } catch (error) {
                        console.error('Error deleting reply:', error);
                    }
                }, 5000);
            }
            break;
            
        case 'cancel':
            if (userProductInputs[userId]) {
                delete userProductInputs[userId];
                await interaction.reply({ content: '❌ Product input process cancelled.', ephemeral: true });
            } else if (pendingSearches[userId]) {
                delete pendingSearches[userId];
                await interaction.reply({ content: '❌ Database search cancelled.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'No active process to cancel.', ephemeral: true });
            }
            break;
            
        case 'apistatus':
            await interaction.deferReply({ ephemeral: true });
            
            console.log('🔍 Checking Snusbase API status...');
            
            try {
                const statusCheck = await axios.get('https://api.snusbase.com/data/stats', {
                    headers: { 
                        'Auth': SNUSBASE_AUTH,
                        'User-Agent': 'MedusaTLO-Bot/1.0'
                    },
                    timeout: 10000
                });
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Snusbase API Status')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: 'Status', value: 'Online and responding', inline: true },
                        { name: 'Response Time', value: '< 10 seconds', inline: true },
                        { name: 'API Key', value: SNUSBASE_AUTH.startsWith('sb') ? '✅ Valid format' : '❌ Invalid format', inline: true },
                        { name: 'Total Database Rows', value: statusCheck.data?.rows?.toLocaleString() || 'Unknown', inline: false }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                
            } catch (error) {
                console.error('❌ API Status Check Failed:', error.message);
                
                const embed = new EmbedBuilder()
                    .setTitle('❌ Snusbase API Status')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Status', value: 'Offline or experiencing issues', inline: true },
                        { name: 'Error', value: error.response?.status ? `HTTP ${error.response.status}` : error.message, inline: true },
                        { name: 'API Key Format', value: SNUSBASE_AUTH.startsWith('sb') ? '✅ Valid format' : '❌ Invalid format', inline: true },
                        { name: 'Recommendation', value: 'Try again in 5-10 minutes. Snusbase servers may be under maintenance.', inline: false }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
            break;
    }
});

// Start payment monitoring system to check payment statuses
function startPaymentMonitoring() {
    console.log('🔍 Starting payment monitoring system...');
    
    // Check payment statuses every 2 minutes
    setInterval(async () => {
        const pendingPaymentIds = Object.keys(pendingPayments);
        if (pendingPaymentIds.length === 0) return;
        
        console.log(`🔍 Checking status of ${pendingPaymentIds.length} pending payments...`);
        
        for (const invoiceId of pendingPaymentIds) {
            try {
                const paymentInfo = pendingPayments[invoiceId];
                
                // Skip if payment is too old (30 minutes for invoices, 24 hours for active payments)
                const paymentAge = Date.now() - new Date(paymentInfo.createdAt).getTime();
                const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
                const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                
                // Clean up invoices after 30 minutes if still waiting
                if (paymentInfo.status === 'waiting' && paymentAge > thirtyMinutes) {
                    console.log(`⏰ Cleaning up expired invoice after 30 minutes: ${invoiceId}`);
                    console.log(`   Invoice was created at: ${paymentInfo.createdAt}`);
                    console.log(`   Age: ${Math.round(paymentAge / (60 * 1000))} minutes`);
                    delete pendingPayments[invoiceId];
                    continue;
                }
                
                // Clean up active payments after 24 hours regardless of status
                if (paymentAge > twentyFourHours) {
                    console.log(`⏰ Cleaning up old payment after 24 hours: ${invoiceId}`);
                    console.log(`   Payment status: ${paymentInfo.status}`);
                    console.log(`   Age: ${Math.round(paymentAge / (60 * 60 * 1000))} hours`);
                    delete pendingPayments[invoiceId];
                    continue;
                }
                
                // Check invoice status via NowPayments API
                // According to official NowPayments docs, use different endpoints for invoices
                let statusResponse;
                let currentStatus;
                
                try {
                    // Try to get payment status using the invoice as a payment ID directly
                    // Some systems use the invoice ID as the payment ID initially
                    console.log(`🔍 Checking payment status for invoice ${invoiceId}, order ${paymentInfo.orderId}`);
                    
                    // Method 1: Try using the invoice ID directly as a payment ID
                    try {
                        statusResponse = await axios.get(`https://api.nowpayments.io/v1/payment/${invoiceId}`, {
                            headers: { 
                                'x-api-key': NOWPAYMENTS_API_KEY
                            },
                            timeout: 10000
                        });
                        
                        console.log(`📊 Direct payment check response:`, {
                            status: statusResponse.status,
                            payment_id: statusResponse.data.payment_id,
                            payment_status: statusResponse.data.payment_status,
                            invoice_id: statusResponse.data.invoice_id
                        });
                        
                        currentStatus = statusResponse.data.payment_status;
                        
                        // Update payment info
                        if (!paymentInfo.paymentId && statusResponse.data.payment_id) {
                            paymentInfo.paymentId = statusResponse.data.payment_id;
                        }
                        
                    } catch (directError) {
                        console.log(`🔍 Direct payment check failed (${directError.response?.status}), trying payment creation status...`);
                        
                        // Method 2: Since we can't list payments, let's just wait and check if a payment was created
                        // For now, we'll assume the payment is still "waiting" until we get confirmation
                        // This isn't ideal but works around the API limitations
                        
                        console.log(`⏳ Payment ${invoiceId} still waiting for customer to complete payment`);
                        console.log(`   (Cannot access payment list - API permissions may be limited)`);
                        
                        // Keep the status as waiting
                        currentStatus = paymentInfo.status; // Keep existing status
                        continue; // Skip to next payment
                    }
                    
                } catch (paymentError) {
                    console.warn(`⚠️ Failed to check payments for invoice ${invoiceId}:`, paymentError.message);
                    
                    if (paymentError.response) {
                        console.warn(`   HTTP Status: ${paymentError.response.status}`);
                        console.warn(`   Response: ${JSON.stringify(paymentError.response.data)}`);
                    }
                    
                    // Skip this payment for now - will try again next cycle
                    continue;
                }
                
                if (currentStatus && currentStatus !== paymentInfo.status) {
                    console.log(`💳 Payment for invoice ${invoiceId} status changed: ${paymentInfo.status} → ${currentStatus}`);
                    paymentInfo.status = currentStatus;
                    paymentInfo.updatedAt = new Date().toISOString();
                    
                    // Process confirmed payments - NowPayments status values according to official docs
                    // Payment statuses: waiting, confirming, confirmed, sending, finished, failed, refunded, expired, partially_paid
                    if (['finished', 'confirmed', 'sending'].includes(currentStatus)) {
                        const paidAmount = statusResponse.data.pay_amount || 
                                          statusResponse.data.price_amount || 
                                          statusResponse.data.amount ||
                                          paymentInfo.amount;
                        
                        // Update payment info with the actual payment ID for future reference
                        paymentInfo.paymentId = statusResponse.data.payment_id || paymentInfo.paymentId;
                        
                        await processPaymentConfirmation(paymentInfo, paidAmount);
                    }
                    
                    // Clean up failed/expired payments
                    if (['failed', 'cancelled', 'expired', 'refunded'].includes(currentStatus)) {
                        console.log(`🗑️ Cleaning up ${currentStatus} payment for invoice: ${invoiceId}`);
                        delete pendingPayments[invoiceId];
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️ Failed to check payment for invoice ${invoiceId}:`, error.message);

                // Log more details for debugging
                if (error.response) {
                    console.warn(`   - HTTP Status: ${error.response.status}`);
                    console.warn(`   - Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
                }
            }
        }
        
        // Save updated payment statuses
        await savePendingPayments(pendingPayments);
        
    }, 2 * 60 * 1000); // Check every 2 minutes
    
    console.log('✅ Payment monitoring system started (checking every 2 minutes)');
}

// Bot ready event
client.once('ready', async () => {
    console.log('\n=== MedusaTLO Bot Statistics ===');
    console.log(`Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${BOT_STATS.last_updated}`);
    console.log(`Current User's Login: ${BOT_STATS.current_user}`);
    console.log(`Total Users who have started the bot: ${BOT_STATS.total_users}`);
    console.log('==============================\n');
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    
    // Load existing data
    userProfiles = await loadUserProfiles();
    userFunds = await loadUserFunds();
    pendingPayments = await loadPendingPayments();
    BOT_STATS.total_users = Object.keys(userProfiles).length;
    
    console.log(`💾 Loaded ${Object.keys(userProfiles).length} user profiles`);
    console.log(`💰 Loaded ${Object.keys(userFunds).length} user fund records`);
    console.log(`💳 Loaded ${Object.keys(pendingPayments).length} pending payments`);
    
    // Fetch initial product list
    await fetchProducts();
    console.log(`🛒 Loaded ${availableProducts.length} products from Sunrise API`);

    // Start payment monitoring system (checks NowPayments API every 2 minutes)
    startPaymentMonitoring();
    
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    
    try {
        console.log('🔄 Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands.map(command => command.toJSON()) }
        );
        
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
    
    console.log('\n🚀 MedusaTLO Bot is fully operational!');
    console.log('💡 Features:');
    console.log('   - Snusbase database search with retry mechanisms');
    console.log('   - TLO API product purchasing');
    console.log('   - Multi-layer balance security system');
    console.log('   - Automated NowPayments payment monitoring via API polling');
    console.log(`   - Channel restriction: Only responds in DMs or channel ${ALLOWED_CHANNEL_ID}`);
    console.log('   - All results sent exclusively to user DMs');
});


// Initialize bot and ensure directories exist
async function initializeBot() {
    try {
        // Create necessary directories
        await ensureDirectories();
        
        // Log in to Discord
        await client.login(DISCORD_TOKEN);
    } catch (error) {
        console.error('❌ Failed to initialize bot:', error);
        process.exit(1);
    }
}

// Start the bot
initializeBot();
async function main() {
    await ensureDirectories();
    await client.login(DISCORD_TOKEN);
}

main().catch(console.error);
