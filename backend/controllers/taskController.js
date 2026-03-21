const Task = require('../models/Task');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const templates = require('../templates/emailTemplates');
const Notification = require('../models/Notification');
const { invalidateCache } = require('../middleware/cache');
const {
  roundMoney,
  syncTaskDueTracking
} = require('../services/taskPaymentStateService');

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
      const {
        clientId,
        guestClientId,
        guestClientName,
        taskName,
        taskDescription,
        requiresDeposit,
        ...otherFields
      } = req.body;

      if (req.user && req.user.role !== 'admin') {
        otherFields.isPaid = false;
        otherFields.is_paid = false;
        otherFields.expectedAmount = 0;
        otherFields.expected_amount = 0;
        otherFields.quotedAmount = 0;
        otherFields.quoted_amount = 0;
        otherFields.quoteStatus = 'pending_quote';
        otherFields.quote_status = 'pending_quote';
        otherFields.status = 'not_started';
      }

      let finalClientId = clientId || null;
      let finalGuestClientId = guestClientId || null;
      let finalClientName = req.body.clientName;

      if (req.user && req.user.role === 'client') {
        finalClientId = req.user.id;
        finalClientName = req.user.full_name;
      } else if (req.user && req.user.role === 'admin') {
        const hasRegistered = !!finalClientId;
        const hasGuest = !!(finalGuestClientId || guestClientName);

        if (hasRegistered && hasGuest) {
          return res.status(400).json({
            success: false,
            message: 'Cannot specify both registered and guest client'
          });
        }

        if (!hasRegistered && !hasGuest && !req.body.clientName) {
          return res.status(400).json({
            success: false,
            message: 'Must specify a client or valid client name'
          });
        }

        if (guestClientName && !finalGuestClientId) {
          const GuestClient = require('../models/GuestClient');
          const existingGuest = await GuestClient.findByName(guestClientName);

          if (existingGuest && existingGuest.length > 0) {
            finalGuestClientId = existingGuest[0].id;
          } else {
            const newGuest = await GuestClient.create({ name: guestClientName });
            finalGuestClientId = newGuest.id;
          }
          finalClientName = guestClientName;
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create tasks with this role'
        });
      }

      const isAdminOrigin = req.user.role === 'admin';
      const taskOrigin = isAdminOrigin ? 'admin' : 'client';
      const numericAmount = roundMoney(otherFields.expectedAmount || otherFields.quotedAmount || 0);
      const directPricingRequiresDeposit = isAdminOrigin && numericAmount > 0 && Boolean(requiresDeposit);

      let quoteStatus = 'pending_quote';
      let expectedAmount = 0;
      let quotedAmount = 0;
      let status = otherFields.status || 'not_started';

      if (isAdminOrigin) {
        quoteStatus = 'approved';
        expectedAmount = numericAmount;
        quotedAmount = numericAmount;

        if (directPricingRequiresDeposit && !otherFields.isPaid && !otherFields.is_paid && !['completed', 'cancelled'].includes(status)) {
          status = 'pending_deposit';
        }
      }

      let task = await Task.create({
        ...otherFields,
        expectedAmount,
        quotedAmount,
        quoteStatus,
        requiresDeposit: directPricingRequiresDeposit ? 1 : 0,
        depositAmount: directPricingRequiresDeposit ? roundMoney(numericAmount / 2) : 0,
        taskName,
        taskDescription,
        clientId: finalClientId,
        guestClientId: finalGuestClientId,
        clientName: finalClientName,
        status,
        taskOrigin,
        createdByUserId: req.user.id,
        completedAt: status === 'completed' ? new Date() : null,
        paidAt: (otherFields.isPaid || otherFields.is_paid) ? new Date() : null
      });

      task = await syncTaskDueTracking(null, task.id);

      invalidateCache('/analytics');

      try {
        if (req.user.role === 'client') {
          const { subject: adminSubject, html: adminHtml } = templates.newTask(task, finalClientName);
          EmailService.notifyAdmin({ subject: adminSubject, html: adminHtml }).catch((e) => console.error('Failed to notify admin:', e));
        }

        if (finalClientId) {
          const clientUser = await User.findById(finalClientId);
          if (clientUser && clientUser.email) {
            if (req.user.role === 'admin') {
              const { subject: clientSubject, html: clientHtml } = templates.taskAssigned(clientUser.full_name, task);
              EmailService.sendEmail({ to: clientUser.email, subject: clientSubject, html: clientHtml }).catch((e) => console.error('Failed to notify client of assigned task:', e));

              Notification.create({
                recipientId: finalClientId,
                recipientType: 'mentor',
                type: 'task_assigned',
                message: `A new task has been added to your account: ${task.task_name || task.task_description?.substring(0, 50) + '...'}`
              }).catch((e) => console.error('Failed to create client notification:', e));
            } else {
              const { subject: clientSubject, html: clientHtml } = templates.taskReceived(finalClientName, task);
              EmailService.sendEmail({ to: clientUser.email, subject: clientSubject, html: clientHtml }).catch((e) => console.error('Failed to notify client:', e));

              Notification.create({
                recipientId: finalClientId,
                recipientType: 'mentor',
                type: 'task_received',
                message: `We received your task: ${taskDescription.substring(0, 50)}...`
              }).catch((e) => console.error('Failed to create client notification:', e));
            }
          }
        }

        if (req.user.role === 'client') {
          const admins = await User.findAdmins();
          for (const admin of admins) {
            Notification.create({
              recipientId: admin.id,
              recipientType: 'admin',
              type: 'new_task',
              message: `New task from ${finalClientName}: ${taskDescription.substring(0, 50)}...`
            }).catch((e) => console.error('Failed to create admin notification:', e));
          }
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

      if (req.user.role !== 'admin' && existingTask.client_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this task.'
        });
      }

      if (req.user.role !== 'admin') {
        const sensitiveFields = [
          'isPaid', 'is_paid',
          'expectedAmount', 'expected_amount',
          'quotedAmount', 'quoted_amount',
          'quoteStatus', 'quote_status',
          'status',
          'clientId', 'client_id',
          'guestClientId', 'guest_client_id',
          'requiresDeposit', 'requires_deposit',
          'taskOrigin', 'task_origin',
          'createdByUserId', 'created_by_user_id',
          'paymentDueStartedAt', 'payment_due_started_at',
          'lastPaymentReminderSentAt', 'last_payment_reminder_sent_at'
        ];
        sensitiveFields.forEach((field) => delete req.body[field]);
      }

      const usesDirectPricing = existingTask.task_origin === 'admin'
        || Boolean(existingTask.guest_client_id)
        || (existingTask.task_origin == null && !['pending_quote', 'quote_sent'].includes(existingTask.quote_status));

      if (req.user.role === 'admin' && usesDirectPricing) {
        const amount = roundMoney(
          req.body.expectedAmount !== undefined
            ? req.body.expectedAmount
            : req.body.quotedAmount !== undefined
              ? req.body.quotedAmount
              : existingTask.quoted_amount || existingTask.expected_amount || 0
        );
        const directRequiresDeposit = (req.body.requiresDeposit !== undefined
          ? (req.body.requiresDeposit ? 1 : 0)
          : Number(existingTask.requires_deposit) === 1 ? 1 : 0) && amount > 0 ? 1 : 0;
        const selectedStatus = req.body.status || existingTask.status || 'not_started';
        const isMarkedPaid = req.body.isPaid !== undefined
          ? req.body.isPaid
          : req.body.is_paid !== undefined
            ? req.body.is_paid
            : Number(existingTask.is_paid) === 1;

        req.body.quoteStatus = 'approved';
        req.body.expectedAmount = amount;
        req.body.quotedAmount = amount;
        req.body.requiresDeposit = directRequiresDeposit;
        req.body.depositAmount = directRequiresDeposit ? roundMoney(amount / 2) : 0;

        if (directRequiresDeposit && !existingTask.deposit_paid && !isMarkedPaid && !['completed', 'cancelled'].includes(selectedStatus)) {
          req.body.status = 'pending_deposit';
        } else if (!directRequiresDeposit && existingTask.status === 'pending_deposit' && req.body.status === undefined) {
          req.body.status = 'not_started';
        }
      }

      if (req.body.status === 'completed' && existingTask.status !== 'completed') {
        req.body.completedAt = new Date();
      } else if (req.body.status && req.body.status !== 'completed' && existingTask.status === 'completed') {
        req.body.completedAt = null;
      }

      const isPaidInput = req.body.isPaid !== undefined ? req.body.isPaid : req.body.is_paid;
      if (isPaidInput !== undefined) {
        if (isPaidInput && !existingTask.is_paid) {
          req.body.paidAt = new Date();
        } else if (!isPaidInput && existingTask.is_paid) {
          req.body.paidAt = null;
        }
      }

      let updatedTask = await Task.update(req.params.id, req.body);
      updatedTask = await syncTaskDueTracking(existingTask, updatedTask.id);

      invalidateCache('/analytics');

      if (req.body.status && req.body.status !== existingTask.status) {
        try {
          if (existingTask.client_id) {
            const client = await User.findById(existingTask.client_id);
            if (client && client.email) {
              const { subject, html } = templates.taskStatusUpdate(client.full_name, updatedTask, req.body.status);
              EmailService.sendEmail({ to: client.email, subject, html }).catch((e) => console.error('Failed to notify client of status update:', e));

              Notification.create({
                recipientId: client.id,
                recipientType: 'mentor',
                type: 'status_update',
                message: `Task #${updatedTask.id} status updated to: ${req.body.status}`
              }).catch((e) => console.error('Failed to create notification:', e));
            }
          }
        } catch (emailError) {
          console.error('Task status email error:', emailError);
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

      if (req.user.role !== 'admin' && existingTask.client_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this task.'
        });
      }

      await Task.delete(req.params.id);
      invalidateCache('/analytics');

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

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only administrators can update payment status.'
        });
      }

      let updatedTask = await Task.togglePayment(req.params.id);
      updatedTask = await syncTaskDueTracking(existingTask, updatedTask.id);

      invalidateCache('/analytics');
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
      const { amount, requiresDeposit } = req.body;
      const existingTask = await Task.findById(req.params.id);

      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      if (!existingTask.client_id || existingTask.guest_client_id || existingTask.task_origin === 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Quotes can only be sent for client-created registered-client tasks.'
        });
      }

      const numericAmount = roundMoney(amount);
      const status = 'review';
      const quoteStatus = 'quote_sent';

      let updatedTask = await Task.update(req.params.id, {
        quotedAmount: numericAmount,
        quoteStatus,
        status,
        requiresDeposit: requiresDeposit ? 1 : 0,
        depositAmount: requiresDeposit ? roundMoney(numericAmount / 2) : 0
      });

      updatedTask = await syncTaskDueTracking(existingTask, updatedTask.id);

      invalidateCache('/analytics');

      try {
        const client = await User.findById(existingTask.client_id);
        if (client && client.email) {
          const { subject, html } = templates.quoteSent(client.full_name, updatedTask, numericAmount);
          EmailService.sendEmail({ to: client.email, subject, html }).catch((e) => console.error('Failed to notify client of quote:', e));

          Notification.create({
            recipientId: client.id,
            recipientType: 'mentor',
            type: 'quote_sent',
            message: `New quote received for Task #${updatedTask.id}: $${numericAmount}`
          }).catch((e) => console.error('Failed to create notification:', e));
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
      const { action } = req.body;
      const existingTask = await Task.findById(req.params.id);

      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      if (req.user.role !== 'admin' && existingTask.client_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this task.'
        });
      }

      if (!existingTask.client_id || existingTask.guest_client_id || existingTask.task_origin === 'admin' || existingTask.quote_status !== 'quote_sent') {
        return res.status(400).json({
          success: false,
          message: 'This task does not require quote approval.'
        });
      }

      let updates = {};
      if (action === 'approve') {
        const isDepositRequired = Number(existingTask.requires_deposit) === 1;
        updates = {
          quoteStatus: 'approved',
          status: isDepositRequired ? 'pending_deposit' : 'in_progress',
          expectedAmount: existingTask.quoted_amount
        };
      } else if (action === 'reject') {
        updates = {
          quoteStatus: 'rejected',
          status: 'cancelled'
        };
      } else {
        return res.status(400).json({ success: false, message: 'Invalid action' });
      }

      let updatedTask = await Task.update(req.params.id, updates);
      updatedTask = await syncTaskDueTracking(existingTask, updatedTask.id);

      invalidateCache('/analytics');
      res.json(updatedTask);
    } catch (error) {
      console.error('Error responding to quote:', error);
      res.status(500).json({ success: false, message: 'Failed to respond to quote' });
    }
  }
}

module.exports = TaskController;
