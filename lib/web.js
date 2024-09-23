const express = require("express");
const PORT = 8000;
function runServer(){
    const app = express()
    app.use(express.json());
    app.use(express.urlencoded({
        extended: true
    }));
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`)
    })
}
module.exports = runServer;