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
    .run(`MATCH (species:Species) RETURN species;`)
    .then(result => {
      const species = [];

      result.records.forEach(rec =>
        species.push(toSpecies(rec.toObject().species))
      );

      res.status(200).send({ species, count: species.length });
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/:speciesName", (req, res) => {
  const speciesName = req.params.speciesName;

  const session = driver.session();

  session
    .run(`MATCH (species:Species {name:"${speciesName}"}) RETURN species;`)
    .then(result => {
      if (result.records.length === 1) {
        res.status(200).send(toSpecies(result.records[0].toObject().species));
      } else {
        throw new Error("Species doesn't exist!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.post("/", (req, res) => {
  try {
    const speciesProps = speciesToString(req.body);

    const session = driver.session();

    session
      .run(`CREATE (species:Species {${speciesProps}}) RETURN species;`)
      .then(result =>
        res.status(201).send(toSpecies(result.records[0].toObject().species))
      )
      .catch(error => res.status(400).send({ error: error.message }));
  } catch {
    error => res.status(400).send({ error: error.message });
  }
});

router.put("/:speciesName", (req, res) => {
  const speciesName = req.params.speciesName;

  let speciesProps = "";

  for (prop in req.body) {
    speciesProps = String.prototype.concat(
      speciesProps,
      `\nSET species.${prop} = "${req.body[prop]}"`
    );
  }

  const session = driver.session();

  session
    .run(
      `MATCH (species:Species {name:"${speciesName}"})
      ${speciesProps}
      RETURN species;`
    )
    .then(result => {
      if (result.records.length === 1) {
        res.status(200).send(toSpecies(result.records[0].toObject().species));
      } else {
        throw new Error("Species doesn't exist!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.delete("/:speciesName", (req, res) => {
  const speciesName = req.params.speciesName;

  const session = driver.session();

  session
    .run(`MATCH (species:Species {name:"${speciesName}"}) RETURN species;`)
    .then(result => {
      if (result.records.length === 1) {
        const species = toSpecies(result.records[0].toObject().species);

        session.run(
          `MATCH (species:Species {name:"${speciesName}"}) DELETE species;`
        );

        res.status(200).send(species);
      } else {
        throw new Error("Species doesn't exist!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

module.exports = router;

function toSpecies(record) {
  const { name, description, ...stats } = record.properties;

  const species = {
    id: +record.identity,
    name,
    description
  };

  for (prop in stats) {
    species[prop] = +stats[prop];
  }

  return species;
}

function speciesToString(species) {
  return String.prototype.concat(
    ...[
      'name:"',
      species.name,
      '", description:"',
      species.description,
      '", health:"',
      species.health,
      '", mana:"',
      species.mana,
      '", stamina:"',
      species.stamina,
      '", physicalPower:"',
      species.physicalPower,
      '", magicalPower:"',
      species.magicalPower,
      '", physicalDefense:"',
      species.physicalDefense,
      '", magicalDefense:"',
      species.magicalDefense,
      '", speed:"',
      species.speed,
      '", luck:"',
      species.luck,
      '", charisma:"',
      species.charisma,
      '"'
    ]
  );
}
