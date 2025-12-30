// Improved Discord Embeds for Better Access Code Copying
// These embeds make access codes more easily copyable on both PC and mobile devices

// 1. Updated sendAccessCodeDM function embed
const improvedResultEmbed = new EmbedBuilder()
    .setTitle('🔍 Your Search Results Are Ready!')
    .setDescription(`Your ${serviceName} has been completed and securely stored.`)
    .setColor(0x00FF00)
    .addFields(
        { name: '🗝️ Access Code', value: `\`\`\`\n${accessKey}\n\`\`\`\n**Tap to select and copy**`, inline: false },
        { name: '📋 Quick Copy', value: `\`${accessKey}\``, inline: true },
        { name: '🔍 Search Type', value: searchType.toUpperCase(), inline: true },
        { name: '🔎 Search Term', value: searchTerm, inline: true },
        { name: '🌐 Access Portal', value: `[Click here to view results](${CUSTOM_DOMAIN}/access)`, inline: false },
        { name: '📝 Instructions', value: '1. **Copy your access key** (tap the code above)\n2. **Click the portal link** (above)\n3. **Paste your key** and view results\n\n💡 **Mobile Tip:** Long-press the code to select and copy', inline: false },
        { name: '⚠️ Important Notes', value: '• Code expires in 30 days\n• Maximum 3 views allowed\n• Keep your code private', inline: false }
    )
    .setFooter({ text: 'MedusaTLO Secure Results Portal • Results are encrypted and protected • Tap code to copy' })
    .setTimestamp();

// 2. Updated fallback search embed (around line 2210)
const improvedFallbackEmbed = new EmbedBuilder()
    .setTitle('🔐 Quick Database Search Complete')
    .setDescription(`Your search for "${content}" has been completed!`)
    .setColor(0x00FF00)
    .addFields(
        { name: '🔍 Search Term', value: content, inline: true },
        { name: '📊 Results Found', value: `${result.length} matches`, inline: true },
        { name: '⏰ Search Time', value: new Date().toLocaleString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '🗝️ Your Access Key', value: `\`\`\`\n${accessKey}\n\`\`\`\n**Tap to select and copy**`, inline: false },
        { name: '📋 Quick Copy', value: `\`${accessKey}\``, inline: true },
        { name: '🌐 Access Portal', value: `**http://localhost:3000/results**`, inline: false },
        { name: '📝 Instructions', value: `1. **Copy your access key** (tap the code above)\n2. **Go to the portal** (link above)\n3. **Paste your key** and view results\n\n💡 **Mobile Tip:** Long-press the code to select and copy`, inline: false }
    )
    .setFooter({ text: '🔒 Secure access to your search results • Code expires in 30 days • Tap to copy' });

// 3. Updated slash command search embed (around line 2370)
const improvedSlashEmbed = new EmbedBuilder()
    .setTitle('🔐 Database Search Complete')
    .setDescription(`Your search across all database types has been completed!`)
    .setColor(0x00FF00)
    .addFields(
        { name: '🔍 Search Term', value: searchTerm, inline: true },
        { name: '📊 Results Found', value: `${result.length} matches across all types`, inline: true },
        { name: '⏰ Search Time', value: new Date().toLocaleString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '🗝️ Your Access Key', value: `\`\`\`\n${accessKey}\n\`\`\`\n**Tap to select and copy**`, inline: false },
        { name: '📋 Quick Copy', value: `\`${accessKey}\``, inline: true },
        { name: '🌐 Access Portal', value: `**http://localhost:3000/results**`, inline: false },
        { name: '📝 Instructions', value: `1. **Copy your access key** (tap the code above)\n2. **Go to the portal** (link above)\n3. **Paste your key** and view results\n\n💡 **Mobile Tip:** Long-press the code to select and copy`, inline: false },
        { name: '⚠️ Note', value: '• This search included all database types\n• Results are securely encrypted\n• Access key expires in 24 hours', inline: false }
    )
    .setFooter({ text: 'MedusaTLO Secure Results Portal • Comprehensive search results • Tap code to copy' });

/* 
Key Improvements Made:

1. **Better Code Block Formatting**: 
   - Changed from `\`\`\`${accessKey}\`\`\`` to `\`\`\`\n${accessKey}\n\`\`\``
   - This creates a proper code block with newlines, making it much easier to select on mobile

2. **Added "Tap to select and copy" Text**: 
   - Clear instruction that the code block is interactive

3. **Quick Copy Field**: 
   - Added a separate field with `\`${accessKey}\`` for single-line copying
   - This provides an alternative copy method

4. **Improved Instructions**: 
   - More detailed, step-by-step instructions
   - Bold formatting for key actions
   - Mobile-specific tips

5. **Better Field Layout**: 
   - Access code is now full-width (inline: false) for better visibility
   - Quick copy is inline for space efficiency

6. **Enhanced Footer Text**: 
   - Added "Tap code to copy" reminder in footer

These changes make the access codes much more accessible for copying on:
- **Mobile devices**: Long-press the code block to select and copy
- **PC/Desktop**: Click and drag to select, or double-click to select all
- **Both platforms**: Multiple copy options (code block + quick copy field)
*/
