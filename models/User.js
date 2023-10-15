import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"]
    },
    email: {
      type: String,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g, "Please add a valid email"],
      required: [true, "Please add an email"],
      unique: true
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
      minlength: [8, "Password has to be at least 8 characters long"],
      select: false,
    },
    dir: {
      type: String,
      required: [true, "Please add a directory name"],
      unique: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  {
    timestamps: true
  }
);

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt(10);

  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Validate user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  const isMatch = await bcrypt.compare(enteredPassword, this.password);
  return isMatch;
};

// Static method to get token from model
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export default mongoose.model("User", UserSchema);