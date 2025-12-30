<?php
// Strict session handling
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => true,
    'use_strict_mode' => true
]);

define('STORAGE_PATH', '/var/www/medusatlo/storage');

// Rate limiting
if (!isset($_SESSION['attempts'])) {
    $_SESSION['attempts'] = 0;
    $_SESSION['last_attempt'] = time();
}

// Reset attempts after 1 hour
if (time() - $_SESSION['last_attempt'] > 3600) {
    $_SESSION['attempts'] = 0;
}

// Block after 5 failed attempts
if ($_SESSION['attempts'] >= 5) {
    http_response_code(429);
    header("Location: /access?error=rate_limit");
    exit;
}

// Check for existing valid session
if (isset($_SESSION['access_code'])) {
    $codesContent = file_get_contents(STORAGE_PATH.'/keys/access_keys.json');
    if ($codesContent !== false) {
        $accessData = json_decode($codesContent, true);
        if (json_last_error() === JSON_ERROR_NONE && 
            isset($accessData['codes'][$_SESSION['access_code']]) && 
            $accessData['codes'][$_SESSION['access_code']]['active']) {
            header("Location: /results");
            exit;
        }
    }
}

// Process form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $code = strtoupper(trim($_POST['code'] ?? ''));
    
    // Input validation
    if (empty($code)) {
        $_SESSION['attempts']++;
        $_SESSION['last_attempt'] = time();
        header("Location: /access?error=empty");
        exit;
    }
    
    // Validate format (8 alphanumeric characters)
    if (!preg_match('/^[A-Z0-9]{8}$/', $code)) {
        $_SESSION['attempts']++;
        $_SESSION['last_attempt'] = time();
        header("Location: /access?error=format");
        exit;
    }
    
    // Add file locking to prevent race conditions
    $lockFile = STORAGE_PATH . '/keys/.access_keys.lock';
    $fp = fopen($lockFile, 'w');
    
    if (!flock($fp, LOCK_EX)) {
        header("Location: /access?error=busy");
        exit;
    }
    
    // Error handling for JSON file operations
    $codesContent = file_get_contents(STORAGE_PATH.'/keys/access_keys.json');
    if ($codesContent === false) {
        flock($fp, LOCK_UN);
        fclose($fp);
        unlink($lockFile);
        header("Location: /access?error=system");
        exit;
    }
    
    $codes = json_decode($codesContent, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        flock($fp, LOCK_UN);
        fclose($fp);
        unlink($lockFile);
        header("Location: /access?error=corrupt");
        exit;
    }

    // Check new structure format
    if (!isset($codes['codes'])) {
        // Handle legacy format or create new structure
        $codes = [
            'codes' => $codes, // Move existing codes to nested structure
            'settings' => [
                'default_expiry_days' => 30,
                'code_length' => 8,
                'ip_tracking' => true
            ]
        ];
    }

    if (isset($codes['codes'][$code]) && $codes['codes'][$code]['active']) {
        $_SESSION['access_code'] = $code;
        $_SESSION['attempts'] = 0; // Reset on success
        $codes['codes'][$code]['used']++;
        
        if ($codes['codes'][$code]['used'] >= $codes['codes'][$code]['max_uses']) {
            $codes['codes'][$code]['active'] = false;
        }
        
        // Atomic write operation
        $tempFile = STORAGE_PATH . '/keys/access_keys.json.tmp';
        file_put_contents($tempFile, json_encode($codes, JSON_PRETTY_PRINT), LOCK_EX);
        rename($tempFile, STORAGE_PATH . '/keys/access_keys.json');
        
        flock($fp, LOCK_UN);
        fclose($fp);
        unlink($lockFile);
        
        header("Location: /results");
        exit;
    } else {
        $_SESSION['attempts']++;
        $_SESSION['last_attempt'] = time();
        flock($fp, LOCK_UN);
        fclose($fp);
        unlink($lockFile);
        header("Location: /access?error=invalid");
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 MedusaTLO Access</title>
    <link rel="icon" href="https://files.catbox.moe/xgv035.png" type="image/png">
    <style>
        /* Base dark hacker theme */
        body {
            background-color: #000;
            color: #0f0;
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            cursor: none;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Dynamic Zigzag Card */
        .zigzag-card {
            border: 2px solid #0f0;
            margin: 20px 0;
            padding: 40px 30px;
            position: relative;
            box-shadow: 0 0 20px #0f0;
            text-align: center;
            box-sizing: border-box;
        }
        
        .zigzag-card::before {
            content: "";
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border: 2px solid #0f0;
            z-index: -1;
            animation: zigzag 2s linear infinite;
        }
        
        .zigzag-card h1 {
            color: #0af;
            font-size: 2.5em;
            margin-bottom: 20px;
            text-shadow: 0 0 15px #0af;
            animation: glow 2s ease-in-out infinite alternate;
        }
        
        /* Input styling */
        .input-group {
            margin: 20px 0;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .input-group label {
            display: block;
            color: #0af;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 0 0 5px #0af;
        }
        
        .input-group input {
            width: calc(100% - 34px); /* Account for padding and border */
            max-width: 300px;
            padding: 15px;
            background: #000;
            border: 2px solid #0f0;
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 18px;
            letter-spacing: 2px;
            text-align: center;
            text-transform: uppercase;
            box-shadow: inset 0 0 10px #0f0;
            box-sizing: border-box;
            margin: 0 auto;
            display: block;
        }
        
        .input-group input:focus {
            outline: none;
            border-color: #f0f;
            box-shadow: 0 0 20px #f0f;
            color: #f0f;
        }
        
        /* Button styling */
        button {
            background: #000;
            border: 2px solid #0f0;
            color: #0f0;
            padding: 15px 30px;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            box-shadow: 0 0 10px #0f0;
            margin-top: 20px;
        }
        
        button:hover {
            background: #0f0;
            color: #000;
            box-shadow: 0 0 25px #0f0;
            transform: scale(1.05);
        }
        
        /* Error message styling */
        .error-message {
            background: #000;
            border: 2px solid #f00;
            color: #f00;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            text-shadow: 0 0 5px #f00;
            box-shadow: 0 0 15px #f00;
            animation: errorPulse 1s ease-in-out infinite alternate;
        }
        
        /* Snake Cursor */
        .snake-cursor {
            position: fixed;
            width: 32px;
            height: 16px;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><path d="M5,25 Q25,5 45,25 Q65,45 85,25" stroke="%2300ff00" fill="none" stroke-width="8"/></svg>') no-repeat center center;
            pointer-events: none;
            z-index: 9999;
            transform: translate(-50%, -50%) rotate(0deg);
            transform-origin: left center;
        }
        .snake-trail {
            position: fixed;
            width: 8px;
            height: 8px;
            background-color: #0f0;
            border-radius: 50%;
            pointer-events: none;
            z-index: 9998;
            opacity: 0.7;
        }
        
        /* Animations */
        @keyframes zigzag {
            0% { clip-path: polygon(0 0, 100% 0, 100% 5px, 5px 5px, 5px 100%, 100% 100%, 100% 95px, 0 95px); }
            25% { clip-path: polygon(5px 0, 100% 0, 95px 5px, 5px 5px, 5px 95px, 100% 95px, 100% 100%, 0 100%); }
            50% { clip-path: polygon(0 5px, 95px 5px, 95px 0, 100% 0, 100% 100%, 5px 100%, 5px 95px, 0 95px); }
            75% { clip-path: polygon(0 0, 100% 0, 100% 95px, 95px 95px, 95px 5px, 5px 5px, 5px 100%, 0 100%); }
            100% { clip-path: polygon(0 0, 100% 0, 100% 5px, 5px 5px, 5px 100%, 100% 100%, 100% 95px, 0 95px); }
        }
        
        @keyframes glow {
            from { text-shadow: 0 0 15px #0af; }
            to { text-shadow: 0 0 25px #0af, 0 0 35px #0af; }
        }
        
        @keyframes pulse {
            from { transform: scale(1); opacity: 1; }
            to { transform: scale(1.2); opacity: 0.8; }
        }
        
        @keyframes errorPulse {
            from { box-shadow: 0 0 15px #f00; }
            to { box-shadow: 0 0 25px #f00, 0 0 35px #f00; }
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .zigzag-card {
                padding: 20px 15px;
            }
            
            .zigzag-card h1 {
                font-size: 2em;
            }
            
            .input-group input {
                max-width: 280px;
                font-size: 16px;
                padding: 12px;
            }
        }
    </style>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const cursor = document.createElement('div');
            cursor.className = 'snake-cursor';
            document.body.appendChild(cursor);
            
            const trails = [];
            const trailCount = 12;
            let lastX = 0;
            let lastY = 0;
            
            // Create snake body segments
            for (let i = 0; i < trailCount; i++) {
                const trail = document.createElement('div');
                trail.className = 'snake-trail';
                trail.style.width = (10 - i/2) + 'px';
                trail.style.height = (10 - i/2) + 'px';
                document.body.appendChild(trail);
                trails.push({
                    element: trail,
                    x: 0,
                    y: 0,
                    angle: 0
                });
            }
            
            document.addEventListener('mousemove', function(e) {
                lastX = e.clientX;
                lastY = e.clientY;
            });
            
            function updateCursor() {
                // Update head position
                cursor.style.left = lastX + 'px';
                cursor.style.top = lastY + 'px';
                
                // Calculate angle for head rotation
                const dx = lastX - trails[0].x;
                const dy = lastY - trails[0].y;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                cursor.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
                
                // Update body segments
                let targetX = lastX;
                let targetY = lastY;
                
                trails.forEach((segment, index) => {
                    const dx = targetX - segment.x;
                    const dy = targetY - segment.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const moveX = dx * 0.2;
                    const moveY = dy * 0.2;
                    
                    segment.x += moveX;
                    segment.y += moveY;
                    
                    segment.element.style.left = segment.x + 'px';
                    segment.element.style.top = segment.y + 'px';
                    segment.element.style.opacity = 0.5 + (0.5 * (index / trailCount));
                    
                    targetX = segment.x;
                    targetY = segment.y;
                });
                
                requestAnimationFrame(updateCursor);
            }
            
            // Initialize positions
            trails.forEach(segment => {
                segment.x = lastX;
                segment.y = lastY;
            });
            
            updateCursor();
        });
    </script>
</head>
<body>
    <div class="container">
        <div class="zigzag-card">
            <h1>🔍 MedusaTLO Access</h1>
            
            <?php if (isset($_GET['error'])): ?>
                <div class="error-message">
                    <?php 
                        switch($_GET['error']) {
                            case 'invalid': echo 'Invalid access code'; break;
                            case 'session': echo 'Session expired'; break;
                            case 'notfound': echo 'Results file not found'; break;
                            case 'empty': echo 'Please enter an access code'; break;
                            case 'format': echo 'Access code must be 8 characters (letters and numbers only)'; break;
                            case 'rate_limit': echo 'Too many attempts. Please try again in 1 hour.'; break;
                            case 'busy': echo 'System busy, please try again'; break;
                            default: echo 'Access error'; break;
                        }
                    ?>
                </div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="input-group">
                    <label for="code">Access Code</label>
                    <input type="text" 
                           id="code" 
                           name="code" 
                           placeholder="Enter 8-digit code" 
                           maxlength="8" 
                           pattern="[A-Za-z0-9]{8}"
                           title="8 characters, letters and numbers only"
                           autocomplete="off"
                           required>
                </div>
                <button type="submit">View Results</button>
            </form>
        </div>
    </div>
    
    <?php include('footer.php'); ?>
</body>
</html>