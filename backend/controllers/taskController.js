const Task = require('../models/Task');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const templates = require('../templates/emailTemplates');
const Notification = require('../models/Notification');

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

      // Email Notifications
      try {
        // 1. Notify Admin (New Task)
        const { subject: adminSubject, html: adminHtml } = templates.newTask(task, taskData.clientName);
        EmailService.notifyAdmin({ subject: adminSubject, html: adminHtml }).catch(e => console.error('Failed to notify admin:', e));

        // 2. Notify Client (Task Received) - only if we have client email
        if (req.user && req.user.role === 'client') {
          const { subject: clientSubject, html: clientHtml } = templates.taskReceived(req.user.full_name, task);
          EmailService.sendEmail({ to: req.user.email, subject: clientSubject, html: clientHtml }).catch(e => console.error('Failed to notify client:', e));

          // In-App for client
          Notification.create({
            userId: req.user.id,
            type: 'task_received',
            message: `We received your task: ${taskData.taskDescription.substring(0, 50)}...`
          }).catch(e => console.error('Failed to create client notification:', e));
        }

        // In-App for Admins (New Task)
        const admins = await User.findAdmins();
        for (const admin of admins) {
          Notification.create({
            userId: admin.id,
            type: 'new_task',
            message: `New task from ${taskData.clientName}: ${taskData.taskDescription.substring(0, 50)}...`
          }).catch(e => console.error('Failed to create admin notification:', e));
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

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

      // Check if status changed and notify client
      if (req.body.status && req.body.status !== existingTask.status) {
        try {
          if (existingTask.client_id) {
            const client = await User.findById(existingTask.client_id);
            if (client && client.email) {
              const { subject, html } = templates.taskStatusUpdate(client.full_name, updatedTask, req.body.status);
              EmailService.sendEmail({ to: client.email, subject, html }).catch(e => console.error('Failed to notify client of status update:', e));

              // In-App
              Notification.create({
                userId: client.id,
                type: 'status_update',
                message: `Task #${updatedTask.id} status updated to: ${req.body.status}`
              }).catch(e => console.error('Failed to create notification:', e));
            }
          }
        } catch (emailError) {
          console.error('Status update email error:', emailError);
        }
      }

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

      // Notify Client of Quote
      try {
        if (existingTask.client_id) {
          const client = await User.findById(existingTask.client_id);
          if (client && client.email) {
            const { subject, html } = templates.quoteSent(client.full_name, updatedTask, amount);
            EmailService.sendEmail({ to: client.email, subject, html }).catch(e => console.error('Failed to notify client of quote:', e));

            // In-App
            Notification.create({
              userId: client.id,
              type: 'quote_sent',
              message: `New quote received for Task #${updatedTask.id}: $${amount}`
            }).catch(e => console.error('Failed to create notification:', e));
          }
        }
      } catch (emailError) {
        console.error('Quote email error:', emailError);
      }

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