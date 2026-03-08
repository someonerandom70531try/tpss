const express = require('express');
const path = require('path');
const app = express();

// Render assigns a dynamic port, so we must use process.env.PORT
const PORT = process.env.PORT || 3000;

// Serve all static files from the current directory (__dirname)
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});