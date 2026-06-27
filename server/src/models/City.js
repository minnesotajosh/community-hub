import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('City', citySchema);
