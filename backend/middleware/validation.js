const Joi = require('joi');

const taskSchema = Joi.object({
  clientName: Joi.string().allow('', null).optional().max(255),
  taskDescription: Joi.string().required().min(1),
  dateCommissioned: Joi.date().iso().allow(null, ''),
  dateDelivered: Joi.date().iso().allow(null, ''),
  expectedAmount: Joi.number().min(0).allow('', null).optional(),
  isPaid: Joi.boolean().default(false),
  quantity: Joi.number().min(1).allow('', null).default(1),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  status: Joi.string().valid('not_started', 'in_progress', 'review', 'completed').default('not_started'),
  notes: Joi.string().allow('', null)
});

const validateTask = (req, res, next) => {
  const { error, value } = taskSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }

  req.body = value;
  next();
};

const validateId = (req, res, next) => {
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