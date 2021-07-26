const express = require("express");
const app = express();
require("dotenv").config({ path: __dirname + "/.env" });
const cors = require("cors");
const PORT = process.env.PORT || 3001;
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const mysql = require("mysql");

app.use(express.json());
app.use(cors());
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
}, 4500);

db.query("USE " + db.database);

db.query(
	"CREATE TABLE IF NOT EXISTS `user`" +
		"(" +
		"`id` int(6) unsigned AUTO_INCREMENT PRIMARY KEY, " +
		"`username` varchar(50), " +
		"`password` varchar(255) " +
		");"
);

db.query(
	"CREATE TABLE IF NOT EXISTS `exercises`" +
		"(" +
		"`user_id` int(6) unsigned, " +
		"`exercise_name` varchar(100) " +
		");"
);

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
		res.json({
			error: "You have to fill both username and password fields!"
		});
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
				bcrypt.compare(
					password,
					selectResult[0].password,
					(compareError, compareResponse) => {
						if (compareError) {
							res.json({ error: "Wrong username or password!" });
						} else if (compareResponse) {
							res.json({
								username: username,
								userId: selectResult[0].id
							});
						}
					}
				);
			} else {
				res.json({ error: "There is no user with this username!" });
				console.log("There is no user with this username!");
			}
		});
	}
});

app.post("/api/update_exercise", (req, res) => {
	const { userId, exerciseType } = req.body;
	const selectExistingUserWithExercise =
		"SELECT * from exercises WHERE user_id = ?";

	db.query(
		selectExistingUserWithExercise,
		userId,
		(selectError, selectResult) => {
			if (selectError) {
				console.log(selectError);
			} else if (selectResult.length <= 0) {
				const insertQuery =
					"INSERT INTO exercises SET user_id = ?, exercise_name = ?";

				db.query(
					insertQuery,
					[userId, exerciseType],
					(insertError, insertResult) => {
						if (insertError) {
							console.log(insertError);
							res.json({
								error:
									"There was an error with the exercise insertion!"
							});
						} else {
							res.json({ exercise: exerciseType });
						}
					}
				);
			} else if (selectResult.length > 0) {
				const updateQuery = "UPDATE exercises SET exercise_name = ?";

				db.query(
					updateQuery,
					exerciseType,
					(updateError, updateResult) => {
						if (updateError) {
							console.log(updateError);
							res.json({
								error:
									"There was an error with the exercise updating!"
							});
						} else {
							res.json({ exercise: exerciseType });
						}
					}
				);
			}
		}
	);
});

app.post("/api/get_last_exercise", (req, res) => {
	const { userId } = req.body;
	const selectExerciseQuery =
		"SELECT exercise_name FROM exercises WHERE user_id = ?";

	db.query(selectExerciseQuery, userId, (selectError, selectResult) => {
		if (selectError) {
			res.json({ error: "No exercise belongs to this user!" });
			console.log(selectError);
		} else if (selectResult.length > 0) {
			res.json({ exerciseType: selectResult[0].exercise_name });
		} else if (selectResult.length <= 0) {
			res.json({ exerciseType: "Nothing" });
		}
	});
});

app.post("/api/changecredentials", (req, res) => {
	const {
		userId,
		oldUsername,
		newUsername,
		oldPassword,
		newPassword
	} = req.body;
	const getUserQuery = "SELECT * from user WHERE username = ?;";

	db.query(getUserQuery, oldUsername, (selectUserError, selectUserResult) => {
		if (selectUserError) {
			console.log(selectUserError);
			res.json({ error: "There is no user with this username!" });
		} else if (selectUserResult.length > 0) {
			if (
				newUsername !== "" &&
				oldPassword === "" &&
				newPassword === ""
			) {
				const updateUsernameQuery =
					"UPDATE user SET username = ? WHERE id = ?;";

				db.query(
					updateUsernameQuery,
					[newUsername, userId],
					(updateUsernameError, updateUsernameResult) => {
						if (updateUsernameError) {
							console.log(updateUsernameError);
							res.json({
								error:
									"Something went wrong with the username update, please try again!"
							});
						} else if (updateUsernameResult) {
							res.json({
								userId: userId,
								username: newUsername
							});
						}
					}
				);
			} else if (newUsername === "") {
				if (oldPassword === "" || newPassword === "") {
					res.json({
						error:
							"You have to fill both current password and new password fields!"
					});
				} else {
					bcrypt.compare(
						oldPassword,
						selectUserResult[0].password,
						(compareError, compareResult) => {
							if (compareError) {
								console.log(compareError);
								res.json({
									error:
										"There was an error with your old password!"
								});
							} else if (compareResult) {
								bcrypt.hash(
									newPassword,
									saltRounds,
									(hashError, hashedPassword) => {
										if (hashError) {
											console.log(hashError);
											res.json({ error: hashError });
										}

										const updatePasswordQuery =
											"UPDATE user SET password = ? WHERE id = ?;";

										db.query(
											updatePasswordQuery,
											[hashedPassword, userId],
											(
												updatePasswordError,
												updatePasswordResult
											) => {
												if (updatePasswordError) {
													console.log(
														updatePasswordError
													);
													res.json({
														error:
															"There was an error with the password update, please try again!"
													});
												} else if (
													updatePasswordResult
												) {
													res.json({
														userId: userId,
														username: oldUsername
													});
												}
											}
										);
									}
								);
							}
						}
					);
				}
			} else {
				bcrypt.compare(
					oldPassword,
					selectUserResult[0].password,
					(compareError, compareResult) => {
						if (compareError) {
							console.log(compareError);
							res.json({
								error:
									"There was an error with your current password"
							});
						} else if (compareResult) {
							bcrypt.hash(
								newPassword,
								saltRounds,
								(hashError, hashedPassword) => {
									if (hashError) {
										console.log(hashError);
										res.json({ error: hashError });
									}

									const updateUsernameAndPasswordQuery =
										"UPDATE user SET username = ?, password = ? WHERE id = ?;";

									db.query(
										updateUsernameAndPasswordQuery,
										[newUsername, hashedPassword, userId],
										(updateError, updateResult) => {
											if (updateError) {
												console.log(updateError);
												res.json({
													error:
														"There was an error with the update, please try again!"
												});
											} else if (updateResult) {
												res.json({
													userId: userId,
													username: newUsername
												});
											}
										}
									);
								}
							);
						}
					}
				);
			}
		}
	});
});

app.post("/api/deleteuser", (req, res) => {
	const { userId } = req.body;
	const deleteUserQuery =
		"DELETE FROM user WHERE id = ?; DELETE FROM exercises WHERE user_id = ?;";

	db.query(deleteUserQuery, [userId, userId], (deleteError, deleteResult) => {
		if (deleteError) {
			console.log(deleteError);
			res.json({ error: "There is no user with this user ID!" });
		} else if (deleteResult) {
			res.json("Profile deleted!");
		}
	});
});

app.listen(PORT, () => {
	console.log(`App is listening on PORT ${PORT}`);
});
