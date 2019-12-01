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
    .run(`MATCH (world:World) RETURN world;`)
    .then(result => {
      const worlds = [];

      result.records.forEach(rec => worlds.push(toWorld(rec.toObject().world)));

      res.status(200).send({ worlds, count: worlds.length });
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/:worldName", (req, res) => {
  const worldName = req.params.worldName;

  const session = driver.session();

  session
    .run(`MATCH (world:World {name:"${worldName}"}) RETURN world;`)
    .then(result => {
      if (result.records.length === 1) {
        res.status(200).send(toWorld(result.records[0].toObject().world));
      } else {
        throw new Error("World doesn't exist!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.post("/", (req, res) => {
  const { name, description, difficulty } = req.body;

  const session = driver.session();

  session
    .run(
      `CREATE (world:World {name:"${name}", description:"${description}", difficulty:"${difficulty}"}) RETURN world;`
    )
    .then(result =>
      res.status(201).send(toWorld(result.records[0].toObject().world))
    )
    .catch(error => res.status(400).send({ error: error.message }));
});

router.put("/:worldName", (req, res) => {
  const worldName = req.params.worldName;

  let worldProps = "";

  for (prop in req.body) {
    worldProps = String.prototype.concat(
      worldProps,
      `\nSET world.${prop} = "${req.body[prop]}"`
    );
  }

  const session = driver.session();

  session
    .run(
      `MATCH (world:World {name:"${worldName}"})
      ${worldProps}
      RETURN world;`
    )
    .then(result => {
      if (result.records.length === 1) {
        res.status(200).send(toWorld(result.records[0].toObject().world));
      } else {
        throw new Error("World doesn't exist!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.delete("/:worldName", (req, res) => {
  const worldName = req.params.worldName;

  const session = driver.session();

  session
    .run(`MATCH (world:World {name:"${worldName}"}) RETURN world;`)
    .then(result => {
      if (result.records.length === 1) {
        const world = toWorld(result.records[0].toObject().world);

        session.run(`MATCH (world:World {name:"${worldName}"}) DELETE world;`);

        res.status(200).send(world);
      } else {
        throw new Error("World doesn't exist!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

module.exports = router;

function toWorld(record) {
  const { name, description, ...stats } = record.properties;

  const world = {
    id: +record.identity,
    name,
    description
  };

  for (prop in stats) {
    world[prop] = stats[prop];
  }

  return world;
}
