const express = require("express");
const router = express.Router();

const neo4j = require("neo4j-driver").v1;
const driver = neo4j.driver(
  "bolt://hobby-lmhdnlhdaiclgbkeajjohedl.dbs.graphenedb.com:24787",
  neo4j.auth.basic("server", "b.Xgokk4CIAj5q.UZqV76sIFSlZYqGz")
);

router.post("/", (req, res) => {
  const { username, password, name, species, role, world } = req.body;
  const speciesName = species;
  const roleName = role;
  const worldName = world;

  if (username && password && name && speciesName && roleName && worldName) {
    const session = driver.session();

    session
      .run(
        `MATCH (user:User {username:"${username}", password:"${password}", active: true })
                MATCH (species:Species {name:"${speciesName}"})
                MATCH (role:Role {name:"${roleName}"})
                MATCH (world:World {name:"${worldName}"})
                CREATE (character:Character {name:"${name}"})
                CREATE (user)-[:HasCharacter]->(character)
                CREATE (character)-[:OfSpecies]->(species)
                CREATE (character)-[:WithRole]->(role)
                CREATE (character)-[:InWorld]->(world)
                RETURN character, species, role, world;`
      )
      .then(result => {
        if (result.records.length === 1) {
          const character = toCharacter(result.records[0].toObject());

          res.status(201).send(character);
        } else {
          throw new Error("Character creation failed!");
        }
      })
      .catch(error => {
        res.status(400).send({ error: error.message });
      });
  } else {
    res.status(400).send({
      error:
        "Missing required properties, Character must have properties: `username`, `name`, `species`, `role` and `world`!"
    });
  }
});

