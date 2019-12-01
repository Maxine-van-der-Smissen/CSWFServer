const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const userRoutes = require('./src/controllers/user.routes');
const characterRoutes = require('./src/controllers/character.routes');
const speciesRoutes = require('./src/controllers/species.router');
const roleRoutes = require('./src/controllers/role.router');
const worldRoutes = require('./src/controllers/world.router');

app.use('/users', userRoutes);
app.use('/characters', characterRoutes);
app.use('/species', speciesRoutes);
app.use('/roles', roleRoutes);
app.use('/worlds', worldRoutes);

module.exports = app;