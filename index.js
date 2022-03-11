// const fs = require('fs');
// const http = require('http');
require('dotenv').config();
const https = require('https');
const vhost = require('vhost');
const exec = require('child_process').exec;
const express = require('express');
const cors = require('cors');
const bp = require('body-parser');
const { Parser } = require('json2csv');
const db = require('./models');
const {getAddress, verifyMessage} = require('ethers/lib/utils');

// const privateKey = fs.readFileSync('/etc/letsencrypt/live/emails.launchpad.marketmaking.pro/privkey.pem', 'utf8');
// const certificate = fs.readFileSync('/etc/letsencrypt/live/emails.launchpad.marketmaking.pro/cert.pem', 'utf8');

// const credentials = {
// 	key: privateKey,
// 	cert: certificate
// };

const TEMPLATE_ADDRESS = '{address}';
const TEMPLATE_EMAIL = '{email}';

const SIGN_MESSAGE_TEMPLATE = `I confirm that wallet ${TEMPLATE_ADDRESS} belongs to me, and provided email is valid. Email: ${TEMPLATE_EMAIL}`;

const app = express();

app.use(cors({origin: true}));
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

const validateEmail = (email) => {
  return email
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

app.get('/signMessageTemplate', async (_, res) => {
  res.json({ message: SIGN_MESSAGE_TEMPLATE });
});

app.get('/participant/:address/exists', async (req, res) => {
  const exists = await db.Partisipant.findAll({
    where: {
      address: req.params.address.toString()
    }
  })[0];

  res.json({
    exists: !!exists,
  });
});

app.get('/.well-known/acme-challenge/fcr0jU0w5byFaD6zjf80d5CuSZel5FFrxfmXLz3y_3I', (req, res) => {
  res.status(200).end('fcr0jU0w5byFaD6zjf80d5CuSZel5FFrxfmXLz3y_3I.mvOByQTfFh6umIzAu9kNHmPXI9TKQyZfcjgQqe4dgBo');
});

app.get('/exp/database8888', async (req, res) => {
  const participants = await db.Partisipant.findAll();
  if(!participants[0]) return res.status(404).end('no data in database');
  const json2csv = new Parser();
  const csv = json2csv.parse(participants);
  res.header('Content-Type', 'text/csv');
  res.attachment('dump.csv');
  return res.send(csv);
});

app.post('/participant', async (req, res) => {
  const params = req.body;

  console.log(params);

  if (!params || !params.address || !params.email || !params.signature) {
    res.status(400).end('Invalid request body');
    return;
  }

  if (!validateEmail(params.email)) {
    res.status(400).end('Invalid email');
    return;
  }

  let signer = '';

  const signMessage = SIGN_MESSAGE_TEMPLATE.replace(TEMPLATE_ADDRESS, params.address).replace(TEMPLATE_EMAIL, params.email);

  try {
    signer = verifyMessage(signMessage, params.signature);
  } catch {
    res.status(400).end('Invalid signature');
    return;
  }

  if (getAddress(params.address) !== signer) {
    res.status(400).end('Invalid signer');
    return;
  }

  db.Partisipant.findAll({
    where: {
      address: params.address
    }
  }).then(async data => {
    const exists = data[0];
    console.log('address: ')
    console.log(exists);

    if (!!exists) {
      res.status(500).end('Email was already assigned to following address');
      return;
    }

    await db.Partisipant.create({ address: params.address, email: params.email, signature: params.signature })
      .then((_) => res.end('Successfully saved'))
      .catch((_) => {
        res.status(400).end('Failed to save')
      });
  });
});

// var virtual = module.exports = express();
// virtual.use(vhost('emails.launchpad.marketmaking.pro', app));

// const httpServer = http.createServer(app);
// const httpsServer = https.createServer(credentials, virtual);

// httpsServer.listen(443);

// httpServer.listen(80);
// httpsServer.listen(443);

app.listen(443, () => {
  console.log('running on :443')
})