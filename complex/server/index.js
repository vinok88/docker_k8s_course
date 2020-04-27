const keys = require('./keys');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const { Pool } = require("pg");
const pgClient = new Pool({
    user: keys.pgUser,
    password: keys.pgPassword,
    host: keys.pgHost,
    database: keys.pgDatabase,
    port: keys.pgPort
});

pgClient.on('error', () => console.log('PG connectin error'));

pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch(err => console.log(err));

const redis = require('redis');

const redisCLient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: 1000
});

const redisPublisher = redisCLient.duplicate();

app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    const values = redisCLient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }

    redisCLient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);

    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
    res.send({working : true});

});

app.listen(5000, err => {
    console.log('Listening');
});