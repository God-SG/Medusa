<footer style="
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    border-top: 2px solid #0f0;
    padding: 15px 0;
    z-index: 1000;
    box-shadow: 0 -5px 20px rgba(0, 255, 0, 0.3);
    font-family: 'Courier New', monospace;
    color: #0f0;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    animation: slideUp 0.5s ease forwards;
">
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; text-align: center;">
            <!-- Support Column -->
            <div>
                <h3 style="color: #0af; margin: 0 0 10px 0; text-shadow: 0 0 10px #0af; font-size: 14px;">SUPPORT</h3>
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                    <a href="https://discord.gg/gMQ6cQuvfe" target="_blank" style="
                        color: #0f0; 
                        text-decoration: none; 
                        font-size: 12px;
                        text-shadow: 0 0 5px #0f0;
                        transition: all 0.3s ease;
                        padding: 3px 8px;
                        border: 1px solid transparent;
                        border-radius: 3px;
                    " onmouseover="this.style.borderColor='#0f0'; this.style.boxShadow='0 0 10px #0f0'; this.style.transform='scale(1.05)'" 
                       onmouseout="this.style.borderColor='transparent'; this.style.boxShadow='none'; this.style.transform='scale(1)'">
                        [DISCORD SUPPORT]
                    </a>
                    <a href="https://t.me/mbsupp" target="_blank" style="
                        color: #0f0; 
                        text-decoration: none; 
                        font-size: 12px;
                        text-shadow: 0 0 5px #0f0;
                        transition: all 0.3s ease;
                        padding: 3px 8px;
                        border: 1px solid transparent;
                        border-radius: 3px;
                    " onmouseover="this.style.borderColor='#0f0'; this.style.boxShadow='0 0 10px #0f0'; this.style.transform='scale(1.05)'" 
                       onmouseout="this.style.borderColor='transparent'; this.style.boxShadow='none'; this.style.transform='scale(1)'">
                        [TELEGRAM MB]
                    </a>
                    <a href="https://t.me/injecti0ns" target="_blank" style="
                        color: #0f0; 
                        text-decoration: none; 
                        font-size: 12px;
                        text-shadow: 0 0 5px #0f0;
                        transition: all 0.3s ease;
                        padding: 3px 8px;
                        border: 1px solid transparent;
                        border-radius: 3px;
                    " onmouseover="this.style.borderColor='#0f0'; this.style.boxShadow='0 0 10px #0f0'; this.style.transform='scale(1.05)'" 
                       onmouseout="this.style.borderColor='transparent'; this.style.boxShadow='none'; this.style.transform='scale(1)'">
                        [TELEGRAM INJ]
                    </a>
                </div>
            </div>
            
            <!-- Legal Column -->
            <div>
                <h3 style="color: #0af; margin: 0 0 10px 0; text-shadow: 0 0 10px #0af; font-size: 14px;">LEGAL NOTICE</h3>
                <div style="color: #0f0; font-size: 10px; text-shadow: 0 0 3px #0f0; line-height: 1.4;">
                    <p style="margin: 0 0 5px 0;">INFORMATIONAL SERVICES ONLY</p>
                    <p style="margin: 0;">ALL SEARCHES LOGGED & MONITORED</p>
                </div>
            </div>
            
            <!-- Copyright -->
            <div>
                <div style="color: #0f0; font-size: 11px; text-shadow: 0 0 5px #0f0;">
                    &copy; <?= date('Y') ?> MEDUSA-TLO SERVICES
                </div>
            </div>
        </div>
    </div>
</footer>

<style>
@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

/* Add bottom padding to body to prevent content from being hidden behind footer */
body {
    padding-bottom: 80px !important;
}

/* Responsive footer */
@media (max-width: 768px) {
    footer div[style*="grid-template-columns"] {
        grid-template-columns: 1fr !important;
        gap: 15px !important;
        text-align: center !important;
    }
    
    body {
        padding-bottom: 120px !important;
    }
}
</style>