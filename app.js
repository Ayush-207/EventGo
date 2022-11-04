const express = require('express');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const path = require('path');
const app = express();
const User = require('./models/user');
const Event = require('./models/event');
const Token = require('./models/token');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const localStrategy = require('passport-local');

mongoose.connect('mongodb://localhost:27017/eventsApp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then((res) => {
        console.log('CONNECTED');
    })
    .catch(err => console.log('ERROR', err));


const db = mongoose.connection;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', ejsMate);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const sessionConfig = {
    secret: 'thisshouldbeasecret',
    resave: false,
    saveUninitialised: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.user;
    next();
})

app.get('/profile', (req, res) => {
    res.render('users/profile');
})

app.get('/events', (req, res) => {
    res.render('users/events');
})

app.post('/events/:id/registerEvent', async (req, res) => {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
        return res.redirect('/events');
    }
    const { tl_name, tl_mail, pl_name, pl_mail } = req.body;
    const token = new Token({
        leaderName: tl_name,
        leaderMail: tl_mail,
        playerName: pl_name,
        playerMail: pl_mail
    })
    token.event = event;
    await token.save();
    res.redirect(`/events/${id}`);
})

app.get('/events/:id/registerEvent', async (req, res) => {
    const event = await Event.findById(req.params.id);
    console.log(event);
    res.render('users/registerEvent', { event });
})

app.get('/events/:id', async (req, res) => {
    const { id } = req.params;
    const event = await Event.findById(id);
    const loggedInUserID = event.author;
    const loggedInUser = await User.findById (loggedInUserID);
    res.render('users/eventDetails', { event, loggedInUser });
})

app.get('/createEvent', (req, res) => {
    res.render('users/createEvent');
})


app.post('/createEvent', async (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    const event = req.body.event;
    const add = req.body.add;
    const registeredEvent = new Event(event);
    registeredEvent.add = add;
    console.log(req.user);
    registeredEvent.author = req.user;
    await registeredEvent.save();
    const loggedInUserID = registeredEvent.author;
    const loggedInUser = await User.findById (loggedInUserID);
    res.render('users/eventDetails', { event, loggedInUser });
    
})

app.get('/login', (req, res) => {
    res.render('users/login');
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back');
    res.redirect('/profile');
})

app.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err) };
        req.flash('success', "Goodbye!");
        res.redirect('/profile');
    });
})

app.get('/register', (req, res) => {
    res.render('users/register');
})

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        console.log(user);
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            res.redirect('/profile');
        })
    } catch (e) {
        res.redirect('register');
    }
})

app.get('/register2', (req, res) => {
    res.render('/register2');
})

app.get('/', (req, res) => {
    res.render('users/index');
})

app.listen('3000', () => {
    console.log('LISTENING ON PORT 3000');
})