import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['top_admin', 'iac_board', 'hub_admin', 'hub_moderator', 'member'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'member' },
    bio: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
    banned: { type: Boolean, default: false },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    banReason: { type: String, default: '' },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.password = await bcrypt.hash(plain, 10);
};
userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
