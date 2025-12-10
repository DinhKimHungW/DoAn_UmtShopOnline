const User = require('../models/user');
const bcrypt = require('bcryptjs');

exports.getLogin = (req, res) => {
  res.render('login', { title: 'Login', user: req.session.user });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.render('login', { title: 'Login', error: 'Invalid email or password', user: null });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.render('login', { title: 'Login', error: 'Invalid email or password', user: null });
    }

    req.session.user = user;

    if (user.roles && (user.roles.name === 'admin_canteen' || user.roles.name === 'super_admin')) {
      return res.redirect('/admin');
    }

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('login', { title: 'Login', error: 'An error occurred', user: null });
  }
};

exports.getRegister = (req, res) => {
  res.render('register', { title: 'Register', user: req.session.user });
};

exports.postRegister = async (req, res) => {
  const { email, password, name, phone } = req.body;
  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.render('register', { title: 'Register', error: 'Email already exists', user: null });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      email,
      password_hash: hashedPassword,
      name,
      phone
    });

    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.render('register', { title: 'Register', error: 'An error occurred', user: null });
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

exports.getProfile = (req, res) => {
    res.render('profile', { title: 'My Profile', user: req.session.user });
};

exports.postProfile = async (req, res) => {
    const { name, phone, address, new_password } = req.body;
    const userId = req.session.user.id;

    try {
        const updates = { name, phone, address };
        
        if (new_password) {
            updates.password_hash = await bcrypt.hash(new_password, 10);
        }

        const updatedUser = await User.update(userId, updates);

        req.session.user = updatedUser; // Update session
        res.render('profile', { title: 'My Profile', user: updatedUser, success: 'Profile updated successfully!' });
    } catch (err) {
        console.error(err);
        res.render('profile', { title: 'My Profile', user: req.session.user, error: 'Error updating profile' });
    }
};

