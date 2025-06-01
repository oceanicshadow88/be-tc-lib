import mongoose, { Types } from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    projectLead: {
      ref: 'users',
      type: Types.ObjectId,
      required: true,
    },
    roles: [
      {
        type: Types.ObjectId,
        ref: 'roles',
      },
    ],
    owner: {
      ref: 'users',
      type: Types.ObjectId,
      required: true,
    },
    iconUrl: { type: String, required: false },
    details: { type: 'string', required: false },
    shortcut: [{ name: { type: String }, shortcutLink: { type: String } }],
    isDelete: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    websiteUrl: {
      type: String,
      trim: true,
    },
    tenant: {
      require: true,
      type: String,
    },
    defaultRetroBoard: {
      ref: 'retroBoards',
      type: Types.ObjectId,
    },
    ticketCounter: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const getModel = () => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('Database connection not established');
  }
  return mongoose.connection.model('projects', projectSchema);
};

export { getModel };
