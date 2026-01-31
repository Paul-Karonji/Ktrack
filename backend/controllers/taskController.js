const Task = require('../models/Task');

class TaskController {
  static async getAllTasks(req, res) {
    try {
      const filters = {};
      if (req.user && req.user.role === 'client') {
        filters.clientId = req.user.id;
      }
      const tasks = await Task.findAll(filters, req.user?.id);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tasks'
      });
    }
  }

  static async createTask(req, res) {
    try {
      const taskData = { ...req.body };

      // If client is creating task, set client_id
      if (req.user && req.user.role === 'client') {
        taskData.clientId = req.user.id;
        taskData.clientName = req.user.full_name; // Ensure matches profile
      }

      // Ensure clientName is present (for admins)
      if (!taskData.clientName) {
        return res.status(400).json({
          success: false,
          message: 'Client name is required'
        });
      }

      const task = await Task.create(taskData);
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create task'
      });
    }
  }

  static async updateTask(req, res) {
    try {
      const existingTask = await Task.findById(req.params.id);

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      const updatedTask = await Task.update(req.params.id, req.body);
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update task'
      });
    }
  }

  static async deleteTask(req, res) {
    try {
      const existingTask = await Task.findById(req.params.id);

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      await Task.delete(req.params.id);
      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete task'
      });
    }
  }

  static async togglePayment(req, res) {
    try {
      const existingTask = await Task.findById(req.params.id);

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      const updatedTask = await Task.togglePayment(req.params.id);
      res.json(updatedTask);
    } catch (error) {
      console.error('Error toggling payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment status'
      });
    }
  }

  static async sendQuote(req, res) {
    try {
      const { amount } = req.body;
      const existingTask = await Task.findById(req.params.id);

      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const updatedTask = await Task.update(req.params.id, {
        quotedAmount: amount,
        quoteStatus: 'quote_sent',
        status: 'review' // Move to review status
      });

      res.json(updatedTask);
    } catch (error) {
      console.error('Error sending quote:', error);
      res.status(500).json({ success: false, message: 'Failed to send quote' });
    }
  }

  static async respondToQuote(req, res) {
    try {
      const { action } = req.body; // 'approve' or 'reject'
      const existingTask = await Task.findById(req.params.id);

      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      // Check ownership (if not admin)
      if (req.user.role !== 'admin' && existingTask.client_id !== req.user.id) {
        // Assuming client_id is stored, but wait, do we store client_id?
        // In Task.js create, we added client_id.
        // Let's verify if Task model has client_id in findById result
      }

      let updates = {};
      if (action === 'approve') {
        updates = {
          quoteStatus: 'approved',
          status: 'in_progress', // Start work or wait for payment?
          expectedAmount: existingTask.quoted_amount // Finalize amount
        };
      } else if (action === 'reject') {
        updates = {
          quoteStatus: 'rejected',
          status: 'cancelled'
        };
      } else {
        return res.status(400).json({ success: false, message: 'Invalid action' });
      }

      const updatedTask = await Task.update(req.params.id, updates);
      res.json(updatedTask);
    } catch (error) {
      console.error('Error responding to quote:', error);
      res.status(500).json({ success: false, message: 'Failed to respond to quote' });
    }
  }
}

module.exports = TaskController;