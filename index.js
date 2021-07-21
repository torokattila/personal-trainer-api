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

const saltRounds = 10;

app.post("/api/registeruser", (req, res) => {
	const { username, password, confirmPassword } = req.body;

	if (password !== confirmPassword) {
		res.json({
			error: "The two password fields does not match, please try again!"
		});
	} else {
		const findUserQuery = "SELECT username FROM user WHERE username = ?;";

		db.query(findUserQuery, username, (error, result) => {
			if (error) {
				console.log(error);
				res.json({ error: error });
			} else if (result.length > 0) {
				res.json({ error: "This username is already exist!" });
			} else {
				const insertUserQuery =
					"INSERT INTO user SET username = ?, password = ?;";

				bcrypt.hash(
					password,
					saltRounds,
					(hashError, hashedPassword) => {
						if (hashError) {
							console.log(hashError);
							res.json({ error: hashError });
						}

						db.query(
							insertUserQuery,
							[username, hashedPassword],
							(insertError, insertResult) => {
								if (insertError) {
									console.log(insertError);
									res.json({ error: insertError });
								} else if (insertResult) {
									res.json({
										username: username,
										userId: insertResult.insertId
									});
								}
							}
						);
					}
				);
			}
		});
	}
});

app.post("/api/loginuser", (req, res) => {
	const { username, password } = req.body;
	const sqlSelectUser = "SELECT * FROM user WHERE username = ?;";

	if (username === "" && password === "") {
		res.json({ error: "You have to fill both username and password fields!" });
	} else if (username === "" && password !== "") {
		res.json({ error: "Please fill the username field!" });
	} else if (username !== "" && password === "") {
		res.json({ error: "Please fill the password field!" });
	} else {
		db.query(sqlSelectUser, username, (selectError, selectResult) => {
			if (selectError) {
				console.log(selectError);
				res.json({ error: selectError });
			}

			if (selectResult.length > 0) {
				bcrypt.compare(password, selectResult[0].password, (compareError, compareResponse) => {
					if (!compareResponse) {
						res.json({ error: "Wrong username or password!" });
					} else if (compareResponse) {
						res.json({
							username: username,
							userId: selectResult[0].id
						});
					}
				});
			} else {
				res.json({ error: "There is no user with this username!" });
				console.log("There is no user with this username!");
			}
		});
	}
});

app.listen(PORT, () => {
	console.log(`App is listening on PORT ${PORT}`);
});
