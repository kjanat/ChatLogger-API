const Organization = require('../models/organization.model');
const logger = require('../utils/logger');

// Middleware to authenticate organization with API key
const authenticateOrganization = async (req, res, next) => {
  try {
    const orgApiKey = req.headers['x-organization-api-key'];
    
    if (!orgApiKey) {
      return res.status(401).json({ message: 'Organization API key required' });
    }
    
    const organization = await Organization.findOne({ apiKey: orgApiKey, isActive: true });
    
    if (!organization) {
      return res.status(401).json({ message: 'Invalid or disabled organization API key' });
    }
    
    req.organization = organization;
    next();
  } catch (error) {
    logger.error(`Organization authentication error: ${error.message}`);
    return res.status(401).json({ message: 'Authentication error' });
  }
};

// Middleware to check if user belongs to the correct organization
const checkOrganizationAccess = async (req, res, next) => {
  try {
    // Skip for superadmins who can access all organizations
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }

    // Make sure the user belongs to the organization in the request
    if (!req.user.organizationId || 
        req.organization && !req.user.organizationId.equals(req.organization._id)) {
      return res.status(403).json({ 
        message: 'Access denied: You do not have permission to access this organization\'s data' 
      });
    }
    
    next();
  } catch (error) {
    logger.error(`Organization access check error: ${error.message}`);
    return res.status(500).json({ message: 'Server error during organization access check' });
  }
};

// Create middleware that adds organization context to all requests
const addOrganizationToRequest = (req, res, next) => {
  // If organization is already set (e.g., from authenticateOrganization middleware)
  if (req.organization) {
    return next();
  }
  
  // If user is authenticated, set organization from user
  if (req.user && req.user.organizationId) {
    // Find and attach the organization
    Organization.findById(req.user.organizationId)
      .then(organization => {
        if (organization && organization.isActive) {
          req.organization = organization;
        }
        next();
      })
      .catch(error => {
        logger.error(`Error retrieving organization: ${error.message}`);
        next();
      });
  } else {
    next();
  }
};

module.exports = {
  authenticateOrganization,
  checkOrganizationAccess,
  addOrganizationToRequest
};
