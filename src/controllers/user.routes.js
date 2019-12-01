const express = require("express");
const router = express.Router();

const neo4j = require("neo4j-driver").v1;
const driver = neo4j.driver(
  "bolt://hobby-lmhdnlhdaiclgbkeajjohedl.dbs.graphenedb.com:24787",
  neo4j.auth.basic("server", "b.Xgokk4CIAj5q.UZqV76sIFSlZYqGz")
);

router.post("/", (req, res) => {
  const { username, password } = req.body;

  if (username && password) {
    const session = driver.session();

    session
      .run(
        `CREATE (user:User {username:"${username}", password:"${password}", active: true })
        RETURN user;`
      )
      .then(result => {
        if (result.records.length === 1) {
          res.status(201).send(toUser(result.records[0].toObject().user));
        } else {
          throw new Error("User creation failed!");
        }
      })
      .catch(error => res.status(400).send({ error: error.message }));

    session.close();
  } else {
    res.status(400).send({
      error:
        "Missing required properties, User must have properties: `username` and `password`!"
    });
  }
});

router.put("/:username", (req, res) => {
  const username = req.params.username;
  const { password, newPassword } = req.body;

  if (password && newPassword) {
    const session = driver.session();

    session
      .run(
        `MATCH (user:User {username:"${username}", password:"${password}", active: true })
      SET user.password = "${newPassword}"
      RETURN user;`
      )
      .then(result => {
        if (result.records.length === 1) {
          res.status(200).send(toUser(result.records[0].toObject().user));
        } else {
          res
            .status(400)
            .send({ error: "User doesn't exist or incorrect password!" });
        }
      })
      .catch(error => res.status(400).send({ error: error }));

    session.close();
  } else {
    res.status(400).send({
      error:
        "Missing required properties, must have properties: `password` and `newPassword`!"
    });
  }
});

router.delete("/:username", (req, res) => {
  const username = req.params.username;
  const { password } = req.body;

  if (password) {
    const session = driver.session();

    session
      .run(
        `MATCH (user:User {username:"${username}", password:"${password}", active: true })
        SET user.active = false
        RETURN user;`
      )
      .then(result => {
        if (result.records.length === 1) {
          res.status(200).send(toUser(result.records[0].toObject().user));
        } else {
          res
            .status(400)
            .send({ error: "User doesn't exist or incorrect password!" });
        }
      })
      .catch(error => res.status(400).send({ error: error }));

    session.close();
  } else {
    res.status(400).send({
      error: "Missing required property, must have property: `password`!"
    });
  }
});

router.get("/", (req, res) => {
  const session = driver.session();

  session
    .run(`MATCH (user:User { active: true }) RETURN user;`)
    .then(result => {
      const users = [];
      result.records.forEach(record => {
        users.push(record.toObject().user.properties.username);
      });

      const sortedUsers = users.sort();
      res.status(200).send({ users: sortedUsers });
    })
    .catch(error => res.status(400).send({ error: error }));
});

router.get("/login/:username", (req, res) => {
  const username = req.params.username;
  const password = req.body.password;

  const session = driver.session();

  session
    .run(
      `MATCH (user:User {username:"${username}", password:"${password}", active: true })
        RETURN count(user) > 0 AS valid;`
    )
    .then(result => res.status(200).send({ valid: result.records[0].toObject().valid }))
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/:username", (req, res) => {
  const username = req.params.username;

  const session = driver.session();

  session
    .run(
      `MATCH (user:User {username:"${username}", active: true })
          RETURN user;`
    )
    .then(result => {
      if (result.records.length === 1) {
        const { password, ...userProps } = toUser(result.records[0].toObject().user);
        res.status(200).send({ ...userProps });
      } else {
        res.status(400).send({ error: "User doesn't exist!" });
      }
    })
    .catch(error => res.status(400).send({ error: error }));

  session.close();
});

router.post("/exists", (req, res) => {
  const username = req.body.username;

  if (username) {
    const session = driver.session();

    session
      .run(
        `MATCH (user:User {username:"${username}" })
        RETURN count(user) > 0 AS result;`
      )
      .then(result => {
        res.status(200).send({ result: result.records[0].toObject().result });
      })
      .catch(error => res.status(400).send({ error: error }));

    session.close();
  } else {
    res.status(400).send({
      error: "Missing required property, must have property: `username`!"
    });
  }
});

router.post("/friends/:username", (req, res) => {
  const username = req.params.username;
  const { password, friend } = req.body;

  if (!friend) {
    res.status(400).send({
      error: "Missing required property, must have property: `friend`!"
    });
  }

  if (friend === username) {
    res.status(400).send({
      error: "username and friend name can't be the same!!"
    });
  }

  const session = driver.session();

  session
    .run(
      `MATCH (user:User {username:"${username}", password:"${password}", active: true })
        MATCH (friend:User {username:"${friend}"})
        MERGE (user)-[:FriendsWith]-(friend);`
    )
    .then(() => res.status(201).send())
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/friends/:username", (req, res) => {
  const username = req.params.username;

  const session = driver.session();

  session
    .run(
      `MATCH (user:User {username:"${username}"})-[:FriendsWith]-(friend:User)
        RETURN friend;`
    )
    .then(result => {
      const friends = [];

      result.records.forEach(rec =>
        friends.push(rec.toObject().friend.properties.username)
      );

      res.status(200).send({ friends });
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

module.exports = router;

function toUser(record) {

  const user = {
    id: +record.identity,
    ...record.properties
  };

  return user;
}
