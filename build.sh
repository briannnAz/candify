#!/bin/bash
# Build the artifact HTML by inlining CSS, JS, and data from separate source files

cat <<'HEAD'
<title>Candify</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap">

<style>
HEAD

cat styles.css

echo '</style>'
echo ''

# HTML body
sed -n '/<!-- Intro Splash -->/,/<script/{ /^<script/d; p }' candify.html

echo ''

# Embed data.json so no fetch is needed in the artifact sandbox
echo '<script>'
echo 'const EMBEDDED_DATA ='
cat data.json
echo ';'
echo '</script>'

echo ''
echo '<script>'
cat app.js
echo ''
cat carousel.js
echo ''
cat views.js
echo ''
echo 'init();'
echo '</script>'
