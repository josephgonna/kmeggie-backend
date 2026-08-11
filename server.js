const express = require('express');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = 'change_this_to_something_long_and_random';

function requireLogin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).send('You must be logged in.');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).send('Invalid or expired token.');
  }
}

app.get('/', (req, res) => {
  res.send('Kmeggie+ backend is alive.');
});

app.post('/contact', (req, res) => {
  const submission = req.body;
  const existing = fs.readFileSync('contacts.json', 'utf8');
  const contacts = JSON.parse(existing);
  contacts.push(submission);
  fs.writeFileSync('contacts.json', JSON.stringify(contacts, null, 2));
  res.send('Thanks for reaching out!');
});

app.get('/contact', (req, res) => {
  const existing = fs.readFileSync('contacts.json', 'utf8');
  const contacts = JSON.parse(existing);
  res.json(contacts);
});

app.post('/waitlist', (req, res) => {
  const submission = req.body;
  const existing = fs.readFileSync('waitlist.json', 'utf8');
  const waitlist = JSON.parse(existing);
  const alreadyOnList = waitlist.some((entry) => entry.email === submission.email);
  if (alreadyOnList) {
    res.send("You're already on the waitlist!");
    return;
  }
  waitlist.push(submission);
  fs.writeFileSync('waitlist.json', JSON.stringify(waitlist, null, 2));
  res.send("You're on the list!");
});

app.get('/waitlist', (req, res) => {
  const existing = fs.readFileSync('waitlist.json', 'utf8');
  const waitlist = JSON.parse(existing);
  res.json(waitlist);
});

app.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  const existing = fs.readFileSync('users.json', 'utf8');
  const users = JSON.parse(existing);

  const alreadyExists = users.some((user) => user.email === email);
  if (alreadyExists) {
    res.status(400).send('An account with that email already exists.');
    return;
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const newUser = { name, email, password: hashedPassword };
  users.push(newUser);
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));

  res.send('Account created!');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const existing = fs.readFileSync('users.json', 'utf8');
  const users = JSON.parse(existing);

  const user = users.find((u) => u.email === email);

  if (!user) {
    res.status(401).send('Invalid email or password.');
    return;
  }

  const passwordMatches = bcrypt.compareSync(password, user.password);

  if (!passwordMatches) {
    res.status(401).send('Invalid email or password.');
    return;
  }

  const token = jwt.sign({ email: user.email }, SECRET, { expiresIn: '7d' });

  res.json({ message: 'Logged in!', token: token });
});

app.get('/me', requireLogin, (req, res) => {
  res.json({ email: req.userEmail });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});