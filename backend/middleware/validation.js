const Joi = require('joi');

const taskSchema = Joi.object({
  clientName: Joi.string().allow('', null).optional().max(255),
  taskName: Joi.string().required().min(1).max(255),
  taskDescription: Joi.string().required().min(1),
  dateCommissioned: Joi.date().iso().allow(null, ''),
  dateDelivered: Joi.date().iso().allow(null, ''),
  expectedAmount: Joi.number().min(0).allow('', null).optional(),
  isPaid: Joi.boolean().default(false),
  quantity: Joi.number().min(1).allow('', null).default(1),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  status: Joi.string().valid('not_started', 'in_progress', 'review', 'completed').default('not_started'),
  notes: Joi.string().allow('', null),
  guestClientId: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null, ''),
  clientId: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null, ''),
  guestClientName: Joi.string().allow('', null),
  files: Joi.any().optional().allow(null)
});

const validateTask = (req, res, next) => {
  const fs = require('fs');
  try {
    fs.appendFileSync('debug_validation.log', `[${new Date().toISOString()}] Entering validateTask. Method: ${req.method}. Body keys: ${Object.keys(req.body)}\n`);
  } catch (e) { }

  // Create a version of the schema that makes specific fields optional for partial updates
  let schemaToUse = taskSchema;
  if (req.method === 'PUT' || req.method === 'PATCH') {
    schemaToUse = taskSchema.fork(['taskName', 'taskDescription'], (schema) => schema.optional());
  }

  const { error, value } = schemaToUse.validate(req.body);

  if (error) {
    try {
      fs.appendFileSync('debug_validation.log', `[${new Date().toISOString()}] Validation FAILED: ${JSON.stringify(error.details)}\n\n`);
    } catch (e) { }
    console.error('Validation FAILED:', JSON.stringify(error.details, null, 2));

    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }

  req.body = value;
  try {
    fs.appendFileSync('debug_validation.log', `[${new Date().toISOString()}] Validation PASSED.\n`);
  } catch (e) { }
  next();
};

const validateId = (req, res, next) => {
  const fs = require('fs');
  try {
    fs.appendFileSync('debug_validation.log', `[${new Date().toISOString()}] Entering validateId. Params: ${JSON.stringify(req.params)}\n`);
  } catch (e) { }

  // Check for 'id' or 'taskId' in params
  let id = req.params.id || req.params.taskId;
  id = parseInt(id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID'
    });
  }

  // Normalize to integer
  if (req.params.id) req.params.id = id;
  if (req.params.taskId) req.params.taskId = id;

  next();
};

module.exports = { validateTask, validateId };