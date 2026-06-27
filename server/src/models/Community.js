import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    iac: { type: String, default: 'IAC Central' },
  },
  { timestamps: true }
);

export default mongoose.model('Community', communitySchema);
