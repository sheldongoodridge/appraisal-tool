const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireOrgAdmin = requireRole('org_admin', 'platform_admin');
const requireAppraiser = requireRole('org_admin', 'appraiser');

module.exports = { requireRole, requireOrgAdmin, requireAppraiser };
