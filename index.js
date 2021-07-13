const express = require("express");
const app = express();
require("dotenv").config({ path: __dirname + "/.env" });
const cors = require("cors");
const PORT = process.env.PORT || 3001;
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const mysql = require("mysql");

app.use(express.json());
app.use(
	cors({
		origin: ["http://localhost:19002/"],
		methods: ["GET", "POST", "PUT", "DELETE"]
	})
);
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createPool({
    host: process.env.HOST,
    user: process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    insecureAuth: true,
    multipleStatements: true
});

setInterval(function() {
    db.query("SELECT 1");
});

db.query("USE " + db.database);

app.post("/api/registeruser", (req, res) => {
    console.log(req.body);
});

app.listen(PORT, () => {
    console.log(`App is listening on PORT ${PORT}`);
});
