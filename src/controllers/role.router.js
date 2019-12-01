const express = require("express");
const router = express.Router();

const neo4j = require("neo4j-driver").v1;
const driver = neo4j.driver(
  "bolt://hobby-lmhdnlhdaiclgbkeajjohedl.dbs.graphenedb.com:24787",
  neo4j.auth.basic("server", "b.Xgokk4CIAj5q.UZqV76sIFSlZYqGz")
);

router.get("/", (req, res) => {
  const session = driver.session();

  session
    .run(`MATCH (role:Role) RETURN role;`)
    .then(result => {
      const roles = [];

      result.records.forEach(rec => roles.push(toRole(rec.toObject().role)));

      res.status(200).send({ roles, count: roles.length });
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/:roleName", (req, res) => {
  const roleName = req.params.roleName;

  const session = driver.session();

  session
    .run(`MATCH (role:Role {name:"${roleName}"}) RETURN role;`)
    .then(result => {
      if (result.records.length === 1) {
        res.status(200).send(toRole(result.records[0].toObject().role));
      } else {
        throw new Error("Role doesn't exist!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.post("/", (req, res) => {
  try {
    const roleProps = roleToString(req.body);

    const session = driver.session();

    session
      .run(`CREATE (role:Role {${roleProps}}) RETURN role;`)
      .then(result =>
        res.status(201).send(toRole(result.records[0].toObject().role))
      )
      .catch(error => res.status(400).send({ error: error.message }));
  } catch {
    error => res.status(400).send({ error: error.message });
  }
});

router.put("/:roleName", (req, res) => {
  const roleName = req.params.roleName;

  let roleProps = "";

  for (prop in req.body) {
    roleProps = String.prototype.concat(
      roleProps,
      `\nSET role.${prop} = "${req.body[prop]}"`
    );
  }

  const session = driver.session();

  session
    .run(
      `MATCH (role:Role {name:"${roleName}"})
      ${roleProps}
      RETURN role;`
    )
    .then(result => {
      if (result.records.length === 1) {
        res.status(200).send(toRole(result.records[0].toObject().role));
      } else {
        throw new Error("Role doesn't exist!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.delete("/:roleName", (req, res) => {
  const roleName = req.params.roleName;

  const session = driver.session();

  session
    .run(`MATCH (role:Role {name:"${roleName}"}) RETURN role;`)
    .then(result => {
      if (result.records.length === 1) {
        const role = toRole(result.records[0].toObject().role);

        session.run(`MATCH (role:Role {name:"${roleName}"}) DELETE role;`);

        res.status(200).send(role);
      } else {
        throw new Error('Role doesn\'t exist!')
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

module.exports = router;

function toRole(record) {
  const { name, description, ...statsProp } = record.properties;

  const stats = {};

  for (prop in statsProp) {
    stats[prop] = +statsProp[prop];
  }
  
  const role = {
    id: +record.identity,
    name,
    description,
    stats
  };

  return role;
}

function roleToString(role) {
  return String.prototype.concat(
    ...[
      'name:"',
      role.name,
      '", description:"',
      role.description,
      '", health:"',
      role.health,
      '", mana:"',
      role.mana,
      '", stamina:"',
      role.stamina,
      '", physicalPower:"',
      role.physicalPower,
      '", magicalPower:"',
      role.magicalPower,
      '", physicalDefense:"',
      role.physicalDefense,
      '", magicalDefense:"',
      role.magicalDefense,
      '", speed:"',
      role.speed,
      '", luck:"',
      role.luck,
      '", charisma:"',
      role.charisma,
      '"'
    ]
  );
}