router.put("/:username/:characterName", (req, res) => {
  const username = req.params.username;
  const characterName = req.params.characterName;

  const { password, name, species, role, world } = req.body;

  if (!password) {
    res.status(400).send({
      error: "Missing required property `password`!"
    });
    return;
  }

  const session = driver.session();

  session
    .run(
      `MATCH (user:User {username:"${username}", password: "${password}", active: true })-[:HasCharacter]->(character:Character {name:"${characterName}"})
      MATCH (character)-[:OfSpecies]->(species:Species)
      MATCH (world:World)<-[:InWorld]-(character)-[:WithRole]->(role:Role)
        RETURN character, species, role, world;`
    )
    .then(result => {
      if (result.records.length === 1) {
        const record = result.records[0].toObject();

        if (name && record.character.properties.name !== name) {
          session.run(
            `MATCH (c:Character) WHERE ID(c)=${+record.character.identity}
                SET c.name = "${name}"`
          );
        }

        if (species && record.species.properties.name !== species) {
          session.run(
            `MATCH (c:Character) 
                    WHERE ID(c)=${+record.character.identity}
                    MATCH (c)-[r:OfSpecies]->(:Species)
                    MATCH (s:Species {name:"${species}"})
                    DELETE r
                    CREATE (c)-[:OfSpecies]->(s);`
          );
        }

        if (role && record.role.properties.name !== role) {
          session.run(
            `MATCH (c:Character) 
                    WHERE ID(c)=${+record.character.identity}
                    MATCH (c)-[r:WithRole]->(:Role)
                    MATCH (s:Role {name:"${role}"})
                    DELETE r
                    CREATE (c)-[:WithRole]->(s);`
          );
        }

        if (world && record.world.properties.name !== world) {
          session.run(
            `MATCH (c:Character) 
                    WHERE ID(c)=${+record.character.identity}
                    MATCH (c)-[r:InWorld]->(:World)
                    MATCH (s:World {name:"${world}"})
                    DELETE r
                    CREATE (c)-[:InWorld]->(s);`
          );
        }

        return session.run(
          `MATCH (character:Character) 
            WHERE ID(character)=${+record.character.identity}
            MATCH (character)-[:OfSpecies]->(species:Species)
            MATCH (character)-[:WithRole]->(role:Role)
            MATCH (character)-[:InWorld]->(world:World)
            RETURN character, species, role, world;`
        );
      } else {
        throw new Error("Character doesn't exist!");
      }
    })
    .then(result => {
      if (result.records.length === 1) {
        const character = toCharacter(result.records[0].toObject());

        res.status(200).send(character);
      } else {
        throw new Error("Something went wrong!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));

  session.close();
});

router.delete("/:username/:characterName", (req, res) => {
  const username = req.params.username;
  const characterName = req.params.characterName;
  const password = req.body.password;

  if (!password) {
    res.status(400).send({
      error: "Missing required property `password`!"
    });
    return;
  }

  const session = driver.session();

  session
    .run(
      `MATCH (user:User {username:"${username}", password: "${password}", active: true })-[:HasCharacter]->(character:Character {name:"${characterName}"})
        MATCH (character)-[:OfSpecies]->(species:Species)
        MATCH (world:World)<-[:InWorld]-(character)-[:WithRole]->(role:Role)
        RETURN character, species, role, world;`
    )
    .then(result => {
      if (result.records.length === 1) {
        const character = toCharacter(result.records[0].toObject());

        session.run(
          `MATCH (user:User {username:"${username}", password: "${password}", active: true })-[:HasCharacter]->(character:Character {name:"${characterName}"})
                MATCH (:User)-[ru:HasCharacter]->(character)-[rs:OfSpecies]->(species:Species)
                MATCH (world:World)<-[rw:InWorld]-(character)-[rr:WithRole]->(role:Role)
                DELETE character, ru, rs, rw, rr;`
        );

        res.status(200).send(character);
      } else {
        res
          .status(400)
          .send({ error: "Character doesn't exist or login is wrong!" });
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/", (req, res) => {
  const session = driver.session();

  session
    .run(
      `MATCH (character:Character)
        MATCH (character)-[:OfSpecies]->(species:Species)
        MATCH (world:World)<-[:InWorld]-(character)-[:WithRole]->(role:Role)
        RETURN character, species, role, world;`
    )
    .then(result => {
      const characters = [];

      result.records.forEach(rec =>
        characters.push(toCharacter(rec.toObject()))
      );

      res
        .status(200)
        .send({ characters: characters, count: characters.length });
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/character/:characterName", (req, res) => {
  const characterName = req.params.characterName;

  const session = driver.session();

  session
    .run(
      `MATCH (character:Character {name:"${characterName}"})
        MATCH (character)-[:OfSpecies]->(species:Species)
        MATCH (world:World)<-[:InWorld]-(character)-[:WithRole]->(role:Role)
        RETURN character, species, role, world;`
    )
    .then(result => {
      if (result.records.length === 1) {
        const character = toCharacter(result.records[0].toObject());

        res.status(200).send(character);
      } else {
        throw new Error("Something went wrong!");
      }
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/user/:username", (req, res) => {
  const username = req.params.username;
  let user;

  const session = driver.session();

  session
    .run(
      `MATCH (user:User {username:"${username}", active: true })
    RETURN user;`
    )
    .then(result => {
      if (result.records.length === 1) {
        user = {
          username: result.records[0].toObject().user.properties.username
        };

        return session.run(
          `MATCH (user:User {username:"${username}", active: true })-[:HasCharacter]->(character:Character)-[:OfSpecies]->(species:Species)
            MATCH (role:Role)<-[:WithRole]-(character)-[:InWorld]->(world:World)
            RETURN character, species, role, world;`
        );
      }
    })
    .then(result => {
      const characters = [];

      result.records.forEach(rec =>
        characters.push(toCharacter(rec.toObject()))
      );

      user.characters = characters;

      res.status(200).send(user);
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

router.get("/search/:characterName", (req, res) => {
  const characterName = req.params.characterName;
  const type = req.body.type.toLowerCase();

  const SPECIES = "species";
  const ROLE = "role";
  const WORLD = "world";

  let queryRelation = (function() {
    switch (type) {
      case SPECIES: {
        return `MATCH (:Character {name:"${characterName}"})-[:OfSpecies]->(species:Species)<-[:OfSpecies]-(character:Character)
        MATCH (role:Role)<-[:WithRole]-(character)-[:InWorld]->(world:World)
        RETURN character, species, role, world;`;
      }
      case ROLE: {
        return `MATCH (:Character {name:"${characterName}"})-[:WithRole]->(role:Role)<-[:WithRole]-(character:Character)-[:OfSpecies]->(species:Species)
        MATCH (character)-[:InWorld]->(world:World)
        RETURN character, species, role, world;`;
      }
      case WORLD: {
        return `MATCH (:Character {name:"${characterName}"})-[:InWorld]->(world:World)<-[:InWorld]-(character:Character)-[:OfSpecies]->(species:Species)
        MATCH (role:Role)<-[:WithRole]-(character)
        RETURN character, species, role, world;`;
      }
      default:
        throw new Error("Type is not one of: `species`, `role` or `world`!");
    }
  })();

  const session = driver.session();

  session
    .run(queryRelation)
    .then(result => {
      const characters = [];

      result.records.forEach(rec =>
        characters.push(toCharacter(rec.toObject()))
      );

      res
        .status(200)
        .send({ characters: characters, count: characters.length });
    })
    .catch(error => res.status(400).send({ error: error.message }));
});

module.exports = router;

function calcStats(species, role) {
  const stats = {};
  for (prop in species) {
    if (prop !== "name" && prop !== "description") {
      stats[prop] = +species[prop] + +role[prop];
    }
  }

  return stats;
}

function toCharacter(record) {
  const characterProps = record.character;
  const species = record.species.properties;
  const role = record.role.properties;
  const world = record.world.properties;

  const stats = calcStats(species, role);

  const character = {
    id: +characterProps.identity,
    name: characterProps.properties.name,
    species: species.name,
    role: role.name,
    world: world.name,
    stats
  };

  return character;
}
