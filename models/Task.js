import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: ['daily', 'weekly', 'biweekly', 'semi-monthly', 'monthly', 'quarterly', 'annually', 'once'],
    default: 'once'
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  completed: {
    type: Boolean,
    default: false
  },
  dateCompleted: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: [true, 'Assigned to is required']
  },
  notes: {
    type: String
  }
}, { timestamps: true });


// Update completedDate when completed is set to true
TaskSchema.post('findOneAndUpdate', async function (doc, next) {
  if (doc.completed && !doc.dateCompleted) {
    doc.dateCompleted = new Date();
    await doc.save();
  } else {
    doc.completedDate = null;
  }
  next();
})

export default mongoose.model('Task', TaskSchema);