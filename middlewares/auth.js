exports.ensureAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
};

exports.ensureRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log('ensureRole check:', {
      user: req.session.user?.email,
      role: req.session.user?.roles?.name,
      allowedRoles
    });
    
    if (req.session.user && req.session.user.roles && allowedRoles.includes(req.session.user.roles.name)) {
      return next();
    }
    // If user is logged in but doesn't have permission, show 403 or redirect
    if (req.session.user) {
        console.log('Access denied - User role not in allowed roles');
        return res.status(403).render('404', { title: 'Access Denied', error: 'You do not have permission to view this page.', user: req.session.user });
    }
    res.redirect('/login');
  };
};
